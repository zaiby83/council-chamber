/**
 * Zoom Meeting Source
 *
 * Tracks participants and active speaker via Zoom Webhooks.
 * Optionally mutes participants via the Zoom REST API.
 *
 * Required env vars:
 *   ZOOM_WEBHOOK_SECRET_TOKEN   — from your Zoom App → Features → Webhooks
 *   ZOOM_ACCOUNT_ID             — Server-to-Server OAuth app
 *   ZOOM_CLIENT_ID
 *   ZOOM_CLIENT_SECRET
 *   ZOOM_MEETING_ID             — optional: only handle events for this meeting
 *
 * Subscribed webhook events (Zoom App → Features → Webhooks):
 *   meeting.participant_joined
 *   meeting.participant_left
 *   meeting.active_speaker
 *   endpoint.url_validation     — required for Zoom to verify your endpoint
 *
 * Audio routing:
 *   Route Zoom's audio output to a virtual audio device (Dante or BlackHole),
 *   then set that as the default input. Azure Speech picks it up automatically.
 */

const crypto = require('crypto');
const AudioSource = require('./base');

const ZOOM_API = 'https://api.zoom.us/v2';

class ZoomSource extends AudioSource {
  constructor(app) {
    super();
    this.sourceType = 'zoom';
    this.supportsMembers = false; // names come from Zoom participant display names
    this.app = app;
    this.participants = {};      // userId → channel state
    this.channelByUser = {};     // userId → channel number
    this.nextChannel = 1;
    this.activeSpeakerUserId = null;
    this.currentMeetingId = process.env.ZOOM_MEETING_ID || null;
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  connect() {
    this.app.post('/webhooks/zoom', (req, res) => this._handleWebhook(req, res));
    this.connected = true;
    this.emit('connected');
    console.log('[Zoom] Webhook listener ready at POST /webhooks/zoom');
    if (this.currentMeetingId) {
      console.log(`[Zoom] Filtering events for meeting ${this.currentMeetingId}`);
    }
  }

  disconnect() {
    this.connected = false;
    this.participants = {};
    this.channelByUser = {};
    this.nextChannel = 1;
  }

  // ── Webhook handler ──────────────────────────────────────────────────────────

  _handleWebhook(req, res) {
    const event = req.body;

    // Zoom URL validation challenge (required when first saving webhook URL)
    if (event.event === 'endpoint.url_validation') {
      const hash = crypto
        .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '')
        .update(event.payload.plainToken)
        .digest('hex');
      return res.json({ plainToken: event.payload.plainToken, encryptedToken: hash });
    }

    // Validate signature
    if (!this._validateSignature(req)) {
      console.warn('[Zoom] Webhook signature invalid');
      return res.status(401).send('Unauthorized');
    }

    res.status(200).send('OK');

    // Filter to a specific meeting if configured
    const meetingId = event.payload?.object?.id?.toString();
    if (this.currentMeetingId && meetingId !== this.currentMeetingId.toString()) return;

    switch (event.event) {
      case 'meeting.participant_joined':
        this._onParticipantJoined(event.payload.object.participant);
        break;
      case 'meeting.participant_left':
        this._onParticipantLeft(event.payload.object.participant);
        break;
      case 'meeting.active_speaker':
        this._onActiveSpeaker(event.payload.object.participants);
        break;
    }
  }

  _validateSignature(req) {
    const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
    if (!secret) return true; // skip validation if not configured (dev)
    const ts = req.headers['x-zm-request-timestamp'];
    const sig = req.headers['x-zm-signature'];
    if (!ts || !sig) return false;
    const message = `v0:${ts}:${JSON.stringify(req.body)}`;
    const expected = 'v0=' + crypto.createHmac('sha256', secret).update(message).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  }

  // ── Participant lifecycle ────────────────────────────────────────────────────

  _onParticipantJoined(participant) {
    const userId = participant.user_id || participant.id;
    if (this.channelByUser[userId]) return; // already tracked

    const ch = this.nextChannel++;
    this.channelByUser[userId] = ch;
    this.participants[userId] = {
      channel: ch,
      name: participant.user_name || `Participant ${ch}`,
      title: '',
      muted: participant.audio_status?.muted ?? true,
      gateOpen: false,
      level: 0,
      active: false,
      _userId: userId,
      _meetingId: this.currentMeetingId,
    };
    console.log(`[Zoom] Joined: ${this.participants[userId].name} → CH ${ch}`);
    this.emit('channelUpdate', this.participants[userId]);
  }

  _onParticipantLeft(participant) {
    const userId = participant.user_id || participant.id;
    const ch = this.channelByUser[userId];
    if (!ch) return;
    console.log(`[Zoom] Left: ${this.participants[userId]?.name}`);
    delete this.participants[userId];
    delete this.channelByUser[userId];
    this.emit('channelUpdate', { channel: ch, active: false, removed: true });
  }

  _onActiveSpeaker(speakers) {
    // Zoom sends an array of currently active speakers
    const activeIds = new Set((speakers || []).map((s) => s.user_id || s.id));

    for (const [userId, state] of Object.entries(this.participants)) {
      const wasActive = state.active;
      const nowActive = activeIds.has(userId);
      state.gateOpen = nowActive;
      state.active = nowActive && !state.muted;
      state.level = nowActive ? 80 : 0;
      if (wasActive !== state.active) {
        this.emit('channelUpdate', state);
      }
    }
  }

  // ── Channel interface ────────────────────────────────────────────────────────

  getAllChannels() {
    return Object.values(this.participants);
  }

  getChannelState(ch) {
    return Object.values(this.participants).find((p) => p.channel === ch) || null;
  }

  // Mute/unmute via Zoom REST API
  async muteChannel(ch, muted) {
    const state = this.getChannelState(ch);
    if (!state) return;

    // Optimistic local update
    state.muted = muted;
    if (muted) { state.active = false; state.gateOpen = false; }
    this.emit('channelUpdate', state);

    try {
      const token = await this._getAccessToken();
      const meetingId = this.currentMeetingId || state._meetingId;
      if (!meetingId || !token) return;

      await fetch(`${ZOOM_API}/meetings/${meetingId}/participants`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ id: state._userId, mute: muted }],
        }),
      });
    } catch (err) {
      console.error('[Zoom] Mute API error:', err.message);
    }
  }

  // ── Server-to-Server OAuth ───────────────────────────────────────────────────

  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry) return this._accessToken;

    const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      console.warn('[Zoom] OAuth credentials not set — muting disabled');
      return null;
    }

    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const res = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
      { method: 'POST', headers: { Authorization: `Basic ${credentials}` } }
    );
    const data = await res.json();
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._accessToken;
  }

  // Active speaker: whoever has gateOpen, or last active (base class handles multi-speaker)
  getSpeaker() {
    const active = this.getActiveChannels();
    if (active.length === 1) return active[0];
    if (active.length > 1) return active[0]; // Zoom already picks one active speaker
    return null;
  }
}

module.exports = ZoomSource;
