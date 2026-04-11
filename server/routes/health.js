const express = require('express');
const os = require('os');
const { version } = require('../package.json');

const router = express.Router();

// Simple health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version,
  });
});

// Detailed health check
router.get('/health/detailed', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
    },
    process: {
      pid: process.pid,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      },
      cpu: process.cpuUsage(),
    },
  });
});

// Readiness check (for Kubernetes/Docker)
router.get('/ready', (req, res) => {
  // Check if critical services are ready
  // For now, just return ok
  res.json({ ready: true });
});

// Liveness check (for Kubernetes/Docker)
router.get('/live', (req, res) => {
  res.json({ alive: true });
});

module.exports = router;
