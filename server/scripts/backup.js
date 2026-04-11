#!/usr/bin/env node

const { createBackup } = require('../utils/database');
const logger = require('../middleware/logger');

async function runBackup() {
  try {
    logger.info('Starting backup...');
    const backupDir = await createBackup();
    logger.info(`Backup completed successfully: ${backupDir}`);
    process.exit(0);
  } catch (error) {
    logger.error('Backup failed:', error);
    process.exit(1);
  }
}

runBackup();
