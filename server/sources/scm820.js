/**
 * Shure SCM820 IntelliMix Automatic Mixer — TCP Control
 *
 * Protocol: text-based TCP on port 2202
 *   < GET {ch} AUDIO_GATE >       → < REP {ch} AUDIO_GATE OPEN|CLOSED >
 *   < GET {ch} AUDIO_MUTE >       → < REP {ch} AUDIO_MUTE ON|OFF >
 *   < GET {ch} AUDIO_IN_LEVEL >   → < REP {ch} AUDIO_IN_LEVEL 0-100 >
 *   < SET {ch} AUDIO_MUTE ON|OFF >
 *   < SET {ch} CHAN_NAME {name} >
 */

const net = require('net');
const AudioSource = require('./base');
const config = require('../config');

class SCM820Source extends AudioSource {
  constructor(members, { ip, port } = {}) {
    super();
    this.sourceType = 'scm820';
    this.supportsMembers = true;
    this.client = null;
    this.reconnectTimer = null;
    this.buffer = '';
    this.channelState = {};
    this.lastActiveAt = {};
    this._members = members;
    this._ip = ip || config.shure.ip;
    this._port = port || config.shure.port;

    for (let ch = 1; ch <= 8; ch++) {
      const m = members[ch] || {};
      this.channelState[ch] = {
        channel: ch,
        name: m.name || `Channel ${ch}`,
        title: m.title || '',
        muted: false,
        gateOpen: false,
        level: 0,
        active: false,
      };
    }
  }

  connect() {
    if (this.connected) return;
    console.log(`[SCM820] Connecting to ${this._ip}:${this._port}...`);
    this.client = new net.Socket();

    this.client.connect(this._port, this._ip, () => {
      this.connected = true;
      console.log('[SCM820] Connected');
      this.emit('connected');
      this._syncNames();
      this._startPolling();
    });

    this.client.on('data', (data) => {
      this.buffer += data.toString();
      this._processBuffer();
    });

    this.client.on('close', () => {
      this.connected = false;
      console.log('[SCM820] Disconnected. Reconnecting in 5s…');
      this.emit('disconnected');
      this._stopPolling();
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.client.on('error', (err) => {
      console.error('[SCM820] Error:', err.message);
      this.emit('error', err);
    });
  }

  disconnect() {
    this._stopPolling();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.client) { this.client.destroy(); this.client = null; }
    this.connected = false;
  }

  _send(command) {
    if (!this.connected || !this.client) return;
    this.client.write(`< ${command} >\r\n`);
  }

  _processBuffer() {
    const regex = /< REP (\d+) (\w+) (.+?) >/g;
    let match;
    while ((match = regex.exec(this.buffer)) !== null) {
      this._handleResponse(parseInt(match[1], 10), match[2], match[3].trim());
    }
    const lastClose = this.buffer.lastIndexOf('>');
    if (lastClose !== -1) this.buffer = this.buffer.slice(lastClose + 1);
  }

  _handleResponse(channel, command, value) {
    if (!this.channelState[channel]) return;
    const prev = { ...this.channelState[channel] };

    switch (command) {
      case 'CHAN_NAME':
        // Only use mixer name if we have no member mapping
        if (!this._members[channel]) this.channelState[channel].name = value;
        break;
      case 'AUDIO_MUTE':
        this.channelState[channel].muted = value === 'ON';
        break;
      case 'AUDIO_GATE': {
        const nowOpen = value === 'OPEN';
        const wasOpen = this.channelState[channel].gateOpen;
        this.channelState[channel].gateOpen = nowOpen;
        this.channelState[channel].active = nowOpen && !this.channelState[channel].muted;
        if (nowOpen && !wasOpen) this.lastActiveAt[channel] = new Date();
        break;
      }
      case 'AUDIO_IN_LEVEL':
        this.channelState[channel].level = parseInt(value, 10) || 0;
        break;
    }

    if (JSON.stringify(prev) !== JSON.stringify(this.channelState[channel])) {
      this.emit('channelUpdate', this.channelState[channel]);
    }
  }

  _syncNames() {
    for (const [ch, m] of Object.entries(this._members)) {
      this._send(`SET ${ch} CHAN_NAME ${m.name.substring(0, 31)}`);
    }
  }

  _startPolling() {
    this.pollInterval = setInterval(() => {
      for (let ch = 1; ch <= 8; ch++) {
        this._send(`GET ${ch} AUDIO_GATE`);
        this._send(`GET ${ch} AUDIO_MUTE`);
        this._send(`GET ${ch} AUDIO_IN_LEVEL`);
      }
    }, 200);
  }

  _stopPolling() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }

  getAllChannels() { return Object.values(this.channelState); }
  getChannelState(ch) { return this.channelState[ch] || null; }

  muteChannel(ch, muted) {
    this._send(`SET ${ch} AUDIO_MUTE ${muted ? 'ON' : 'OFF'}`);
  }

  updateMember(ch, name, title) {
    if (!this.channelState[ch]) return;
    this.channelState[ch].name = name;
    this.channelState[ch].title = title || '';
    this._send(`SET ${ch} CHAN_NAME ${name.substring(0, 31)}`);
    this.emit('channelUpdate', this.channelState[ch]);
  }

  getSpeaker(windowMs = 4000) {
    const active = this.getActiveChannels();
    if (active.length === 1) return active[0];
    if (active.length > 1) {
      return active.reduce((best, ch) => (ch.level > best.level ? ch : best));
    }
    const cutoff = Date.now() - windowMs;
    let recent = null;
    for (const [ch, ts] of Object.entries(this.lastActiveAt)) {
      if (ts.getTime() >= cutoff) {
        if (!recent || ts > this.lastActiveAt[recent]) recent = ch;
      }
    }
    return recent ? this.channelState[recent] : null;
  }
}

module.exports = SCM820Source;
