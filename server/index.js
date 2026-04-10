require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const mixer = require('./shure/scm820');
const transcriber = require('./transcription/azure-speech');

// ── Member store (persisted to members.json) ────────────────────────────────
const MEMBERS_FILE = path.join(__dirname, 'members.json');

function loadMembers() {
  try {
    return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8'));
  } catch {
    // Fall back to config defaults
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

// Apply member names to mixer channel state
function applyMembers(members) {
  for (const [ch, m] of Object.entries(members)) {
    mixer.updateMember(parseInt(ch, 10), m.name, m.title);
  }
}

let members = loadMembers();
// Applied after mixer initialises (see Start section)

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ── WebSocket broadcast helper ──────────────────────────────────────────────
function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ── REST API ────────────────────────────────────────────────────────────────

// Meeting info
app.get('/api/meeting', (_, res) => {
  res.json({
    cityName: config.meeting.cityName,
    chamberName: config.meeting.chamberName,
    councilMembers: config.councilMembers,
  });
});

// All channel states
app.get('/api/channels', (_, res) => {
  res.json(mixer.getAllChannels());
});

// Single channel state
app.get('/api/channels/:ch', (req, res) => {
  const state = mixer.getChannelState(parseInt(req.params.ch, 10));
  if (!state) return res.status(404).json({ error: 'Channel not found' });
  res.json(state);
});

// Mute/unmute a channel
app.post('/api/channels/:ch/mute', (req, res) => {
  const ch = parseInt(req.params.ch, 10);
  const { muted } = req.body;
  mixer.muteChannel(ch, muted);
  res.json({ ok: true, channel: ch, muted });
});

// Transcription control
app.post('/api/transcription/start', (_, res) => {
  transcriber.start(() => {
    const active = mixer.getActiveChannels();
    return active.length > 0 ? active[0] : null;
  });
  res.json({ ok: true });
});

app.post('/api/transcription/stop', (_, res) => {
  transcriber.stop();
  res.json({ ok: true });
});

// Simulation mode (dev without physical mixer)
app.post('/api/simulate', (_, res) => {
  mixer.startSimulation();
  res.json({ ok: true, mode: 'simulation' });
});

// Get all member name/title assignments
app.get('/api/members', (_, res) => {
  res.json(members);
});

// Save updated member assignments
app.put('/api/members', (req, res) => {
  const updated = req.body;
  // Basic validation: keys 1-8, each has name string
  for (let ch = 1; ch <= 8; ch++) {
    const m = updated[ch];
    if (!m || typeof m.name !== 'string' || !m.name.trim()) {
      return res.status(400).json({ error: `Channel ${ch} requires a name` });
    }
  }
  members = updated;
  saveMembers(members);
  applyMembers(members);
  broadcast('members:updated', members);
  res.json({ ok: true, members });
});

// ── Mixer events → WebSocket ────────────────────────────────────────────────
mixer.on('connected', () => broadcast('mixer:connected', {}));
mixer.on('disconnected', () => broadcast('mixer:disconnected', {}));
mixer.on('channelUpdate', (channel) => broadcast('channel:update', channel));

// ── Transcription events → WebSocket ────────────────────────────────────────
transcriber.on('transcript', (entry) => broadcast('transcript:final', entry));
transcriber.on('interim', (entry) => broadcast('transcript:interim', entry));
transcriber.on('started', () => broadcast('transcription:started', {}));
transcriber.on('stopped', () => broadcast('transcription:stopped', {}));

// ── WebSocket connection ─────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  // Send full state on connect
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      channels: mixer.getAllChannels(),
      transcriptionRunning: transcriber.isRunning(),
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
      if (type === 'mute') {
        mixer.muteChannel(payload.channel, payload.muted);
      }
    } catch (e) {
      console.error('[WS] Bad message:', e.message);
    }
  });

  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(config.server.port, () => {
  console.log(`\n🏛  ${config.meeting.cityName} — ${config.meeting.chamberName}`);
  console.log(`   Server running on http://localhost:${config.server.port}`);
  console.log(`   WebSocket on ws://localhost:${config.server.port}\n`);

  // Apply persisted member names then connect
  applyMembers(members);
  mixer.connect();
  setTimeout(() => {
    if (!mixer.connected) {
      console.log('[SCM820] Could not reach mixer — starting simulation mode');
      mixer.startSimulation();
    }
  }, 5000);
});
