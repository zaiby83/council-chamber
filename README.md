# Council Chamber

Real-time audio monitoring and live transcription dashboard for city council meetings.

Connects to a **Shure SCM820** automatic mixer (or runs in simulation), monitors microphone gate/mute status for up to 8 channels, and streams ADA-compliant live captions using either the browser's built-in speech engine or **Azure Cognitive Speech** (required for non-English languages).

---

## Prerequisites

- **Node.js** 16.x or higher
- **npm** 7.x or higher
- **Browser**: Chrome or Edge (required for Web Speech API)
- **Network**: Access to SCM820 mixer on TCP port 2202 (if using hardware)
- **Azure Account**: Optional, only needed for Azure Cognitive Speech transcription

---

## Architecture

```
┌──────────────────────────────────┐
│         Browser (React)          │
│  Fluent UI v9  ·  Web Speech API │
│  Azure Speech SDK (client-side)  │
│                                  │
│  Mic ──► Azure Cloud ──► Results │
│              │                   │
│         WebSocket (transcript)   │
└──────────────┬───────────────────┘
               │ ws://localhost:3001
┌──────────────▼───────────────────┐
│         Node.js Server           │
│  Express REST  ·  WebSocket hub  │
│                                  │
│  /api/transcription/token ──► Azure (key stays server-side)
│  /api/configure          ──► swap audio source at runtime
│  /api/members            ──► persist channel names
└──────────────┬───────────────────┘
               │ TCP :2202
        Shure SCM820 mixer
        (falls back to simulation if unreachable)
```

**Key design decisions:**
- The Azure Speech key never leaves the server — the browser fetches a short-lived token via `/api/transcription/token`
- Both browser (Web Speech API) and Azure transcription run entirely client-side; the server is only a WebSocket hub and token issuer
- Audio source is hot-swappable at runtime via `POST /api/configure`

---

## Quick Start

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

### 2. Configure the server

Copy `.env.example` to `.env` and fill in your values:

```bash
cp server/.env.example server/.env
```

| Variable | Required | Description |
|---|---|---|
| `AZURE_SPEECH_KEY` | For Azure transcription | Key 1 from your Azure Speech resource |
| `AZURE_SPEECH_REGION` | For Azure transcription | e.g. `eastus`, `westus2` |
| `SHURE_IP` | For SCM820 | IP address of the mixer (default: `192.168.1.100`) |
| `SHURE_PORT` | Optional | TCP port for SCM820 (default: `2202`) |
| `PORT` | Optional | Server port (default: `3001`) |
| `NODE_ENV` | Optional | `development` or `production` |
| `CITY_NAME` | Optional | Shown in the header (default: `City of Fairfield`) |
| `CHAMBER_NAME` | Optional | Shown in the header (default: `Council Chamber`) |

**Note:** The server will automatically fall back to **simulation mode** if the SCM820 is unreachable after 5 seconds.

### 3. Run

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm start
```

Open **http://localhost:3000** in Chrome or Edge.

---

## Setup Wizard

On first load (or after "New Meeting"), the wizard walks through:

1. **Source** — SCM820 mixer, Zoom webhook, or Simulation
2. **Transcription** — choose provider and language
3. **Names** — assign names and titles to each channel (saved to `server/members.json`)
4. **Connect** — connects to the audio source

**Session Behavior:**
- Settings persist across hot-reloads during development
- Session resets on page refresh
- Channel names/titles are saved to `server/members.json` and persist across restarts

---

## Transcription Providers

### Browser (free, no key needed)
Uses the browser's built-in Web Speech API (Chrome / Edge only). Reliable for English. Limited support for other languages.

### Azure Cognitive Speech (recommended for non-English)
Runs in the browser using a server-issued token. Supports 146 languages including Arabic, Hindi, Urdu, Spanish, Filipino, Vietnamese, and more.

**To enable Azure:**
1. Create a Speech resource in [portal.azure.com](https://portal.azure.com) → Free F0 tier is sufficient for testing
2. Copy **Key 1** and the **Location/Region** from Keys and Endpoint
3. Add to `server/.env`:
   ```
   AZURE_SPEECH_KEY=your-key-here
   AZURE_SPEECH_REGION=eastus
   ```
4. Restart the server, go through the wizard, and select **Azure Cognitive Speech**

**Note:** Azure real-time STT supports `ur-IN` for Urdu (not `ur-PK`). The transcription quality is the same for Pakistani Urdu.

---

## Audio Sources

| Source | Description | Setup Required |
|---|---|---|
| **SCM820** | Shure IntelliMix SCM820 over TCP port 2202. Gate-open events drive speaker attribution. Falls back to simulation after 5 s if unreachable. | Configure `SHURE_IP` in `.env` |
| **Zoom** | Webhook-based. Receives `participant_joined`, `participant_left`, and `active_speaker` events from a Zoom App. | See [Zoom Integration](#zoom-integration) below |
| **Simulation** | Built-in mock that rotates the active speaker every ~3 seconds. Useful for development and testing without hardware. | No setup required |

### Zoom Integration

To use Zoom as an audio source:

1. **Create a Zoom App** at [marketplace.zoom.us](https://marketplace.zoom.us)
2. **Enable Event Subscriptions** and add these events:
   - `meeting.participant_joined`
   - `meeting.participant_left`
   - `meeting.active_speaker`
3. **Set Webhook URL** to `http://your-server:3001/api/zoom/webhook`
4. **Configure the app** to use your Zoom App credentials
5. **In the Setup Wizard**, select "Zoom" as the source

**Note:** Zoom integration requires a publicly accessible webhook endpoint. For local development, use a tool like [ngrok](https://ngrok.com) to expose your server.

---

## Speaker Attribution

Transcription entries are attributed to the currently active speaker using:
1. The channel with its gate open (not muted) — primary signal from SCM820
2. Fallback: highest audio level among unmuted channels

---

## Production Deployment

### Hardware Setup

1. **Network**: Connect the server machine to the same network as the SCM820 mixer
2. **Audio Routing** (optional): Route mixer output to **Dante Virtual Soundcard** on the server machine and set it as the default audio input — this is used by the server-side Azure SDK path if needed
3. **Display**: Set up a dedicated display machine for the client interface

### Build and Deploy

#### Option 1: Separate Client and Server

```bash
# Build the React client
cd client
npm run build

# Serve the build folder with nginx, Apache, or any static file server
# Point your browser to the static server URL
```

**Nginx example configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Serve React build
    location / {
        root /path/to/council-chamber/client/build;
        try_files $uri /index.html;
    }
    
    # Proxy API and WebSocket to Node server
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
    }
    
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### Option 2: Serve Client from Node Server

```bash
# Build the client
cd client && npm run build

# Add to server/index.js (before the routes):
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

# Start the server
cd server && npm start
```

### Process Management

Use **PM2** to keep the server running:

```bash
npm install -g pm2

# Start the server
cd server
pm2 start index.js --name council-chamber

# Auto-restart on system reboot
pm2 startup
pm2 save
```

### HTTPS/SSL Setup

For production, use HTTPS to enable microphone access in browsers:

```bash
# Using Let's Encrypt with Certbot
sudo certbot --nginx -d your-domain.com
```

### Security Considerations

- **Network**: Ensure SCM820 is on a secure network segment
- **WebSocket**: Currently open to all clients — consider adding authentication for production
- **Token Endpoint**: The `/api/transcription/token` endpoint is rate-limited by Azure but consider adding application-level rate limiting
- **CORS**: Update CORS settings in `server/index.js` to restrict origins in production

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/meeting` | Get meeting info (city, chamber, source type) |
| `GET` | `/api/channels` | Get all channel states |
| `GET` | `/api/channels/:ch` | Get specific channel state |
| `POST` | `/api/channels/:ch/mute` | Mute/unmute a channel |
| `GET` | `/api/transcription/token` | Get Azure Speech token (short-lived) |
| `POST` | `/api/transcription/start` | Start server-side transcription |
| `POST` | `/api/transcription/stop` | Stop server-side transcription |
| `GET` | `/api/status` | Get current source status |
| `POST` | `/api/configure` | Switch audio source at runtime |
| `GET` | `/api/members` | Get channel name/title assignments |
| `PUT` | `/api/members` | Update channel name/title assignments |

### WebSocket Events

**Server → Client:**
- `mixer:connected` — Audio source connected
- `mixer:disconnected` — Audio source disconnected
- `channel:update` — Channel state changed (gate, mute, level)
- `transcript:final` — Final transcription result
- `transcript:interim` — Interim transcription result
- `transcription:started` — Transcription started
- `transcription:stopped` — Transcription stopped
- `members:updated` — Channel names/titles updated

**Client → Server:**
- `mute` — Mute/unmute a channel
- `transcript:submit` — Submit browser transcription (final)
- `transcript:interim:submit` — Submit browser transcription (interim)

---

## Troubleshooting

### SCM820 Connection Issues

**Problem:** Server logs "SCM820 Unreachable — falling back to simulation"

**Solutions:**
- Verify the mixer IP address in `.env` matches your SCM820
- Ensure the server machine is on the same network as the mixer
- Check that TCP port 2202 is not blocked by a firewall
- Test connectivity: `telnet <SHURE_IP> 2202`

### WebSocket Connection Failures

**Problem:** Client shows "Disconnected" status

**Solutions:**
- Verify the server is running on port 3001
- Check browser console for WebSocket errors
- Ensure no firewall is blocking WebSocket connections
- If using a reverse proxy, verify WebSocket upgrade headers are configured

### Azure Token Errors

**Problem:** "Azure rejected key" or token fetch fails

**Solutions:**
- Verify `AZURE_SPEECH_KEY` is correct (copy from Azure Portal → Keys and Endpoint)
- Ensure `AZURE_SPEECH_REGION` matches your Azure resource location
- Check that the Speech resource is active in Azure Portal
- Verify the server has internet access to reach Azure APIs

### Microphone Access Denied

**Problem:** Browser transcription doesn't start

**Solutions:**
- Use Chrome or Edge (Safari has limited Web Speech API support)
- Ensure the page is served over HTTPS in production (required for mic access)
- Check browser permissions: Settings → Privacy → Microphone
- Click the microphone icon in the address bar to grant access

### CORS Errors

**Problem:** API requests fail with CORS errors

**Solutions:**
- Verify the client is using the proxy configured in `client/package.json`
- In production, update CORS settings in `server/index.js` to allow your domain
- Ensure the server is running before starting the client

---

## Development Tips

### Hot Reload Behavior
- Client hot-reloads automatically on file changes
- Server requires restart for changes (use `npm run dev` with nodemon for auto-restart)
- WebSocket reconnects automatically on server restart
- Session state persists during hot-reload but resets on page refresh

### Debugging WebSocket
```javascript
// In browser console:
// Monitor all WebSocket messages
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (e) => console.log('WS:', JSON.parse(e.data));
```

### Browser Compatibility
- **Chrome/Edge**: Full support (Web Speech API + Azure SDK)
- **Firefox**: Azure SDK only (no Web Speech API)
- **Safari**: Limited support (use Azure transcription)

### Testing Without Hardware
Use simulation mode for development:
1. In the Setup Wizard, select "Simulation" as the source
2. The system will rotate through 8 mock speakers every ~3 seconds
3. Test transcription, muting, and UI without physical hardware

---

## Project Structure

```
council-chamber/
├── server/
│   ├── index.js              # Express + WebSocket server
│   ├── config.js             # Env-based configuration
│   ├── members.json          # Persisted channel name/title assignments
│   ├── sources/
│   │   ├── base.js           # AudioSource base class (EventEmitter)
│   │   ├── scm820.js         # Shure SCM820 TCP adapter
│   │   ├── simulation.js     # Mock rotating-speaker source
│   │   ├── zoom.js           # Zoom webhook source
│   │   └── index.js          # Factory function
│   └── transcription/
│       └── azure-speech.js   # Server-side Azure SDK (for Dante/production)
└── client/
    └── src/
        ├── App.tsx                        # Root — WebSocket, transcription wiring
        ├── components/
        │   ├── MeetingHeader.tsx          # Title bar + status badges
        │   ├── MixerPanel.tsx             # 8-channel mixer grid
        │   ├── CouncilMemberCard.tsx      # Per-channel card (gate, mute, level)
        │   ├── TranscriptPanel.tsx        # Live transcript with pause/resume
        │   └── setup/
        │       ├── SetupWizard.tsx        # Multi-step setup flow
        │       ├── SourceSelectStep.tsx   # Source picker
        │       ├── ConfigStep.tsx         # Mixer IP + transcription settings
        │       └── NamesStep.tsx          # Channel name/title assignment
        └── hooks/
            ├── useWebSocket.ts            # Auto-reconnecting WS hook
            ├── useBrowserTranscription.ts # Web Speech API hook
            └── useAzureTranscription.ts   # Azure SDK (browser, token-based)
```

---

## License

MIT
