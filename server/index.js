require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { createSource } = require('./sources');
const transcriber = require('./transcription/azure-speech');

// ── Member store (persisted to members.json) ────────────────────────────────
const MEMBERS_FILE = path.join(__dirname, 'members.json');

function loadMembers() {
  try {
    return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8'));
  } catch {
    const defaults = {};
    for (const [ch, m] of Object.entries(config.councilMembers)) {
      defaults[ch] = { name: m.name, title: m.title };
    }
    return defaults;
  }
}

function saveMembers(members) {
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2));
}

let members = loadMembers();

// ── Express + WebSocket ──────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// ── Audio source ─────────────────────────────────────────────────────────────
// Pass app so Zoom can register its webhook route before the server starts
let source = createSource(config.audioSource, { members, app });

console.log(`[Source] Using: ${config.audioSource}`);

// ── REST API ─────────────────────────────────────────────────────────────────

app.get('/api/meeting', (_, res) => {
  res.json({
    cityName: config.meeting.cityName,
    chamberName: config.meeting.chamberName,
    sourceType: source.sourceType,
    supportsMembers: source.supportsMembers,
  });
});

app.get('/api/channels', (_, res) => res.json(source.getAllChannels()));

app.get('/api/channels/:ch', (req, res) => {
  const state = source.getChannelState(parseInt(req.params.ch, 10));
  if (!state) return res.status(404).json({ error: 'Channel not found' });
  res.json(state);
});

app.post('/api/channels/:ch/mute', (req, res) => {
  const ch = parseInt(req.params.ch, 10);
  const { muted } = req.body;
  source.muteChannel(ch, muted);
  res.json({ ok: true, channel: ch, muted });
});

app.post('/api/transcription/start', (_, res) => {
  transcriber.start(() => source.getSpeaker());
  res.json({ ok: true });
});

app.post('/api/transcription/stop', (_, res) => {
  transcriber.stop();
  res.json({ ok: true });
});

// Current source status
app.get('/api/status', (_, res) => {
  res.json({
    sourceType: source.sourceType,
    connected: source.connected,
    supportsMembers: source.supportsMembers,
  });
});

// Switch audio source at runtime
app.post('/api/configure', (req, res) => {
  try {
    const { source: sourceType, ip, port, meetingId } = req.body;
    if (!['scm820', 'zoom', 'simulation'].includes(sourceType)) {
      return res.status(400).json({ error: 'Unknown source type' });
    }

    source.disconnect();
    source.removeAllListeners();

    source = createSource(sourceType, { members, app, ip, port, meetingId });
    wireSource(source);
    source.connect();

    // SCM820 fallback to simulation after 5s if unreachable
    if (sourceType === 'scm820') {
      setTimeout(() => {
        if (!source.connected) {
          console.log('[SCM820] Unreachable — falling back to simulation');
          source.disconnect();
          source.removeAllListeners();
          source = createSource('simulation', { members });
          wireSource(source);
          source.connect();
        }
      }, 5000);
    }

    res.json({ ok: true, sourceType, supportsMembers: source.supportsMembers });
  } catch (err) {
    console.error('[configure] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Member name editing (only meaningful for sources that support it)
app.get('/api/members', (_, res) => {
  if (!source.supportsMembers) return res.json({});
  res.json(members);
});

app.put('/api/members', (req, res) => {
  if (!source.supportsMembers) {
    return res.status(400).json({ error: 'Current source does not support member editing' });
  }
  const updated = req.body;
  const channels = source.getAllChannels();
  for (const ch of channels) {
    const m = updated[ch.channel];
    if (!m || typeof m.name !== 'string' || !m.name.trim()) {
      return res.status(400).json({ error: `Channel ${ch.channel} requires a name` });
    }
  }
  members = updated;
  saveMembers(members);
  for (const [ch, m] of Object.entries(members)) {
    source.updateMember(parseInt(ch, 10), m.name, m.title);
  }
  broadcast('members:updated', members);
  res.json({ ok: true, members });
});

// ── Source event wiring (extracted so we can rewire after configure) ─────────
function wireSource(src) {
  src.on('connected', () => broadcast('mixer:connected', { sourceType: src.sourceType }));
  src.on('disconnected', () => broadcast('mixer:disconnected', {}));
  src.on('channelUpdate', (ch) => broadcast('channel:update', ch));
}
wireSource(source);

// ── Transcription events → WebSocket ─────────────────────────────────────────
transcriber.on('transcript', (entry) => broadcast('transcript:final', entry));
transcriber.on('interim', (entry) => broadcast('transcript:interim', entry));
transcriber.on('started', () => broadcast('transcription:started', {}));
transcriber.on('stopped', () => broadcast('transcription:stopped', {}));

// ── WebSocket connection ──────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      channels: source.getAllChannels(),
      transcriptionRunning: transcriber.isRunning(),
      sourceType: source.sourceType,
      supportsMembers: source.supportsMembers,
      meeting: {
        cityName: config.meeting.cityName,
        chamberName: config.meeting.chamberName,
      },
    },
    ts: new Date().toISOString(),
  }));

  ws.on('message', (msg) => {
    try {
      const { type, payload } = JSON.parse(msg);
      if (type === 'mute') source.muteChannel(payload.channel, payload.muted);
    } catch (e) {
      console.error('[WS] Bad message:', e.message);
    }
  });

  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(config.server.port, () => {
  console.log(`\n🏛  ${config.meeting.cityName} — ${config.meeting.chamberName}`);
  console.log(`   Server:    http://localhost:${config.server.port}`);
  console.log(`   WebSocket: ws://localhost:${config.server.port}`);
  console.log(`   Source:    ${config.audioSource}\n`);

  source.connect();

  if (config.audioSource === 'scm820') {
    setTimeout(() => {
      if (!source.connected) {
        console.log('[SCM820] Unreachable — falling back to simulation');
        source.disconnect();
        source.removeAllListeners();
        source = createSource('simulation', { members });
        wireSource(source);
        source.connect();
      }
    }, 5000);
  }
});
