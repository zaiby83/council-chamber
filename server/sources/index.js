/**
 * Audio source factory.
 *
 * Set AUDIO_SOURCE in .env to select the source:
 *   scm820      — Shure SCM820 over TCP (default)
 *   zoom        — Zoom meeting via webhooks
 *   simulation  — rotating fake channels, no hardware needed
 */

const SCM820Source = require('./scm820');
const SimulationSource = require('./simulation');
const ZoomSource = require('./zoom');

function createSource(type, { members = {}, app = null, ip, port, meetingId } = {}) {
  switch (type) {
    case 'zoom': {
      if (!app) throw new Error('Zoom source requires the Express app instance');
      if (meetingId) process.env.ZOOM_MEETING_ID = meetingId;
      return new ZoomSource(app);
    }
    case 'simulation':
      return new SimulationSource(members);
    case 'scm820':
    default:
      return new SCM820Source(members, { ip, port });
  }
}

module.exports = { createSource };
