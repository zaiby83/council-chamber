const fs = require('fs').promises;
const path = require('path');
const logger = require('../middleware/logger');

const DATA_DIR = path.join(__dirname, '../data');
const TRANSCRIPTS_DIR = path.join(DATA_DIR, 'transcripts');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const MEETINGS_FILE = path.join(DATA_DIR, 'meetings.json');

// Ensure data directories exist
async function initializeDatabase() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(TRANSCRIPTS_DIR, { recursive: true });
    logger.info('Database directories initialized');
  } catch (error) {
    logger.error('Failed to initialize database directories:', error);
    throw error;
  }
}

// Members CRUD
async function loadMembers() {
  try {
    const data = await fs.readFile(MEMBERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}; // Return empty object if file doesn't exist
    }
    logger.error('Failed to load members:', error);
    throw error;
  }
}

async function saveMembers(members) {
  try {
    await fs.writeFile(MEMBERS_FILE, JSON.stringify(members, null, 2));
    logger.info('Members saved successfully');
  } catch (error) {
    logger.error('Failed to save members:', error);
    throw error;
  }
}

// Meetings CRUD
async function loadMeetings() {
  try {
    const data = await fs.readFile(MEETINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // Return empty array if file doesn't exist
    }
    logger.error('Failed to load meetings:', error);
    throw error;
  }
}

async function saveMeeting(meeting) {
  try {
    const meetings = await loadMeetings();
    meetings.push(meeting);
    await fs.writeFile(MEETINGS_FILE, JSON.stringify(meetings, null, 2));
    logger.info('Meeting saved:', { meetingId: meeting.id });
    return meeting;
  } catch (error) {
    logger.error('Failed to save meeting:', error);
    throw error;
  }
}

async function getMeeting(meetingId) {
  try {
    const meetings = await loadMeetings();
    return meetings.find((m) => m.id === meetingId);
  } catch (error) {
    logger.error('Failed to get meeting:', error);
    throw error;
  }
}

// Transcript CRUD
async function saveTranscript(meetingId, transcript) {
  try {
    const filename = `${meetingId}_${Date.now()}.json`;
    const filepath = path.join(TRANSCRIPTS_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(transcript, null, 2));
    logger.info('Transcript saved:', { meetingId, filename });
    return filename;
  } catch (error) {
    logger.error('Failed to save transcript:', error);
    throw error;
  }
}

async function loadTranscript(filename) {
  try {
    const filepath = path.join(TRANSCRIPTS_DIR, filename);
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to load transcript:', error);
    throw error;
  }
}

async function listTranscripts(meetingId = null) {
  try {
    const files = await fs.readdir(TRANSCRIPTS_DIR);
    if (meetingId) {
      return files.filter((f) => f.startsWith(meetingId));
    }
    return files;
  } catch (error) {
    logger.error('Failed to list transcripts:', error);
    throw error;
  }
}

async function deleteTranscript(filename) {
  try {
    const filepath = path.join(TRANSCRIPTS_DIR, filename);
    await fs.unlink(filepath);
    logger.info('Transcript deleted:', { filename });
  } catch (error) {
    logger.error('Failed to delete transcript:', error);
    throw error;
  }
}

// Backup functionality
async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(DATA_DIR, 'backups', timestamp);
    await fs.mkdir(backupDir, { recursive: true });

    // Copy all data files
    const files = await fs.readdir(DATA_DIR);
    for (const file of files) {
      const srcPath = path.join(DATA_DIR, file);
      const stat = await fs.stat(srcPath);
      if (stat.isFile()) {
        const destPath = path.join(backupDir, file);
        await fs.copyFile(srcPath, destPath);
      }
    }

    // Copy transcripts directory
    const transcripts = await fs.readdir(TRANSCRIPTS_DIR);
    const transcriptsBackupDir = path.join(backupDir, 'transcripts');
    await fs.mkdir(transcriptsBackupDir, { recursive: true });
    for (const file of transcripts) {
      const srcPath = path.join(TRANSCRIPTS_DIR, file);
      const destPath = path.join(transcriptsBackupDir, file);
      await fs.copyFile(srcPath, destPath);
    }

    logger.info('Backup created:', { backupDir });
    return backupDir;
  } catch (error) {
    logger.error('Failed to create backup:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  loadMembers,
  saveMembers,
  loadMeetings,
  saveMeeting,
  getMeeting,
  saveTranscript,
  loadTranscript,
  listTranscripts,
  deleteTranscript,
  createBackup,
};
