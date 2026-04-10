const AudioSource = require('./base');

/**
 * Simulation source — no hardware required.
 * Rotates the active channel every ~3 seconds across all 8 channels.
 * Useful for development and demos.
 */
class SimulationSource extends AudioSource {
  constructor(members) {
    super();
    this.sourceType = 'simulation';
    this.supportsMembers = true;
    this.channelState = {};
    this.simulationInterval = null;
    this.lastActiveAt = {};

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
    console.log('[Simulation] Running in SIMULATION mode');
    this.connected = true;
    this.emit('connected');

    let tick = 0;
    this.simulationInterval = setInterval(() => {
      tick++;
      const activeCh = (Math.floor(tick / 15) % 8) + 1;
      for (let ch = 1; ch <= 8; ch++) {
        const wasActive = this.channelState[ch].active;
        const nowActive = ch === activeCh;
        this.channelState[ch].gateOpen = nowActive;
        this.channelState[ch].active = nowActive;
        this.channelState[ch].level = nowActive ? 65 + Math.floor(Math.random() * 20) : 0;
        if (!wasActive && nowActive) {
          this.lastActiveAt[ch] = new Date();
        }
        if (wasActive !== nowActive) {
          this.emit('channelUpdate', this.channelState[ch]);
        }
      }
    }, 200);
  }

  disconnect() {
    if (this.simulationInterval) clearInterval(this.simulationInterval);
    this.connected = false;
  }

  getAllChannels() {
    return Object.values(this.channelState);
  }

  getChannelState(ch) {
    return this.channelState[ch] || null;
  }

  muteChannel(ch, muted) {
    if (!this.channelState[ch]) return;
    this.channelState[ch].muted = muted;
    if (muted) this.channelState[ch].active = false;
    this.emit('channelUpdate', this.channelState[ch]);
  }

  updateMember(ch, name, title) {
    if (!this.channelState[ch]) return;
    this.channelState[ch].name = name;
    this.channelState[ch].title = title || '';
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

module.exports = SimulationSource;
