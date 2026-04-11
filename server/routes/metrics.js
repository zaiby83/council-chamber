const express = require('express');
const router = express.Router();

// Simple in-memory metrics store
const metrics = {
  requests: {
    total: 0,
    byEndpoint: {},
    byMethod: {},
  },
  websocket: {
    connections: 0,
    totalConnections: 0,
    messages: {
      sent: 0,
      received: 0,
    },
  },
  transcription: {
    sessions: 0,
    totalSessions: 0,
    entries: 0,
  },
  errors: {
    total: 0,
    byType: {},
  },
};

// Middleware to track requests
function trackRequest(req, res, next) {
  metrics.requests.total++;
  
  const endpoint = req.route?.path || req.path;
  metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;
  
  const method = req.method;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
  
  next();
}

// Track WebSocket connections
function trackWebSocketConnection() {
  metrics.websocket.connections++;
  metrics.websocket.totalConnections++;
}

function trackWebSocketDisconnection() {
  metrics.websocket.connections--;
}

function trackWebSocketMessage(direction) {
  if (direction === 'sent') {
    metrics.websocket.messages.sent++;
  } else {
    metrics.websocket.messages.received++;
  }
}

// Track transcription
function trackTranscriptionStart() {
  metrics.transcription.sessions++;
  metrics.transcription.totalSessions++;
}

function trackTranscriptionStop() {
  metrics.transcription.sessions--;
}

function trackTranscriptEntry() {
  metrics.transcription.entries++;
}

// Track errors
function trackError(type) {
  metrics.errors.total++;
  metrics.errors.byType[type] = (metrics.errors.byType[type] || 0) + 1;
}

// Get metrics endpoint
router.get('/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    metrics,
  });
});

// Reset metrics (for testing)
router.post('/metrics/reset', (req, res) => {
  metrics.requests.total = 0;
  metrics.requests.byEndpoint = {};
  metrics.requests.byMethod = {};
  metrics.websocket.messages.sent = 0;
  metrics.websocket.messages.received = 0;
  metrics.transcription.entries = 0;
  metrics.errors.total = 0;
  metrics.errors.byType = {};
  
  res.json({ message: 'Metrics reset successfully' });
});

module.exports = {
  router,
  trackRequest,
  trackWebSocketConnection,
  trackWebSocketDisconnection,
  trackWebSocketMessage,
  trackTranscriptionStart,
  trackTranscriptionStop,
  trackTranscriptEntry,
  trackError,
  metrics,
};
