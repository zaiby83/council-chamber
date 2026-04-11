const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for token endpoint
const tokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many token requests, please try again later.',
});

// Configure helmet for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://westus2.api.cognitive.microsoft.com', 'https://eastus.api.cognitive.microsoft.com'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Input sanitization
function sanitizeInput(text) {
  if (typeof text !== 'string') return text;
  // Remove potential XSS vectors
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate channel number
function validateChannel(ch) {
  const channel = parseInt(ch, 10);
  if (isNaN(channel) || channel < 1 || channel > 8) {
    throw new Error('Invalid channel number. Must be between 1 and 8.');
  }
  return channel;
}

// Validate member data
function validateMemberData(members) {
  if (!members || typeof members !== 'object') {
    throw new Error('Invalid member data format');
  }

  for (const [ch, member] of Object.entries(members)) {
    const channel = validateChannel(ch);
    
    if (!member.name || typeof member.name !== 'string' || !member.name.trim()) {
      throw new Error(`Channel ${channel} requires a valid name`);
    }

    if (member.name.length > 100) {
      throw new Error(`Channel ${channel} name too long (max 100 characters)`);
    }

    if (member.title && member.title.length > 100) {
      throw new Error(`Channel ${channel} title too long (max 100 characters)`);
    }
  }

  return true;
}

// Validate source configuration
function validateSourceConfig(config) {
  const { source, ip, port, meetingId } = config;

  if (!['scm820', 'zoom', 'simulation'].includes(source)) {
    throw new Error('Invalid source type. Must be scm820, zoom, or simulation.');
  }

  if (source === 'scm820' && ip) {
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      throw new Error('Invalid IP address format');
    }
  }

  if (port) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error('Invalid port number. Must be between 1 and 65535.');
    }
  }

  if (meetingId && meetingId.length > 50) {
    throw new Error('Meeting ID too long (max 50 characters)');
  }

  return true;
}

module.exports = {
  apiLimiter,
  tokenLimiter,
  helmetConfig,
  sanitizeInput,
  validateChannel,
  validateMemberData,
  validateSourceConfig,
};
