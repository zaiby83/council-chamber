# Council Chamber

Real-time audio monitoring and live transcription dashboard for city council meetings.

Connects to a **Shure SCM820** automatic mixer (or runs in simulation), monitors microphone gate/mute status for up to 8 channels, and streams ADA-compliant live captions using either the browser's built-in speech engine or **Azure Cognitive Speech** (required for non-English languages).

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
| `AZURE_SPEECH_REGION` | For Azure transcription | e.g. `eastus` |
| `SHURE_IP` | For SCM820 | IP address of the mixer |
| `SHURE_PORT` | Optional | Default `2202` |
| `CITY_NAME` | Optional | Shown in the header |
| `CHAMBER_NAME` | Optional | Shown in the header |

If the SCM820 is unreachable at startup, the server automatically falls back to **simulation mode** (channels rotate through a mock active speaker every ~3 seconds).

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
3. **Names** — assign names and titles to each channel
4. **Connect** — connects to the audio source

The session persists across hot-reloads but resets on page refresh.

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

| Source | Description |
|---|---|
| **SCM820** | Shure IntelliMix SCM820 over TCP port 2202. Gate-open events drive speaker attribution. Falls back to simulation after 5 s if unreachable. |
| **Zoom** | Webhook-based. Receives `participant_joined`, `participant_left`, and `active_speaker` events from a Zoom App. |
| **Simulation** | Built-in mock that rotates the active speaker every ~3 seconds. Useful for development and testing without hardware. |

---

## Speaker Attribution

Transcription entries are attributed to the currently active speaker using:
1. The channel with its gate open (not muted) — primary signal from SCM820
2. Fallback: highest audio level among unmuted channels

---

## Production Deployment

For a real council chamber:

1. Connect a machine running this server to the same network as the SCM820
2. Route mixer output to **Dante Virtual Soundcard** on the server machine and set it as the default audio input — this is used by the server-side Azure SDK path if needed
3. Run the client on a dedicated display machine (or serve the React build statically)
4. Use the SCM820 source in the wizard

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
