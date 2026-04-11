require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const { createSource } = require('./sources');
const transcriber = require('./transcription/azure-speech');
const logger = require('./middleware/logger');
const { errorHandler, notFoundHandler, asyncHandler, AppError } = require('./middleware/errorHandler');
const { apiLimiter, tokenLimiter, helmetConfig, validateChannel, validateMemberData, validateSourceConfig, sanitizeInput } = require('./middleware/security');
const { initializeDatabase, loadMembers, saveMembers, saveTranscript } = require('./utils/database');
const gracefulShutdown = require('./utils/gracefulShutdown');
const healthRouter = require('./routes/health');
const { router: metricsRouter, trackRequest, trackWebSocketConnection, trackWebSocketDisconnection, trackWebSocketMessage, trackTranscriptionStart, trackTranscriptionStop, trackTranscriptEntry, trackError } = require('./routes/metrics');

// Initialize database
initializeDatabase().catch((err) => {
  logger.error('Failed to initialize database:', err);
  process.exit(1);
});

let members = {};
loadMembers().then((data) => {
  members = data;
  if (Object.keys(members).length === 0) {
    // Initialize with defaults from config
    for (const [ch, m] of Object.entries(config.councilMembers)) {
      members[ch] = { name: m.name, title: m.title };
    }
    saveMembers(members);
  }
}).catch((err) => {
  logger.error('Failed to load members:', err);
});

// ── Express + WebSocket ──────────────────────────────────────────────────────
const app = express();

// Security middleware
app.use(helmetConfig);
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (built React app)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Health and metrics routes (no rate limiting)
app.use('/', healthRouter);
app.use('/', metricsRouter);

// Apply rate limiting to API routes
app.use('/api', apiLimiter);
app.use('/api', trackRequest);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Track active transcript for auto-save
let currentTranscript = [];
let currentMeetingId = null;

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
        trackWebSocketMessage('sent');
      } catch (err) {
        logger.error('Failed to send WebSocket message:', err);
        trackError('websocket_send');
      }
    }
  });
}

// ── Audio source ─────────────────────────────────────────────────────────────
let source = createSource(config.audioSource, { members, app });
logger.info(`Audio source initialized: ${config.audioSource}`);

// ── REST API ─────────────────────────────────────────────────────────────────

app.get('/api/meeting', (req, res) => {
  res.json({
    cityName: config.meeting.cityName,
    chamberName: config.meeting.chamberName,
    sourceType: source.sourceType,
    supportsMembers: source.supportsMembers,
    meetingId: currentMeetingId,
  });
});

app.get('/api/channels', (req, res) => {
  res.json(source.getAllChannels());
});

app.get('/api/channels/:ch', asyncHandler(async (req, res) => {
  const ch = validateChannel(req.params.ch);
  const state = source.getChannelState(ch);
  if (!state) {
    throw new AppError('Channel not found', 404);
  }
  res.json(state);
}));

app.post('/api/channels/:ch/mute', asyncHandler(async (req, res) => {
  const ch = validateChannel(req.params.ch);
  const { muted } = req.body;
  
  if (typeof muted !== 'boolean') {
    throw new AppError('Invalid muted value. Must be boolean.', 400);
  }
  
  source.muteChannel(ch, muted);
  logger.info(`Channel ${ch} ${muted ? 'muted' : 'unmuted'}`);
  res.json({ ok: true, channel: ch, muted });
}));

// Token endpoint with stricter rate limiting
app.get('/api/transcription/token', tokenLimiter, asyncHandler(async (req, res) => {
  if (!config.azure.speechKey) {
    throw new AppError('AZURE_SPEECH_KEY not configured on server', 400);
  }
  
  try {
    const tokenRes = await fetch(
      `https://${config.azure.speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': config.azure.speechKey } }
    );
    
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      logger.error('Azure token request failed:', text);
      throw new AppError(`Azure rejected key: ${text}`, tokenRes.status);
    }
    
    const token = await tokenRes.text();
    logger.info('Azure token issued successfully');
    res.json({ token, region: config.azure.speechRegion });
  } catch (err) {
    trackError('azure_token');
    throw err;
  }
}));

app.post('/api/transcription/start', asyncHandler(async (req, res) => {
  const { language } = req.body || {};
  transcriber.start(() => source.getSpeaker(), language || 'en-US');
  trackTranscriptionStart();
  logger.info(`Transcription started: ${language || 'en-US'}`);
  res.json({ ok: true });
}));

app.post('/api/transcription/stop', asyncHandler(async (req, res) => {
  transcriber.stop();
  trackTranscriptionStop();
  
  // Auto-save transcript
  if (currentTranscript.length > 0 && currentMeetingId) {
    try {
      await saveTranscript(currentMeetingId, {
        meetingId: currentMeetingId,
        entries: currentTranscript,
        startTime: currentTranscript[0]?.timestamp,
        endTime: currentTranscript[currentTranscript.length - 1]?.timestamp,
        totalEntries: currentTranscript.length,
      });
      logger.info(`Transcript auto-saved: ${currentTranscript.length} entries`);
    } catch (err) {
      logger.error('Failed to auto-save transcript:', err);
    }
  }
  
  logger.info('Transcription stopped');
  res.json({ ok: true });
}));

app.get('/api/status', (req, res) => {
  res.json({
    sourceType: source.sourceType,
    connected: source.connected,
    supportsMembers: source.supportsMembers,
    transcriptionRunning: transcriber.isRunning(),
    meetingId: currentMeetingId,
  });
});

app.post('/api/configure', asyncHandler(async (req, res) => {
  validateSourceConfig(req.body);
  
  const { source: sourceType, ip, port, meetingId } = req.body;
  
  source.disconnect();
  source.removeAllListeners();
  
  source = createSource(sourceType, { members, app, ip, port, meetingId });
  wireSource(source);
  source.connect();
  
  // Generate new meeting ID
  currentMeetingId = `meeting_${Date.now()}`;
  currentTranscript = [];
  
  // SCM820 fallback to simulation after 5s if unreachable
  if (sourceType === 'scm820') {
    setTimeout(() => {
      if (!source.connected) {
        logger.warn('SCM820 unreachable, falling back to simulation');
        source.disconnect();
        source.removeAllListeners();
        source = createSource('simulation', { members });
        wireSource(source);
        source.connect();
      }
    }, 5000);
  }
  
  logger.info(`Audio source configured: ${sourceType}`);
  res.json({ ok: true, sourceType, supportsMembers: source.supportsMembers, meetingId: currentMeetingId });
}));

app.get('/api/members', (req, res) => {
  if (!source.supportsMembers) return res.json({});
  res.json(members);
});

app.put('/api/members', asyncHandler(async (req, res) => {
  if (!source.supportsMembers) {
    throw new AppError('Current source does not support member editing', 400);
  }
  
  const updated = req.body;
  validateMemberData(updated);
  
  // Sanitize input
  for (const [ch, member] of Object.entries(updated)) {
    member.name = sanitizeInput(member.name);
    member.title = sanitizeInput(member.title || '');
  }
  
  members = updated;
  await saveMembers(members);
  
  for (const [ch, m] of Object.entries(members)) {
    source.updateMember(parseInt(ch, 10), m.name, m.title);
  }
  
  broadcast('members:updated', members);
  logger.info('Members updated successfully');
  res.json({ ok: true, members });
}));

// ── Source event wiring ──────────────────────────────────────────────────────
function wireSource(src) {
  src.on('connected', () => {
    broadcast('mixer:connected', { sourceType: src.sourceType });
    logger.info(`Audio source connected: ${src.sourceType}`);
  });
  
  src.on('disconnected', () => {
    broadcast('mixer:disconnected', {});
    logger.warn('Audio source disconnected');
  });
  
  src.on('channelUpdate', (ch) => {
    broadcast('channel:update', ch);
  });
}
wireSource(source);

// ── Transcription events ─────────────────────────────────────────────────────
transcriber.on('transcript', (entry) => {
  broadcast('transcript:final', entry);
  currentTranscript.push(entry);
  trackTranscriptEntry();
});

transcriber.on('interim', (entry) => {
  broadcast('transcript:interim', entry);
});

transcriber.on('started', () => {
  broadcast('transcription:started', {});
  logger.info('Transcription started');
});

transcriber.on('stopped', () => {
  broadcast('transcription:stopped', {});
  logger.info('Transcription stopped');
});

// ── WebSocket connection ─────────────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  logger.info(`WebSocket client connected: ${clientIp}`);
  trackWebSocketConnection();
  
  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      channels: source.getAllChannels(),
      transcriptionRunning: transcriber.isRunning(),
      sourceType: source.sourceType,
      supportsMembers: source.supportsMembers,
      meetingId: currentMeetingId,
      meeting: {
        cityName: config.meeting.cityName,
        chamberName: config.meeting.chamberName,
      },
    },
    ts: new Date().toISOString(),
  }));
  
  ws.on('message', (msg) => {
    try {
      trackWebSocketMessage('received');
      const { type, payload } = JSON.parse(msg);
      
      if (type === 'mute') {
        const ch = validateChannel(payload.channel);
        source.muteChannel(ch, payload.muted);
      }
      
      // Browser transcription — relay to all clients
      if (type === 'transcript:submit') {
        broadcast('transcript:final', payload);
        currentTranscript.push(payload);
        trackTranscriptEntry();
      }
      
      if (type === 'transcript:interim:submit') {
        broadcast('transcript:interim', payload);
      }
    } catch (err) {
      logger.error('WebSocket message error:', err);
      trackError('websocket_message');
    }
  });
  
  ws.on('close', () => {
    logger.info(`WebSocket client disconnected: ${clientIp}`);
    trackWebSocketDisconnection();
  });
  
  ws.on('error', (err) => {
    logger.error('WebSocket error:', err);
    trackError('websocket');
  });
});

// ── Error handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = config.server.port;

server.listen(PORT, () => {
  logger.info(`🏛  ${config.meeting.cityName} — ${config.meeting.chamberName}`);
  logger.info(`   Server:    http://localhost:${PORT}`);
  logger.info(`   WebSocket: ws://localhost:${PORT}`);
  logger.info(`   Source:    ${config.audioSource}`);
  logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  
  source.connect();
  
  if (config.audioSource === 'scm820') {
    setTimeout(() => {
      if (!source.connected) {
        logger.warn('SCM820 unreachable, falling back to simulation');
        source.disconnect();
        source.removeAllListeners();
        source = createSource('simulation', { members });
        wireSource(source);
        source.connect();
      }
    }, 5000);
  }
  
  // Signal PM2 that app is ready
  if (process.send) {
    process.send('ready');
  }
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
const shutdown = gracefulShutdown(server, wss, source, transcriber);
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app; // For testing
