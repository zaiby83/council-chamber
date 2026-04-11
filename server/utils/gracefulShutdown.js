const logger = require('../middleware/logger');

let isShuttingDown = false;

function gracefulShutdown(server, wss, source, transcriber) {
  return async (signal) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close WebSocket connections
    if (wss) {
      logger.info('Closing WebSocket connections...');
      wss.clients.forEach((client) => {
        client.close(1000, 'Server shutting down');
      });
      wss.close(() => {
        logger.info('WebSocket server closed');
      });
    }

    // Stop transcription
    if (transcriber && transcriber.isRunning()) {
      logger.info('Stopping transcription...');
      transcriber.stop();
    }

    // Disconnect audio source
    if (source && source.connected) {
      logger.info('Disconnecting audio source...');
      source.disconnect();
    }

    // Give time for cleanup
    setTimeout(() => {
      logger.info('Graceful shutdown complete');
      process.exit(0);
    }, 5000);

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
}

module.exports = gracefulShutdown;
