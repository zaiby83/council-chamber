/**
 * Shure SCM820 IntelliMix Automatic Mixer - TCP Control Client
 *
 * The SCM820 uses a text-based TCP protocol on port 2202.
 * Commands follow the format: < ACTION CHANNEL COMMAND [VALUE] >
 *
 * Key commands used:
 *   < GET {ch} CHAN_NAME >       - get channel name
 *   < GET {ch} AUDIO_MUTE >      - get mute state (ON/OFF)
 *   < GET {ch} AUDIO_GATE >      - get gate state (OPEN/CLOSED)
 *   < GET {ch} AUDIO_IN_LEVEL >  - get input level (0-100)
 *   < SET {ch} CHAN_NAME {name} > - set channel name
 *   < SET {ch} AUDIO_MUTE ON >   - mute channel
 *   < SET {ch} AUDIO_MUTE OFF >  - unmute channel
 */

const net = require('net');
const { EventEmitter } = require('events');
const config = require('../config');

class SCM820Client extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.buffer = '';
    this.channelState = {};

    // Initialize channel state from config
    for (let ch = 1; ch <= 8; ch++) {
      const member = config.councilMembers[ch];
      this.channelState[ch] = {
        channel: ch,
        name: member ? member.name : `Channel ${ch}`,
        title: member ? member.title : '',
        muted: false,
        gateOpen: false,
        level: 0,
        active: false,
      };
    }
  }

  connect() {
    if (this.connected) return;

    console.log(`[SCM820] Connecting to ${config.shure.ip}:${config.shure.port}...`);
    this.client = new net.Socket();

    this.client.connect(config.shure.port, config.shure.ip, () => {
      this.connected = true;
      console.log('[SCM820] Connected');
      this.emit('connected');
      this._syncChannelNames();
      this._startPolling();
    });

    this.client.on('data', (data) => {
      this.buffer += data.toString();
      this._processBuffer();
    });

    this.client.on('close', () => {
      this.connected = false;
      console.log('[SCM820] Disconnected. Reconnecting in 5s...');
      this.emit('disconnected');
      this._stopPolling();
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.client.on('error', (err) => {
      console.error('[SCM820] Connection error:', err.message);
      this.emit('error', err);
    });
  }

  disconnect() {
    this._stopPolling();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.connected = false;
  }

  _send(command) {
    if (!this.connected || !this.client) return;
    this.client.write(`< ${command} >\r\n`);
  }

  _processBuffer() {
    // Responses come back as: < REP {channel} {command} {value} >
    const regex = /< REP (\d+) (\w+) (.+?) >/g;
    let match;
    while ((match = regex.exec(this.buffer)) !== null) {
      const [, ch, command, value] = match;
      this._handleResponse(parseInt(ch, 10), command, value.trim());
    }
    // Keep only unprocessed tail
    const lastClose = this.buffer.lastIndexOf('>');
    if (lastClose !== -1) {
      this.buffer = this.buffer.slice(lastClose + 1);
    }
  }

  _handleResponse(channel, command, value) {
    if (!this.channelState[channel]) return;
    const prev = { ...this.channelState[channel] };

    switch (command) {
      case 'CHAN_NAME':
        // Only override with mixer name if no council member mapped
        if (!config.councilMembers[channel]) {
          this.channelState[channel].name = value;
        }
        break;
      case 'AUDIO_MUTE':
        this.channelState[channel].muted = value === 'ON';
        break;
      case 'AUDIO_GATE':
        this.channelState[channel].gateOpen = value === 'OPEN';
        this.channelState[channel].active = value === 'OPEN' && !this.channelState[channel].muted;
        break;
      case 'AUDIO_IN_LEVEL':
        this.channelState[channel].level = parseInt(value, 10) || 0;
        break;
    }

    // Emit update if anything changed
    if (JSON.stringify(prev) !== JSON.stringify(this.channelState[channel])) {
      this.emit('channelUpdate', this.channelState[channel]);
    }
  }

  _syncChannelNames() {
    // Push council member names to the mixer
    for (const [ch, member] of Object.entries(config.councilMembers)) {
      // Shure name field max 31 chars
      const shortName = member.name.substring(0, 31);
      this._send(`SET ${ch} CHAN_NAME ${shortName}`);
    }
  }

  _startPolling() {
    // Poll all 8 channels every 200ms for gate/mute/level status
    this.pollInterval = setInterval(() => {
      for (let ch = 1; ch <= 8; ch++) {
        this._send(`GET ${ch} AUDIO_GATE`);
        this._send(`GET ${ch} AUDIO_MUTE`);
        this._send(`GET ${ch} AUDIO_IN_LEVEL`);
      }
    }, 200);
  }

  _stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  muteChannel(channel, mute) {
    this._send(`SET ${channel} AUDIO_MUTE ${mute ? 'ON' : 'OFF'}`);
  }

  getChannelState(channel) {
    return this.channelState[channel] || null;
  }

  getAllChannels() {
    return Object.values(this.channelState);
  }

  // Returns the currently active (gate open, unmuted) channel(s)
  getActiveChannels() {
    return Object.values(this.channelState).filter((ch) => ch.active);
  }

  // Simulate mode for development without physical mixer
  startSimulation() {
    console.log('[SCM820] Running in SIMULATION mode');
    this.connected = true;
    this.emit('connected');

    let tick = 0;
    this.simulationInterval = setInterval(() => {
      tick++;
      // Rotate active channel every ~3 seconds
      const activeCh = (Math.floor(tick / 15) % 8) + 1;
      for (let ch = 1; ch <= 8; ch++) {
        const wasActive = this.channelState[ch].active;
        this.channelState[ch].gateOpen = ch === activeCh;
        this.channelState[ch].active = ch === activeCh;
        this.channelState[ch].level = ch === activeCh ? 65 + Math.floor(Math.random() * 20) : 0;
        if (wasActive !== this.channelState[ch].active) {
          this.emit('channelUpdate', this.channelState[ch]);
        }
      }
    }, 200);
  }

  stopSimulation() {
    if (this.simulationInterval) clearInterval(this.simulationInterval);
  }
}

module.exports = new SCM820Client();
