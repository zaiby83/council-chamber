require('dotenv').config();

module.exports = {
  shure: {
    ip: process.env.SHURE_IP || '192.168.1.100',
    port: parseInt(process.env.SHURE_PORT || '2202', 10),
  },
  azure: {
    speechKey: process.env.AZURE_SPEECH_KEY,
    speechRegion: process.env.AZURE_SPEECH_REGION || 'westus2',
  },
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
  },
  meeting: {
    cityName: process.env.CITY_NAME || 'City of Fairfield',
    chamberName: process.env.CHAMBER_NAME || 'Council Chamber',
  },
  // Map Shure SCM820 channel numbers (1-8) to council members
  // Update these names to match your actual council members
  councilMembers: {
    1: { name: 'Mayor Catherine Moy', title: 'Mayor', channel: 1 },
    2: { name: 'Vice Mayor Manny Cardenas', title: 'Vice Mayor', channel: 2 },
    3: { name: 'Council Member Rick Vaccaro', title: 'Council Member', channel: 3 },
    4: { name: 'Council Member Harry Price', title: 'Council Member', channel: 4 },
    5: { name: 'Council Member Nico Nava', title: 'Council Member', channel: 5 },
    6: { name: 'City Manager', title: 'City Manager', channel: 6 },
    7: { name: 'City Attorney', title: 'City Attorney', channel: 7 },
    8: { name: 'City Clerk', title: 'City Clerk', channel: 8 },
  },
};
