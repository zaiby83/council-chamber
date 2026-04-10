const { EventEmitter } = require('events');

/**
 * Base class for all audio sources.
 *
 * Subclasses must implement:
 *   connect(), disconnect(), getAllChannels(), getChannelState(ch), muteChannel(ch, muted)
 *
 * Subclasses may override:
 *   getSpeaker(windowMs), updateMember(ch, name, title)
 *
 * Emits:
 *   'connected'
 *   'disconnected'
 *   'channelUpdate'  (channelState)
 *   'error'          (Error)
 */
class AudioSource extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.supportsMembers = false;
    this.sourceType = 'unknown';
    // Default error handler — prevents unhandled 'error' event crashes
    this.on('error', (err) => {
      console.error(`[${this.sourceType}] Error:`, err.message);
    });
  }

  connect() { throw new Error('connect() not implemented'); }
  disconnect() { throw new Error('disconnect() not implemented'); }
  getAllChannels() { throw new Error('getAllChannels() not implemented'); }
  getChannelState(ch) { throw new Error('getChannelState() not implemented'); }
  muteChannel(ch, muted) { throw new Error('muteChannel() not implemented'); }

  // Optional — sources that don't support editing can no-op
  updateMember(ch, name, title) {}

  getActiveChannels() {
    return this.getAllChannels().filter((c) => c.active);
  }

  // Best-guess speaker for transcription:
  // 1. Single active gate → that channel
  // 2. Multiple active → highest audio level
  // 3. None active → most recently active within windowMs
  getSpeaker(windowMs = 4000) {
    const active = this.getActiveChannels();
    if (active.length === 1) return active[0];
    if (active.length > 1) {
      return active.reduce((best, ch) => (ch.level > best.level ? ch : best));
    }
    return null;
  }
}

module.exports = AudioSource;
