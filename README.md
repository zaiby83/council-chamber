# Council Chamber

Real-time audio monitoring and live transcription dashboard for city council chambers.

Built for the **City of Fairfield** — connects to a Shure SCM820 IntelliMix automatic mixer over TCP, displays live mic gate/mute status for all 8 channels, and streams ADA-compliant transcription via Azure Cognitive Speech.

---

## Architecture

```
┌─────────────────────┐        TCP :2202       ┌──────────────────┐
│   React Dashboard   │◄──── WebSocket ────────►│   Node Server    │◄──────► Shure SCM820
│  (Fluent UI v9)     │      ws://...3001        │  Express + WS    │
└─────────────────────┘                          │                  │◄──────► Azure Speech SDK
                                                 │                  │         (Dante audio in)
                                                 └──────────────────┘
```

- **Server** (`server/`) — Node.js, Express REST + WebSocket, polls the SCM820 every 200 ms
- **Client** (`client/`) — React 19, Fluent UI v9, auto-reconnecting WebSocket hook

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | Both client and server |
| Shure SCM820 | On the same network, TCP port 2202 open |
| Dante Virtual Soundcard | Routes mixer output to this machine's audio input |
| Azure Cognitive Speech resource | Key + region required for transcription |

---

## Setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env   # fill in your values
npm run dev
```

**.env variables:**

```
SHURE_IP=192.168.1.100
SHURE_PORT=2202
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=westus2
PORT=3001
CITY_NAME=City of Fairfield
CHAMBER_NAME=Council Chamber
```

### 2. Client

```bash
cd client
npm install
npm start
```

Opens at `http://localhost:3000`. Proxies API and WebSocket calls to `localhost:3001`.

---

## Development (no physical mixer)

The server automatically falls back to simulation mode if the SCM820 is unreachable within 5 seconds. You can also trigger it manually:

```bash
curl -X POST http://localhost:3001/api/simulate
```

Simulation rotates the active channel every ~3 seconds across all 8 channels.

---

## Channel / Council Member Mapping

Edit `server/config.js` to update names and titles:

```js
councilMembers: {
  1: { name: 'Mayor Catherine Moy',           title: 'Mayor' },
  2: { name: 'Vice Mayor Manny Cardenas',      title: 'Vice Mayor' },
  3: { name: 'Council Member Rick Vaccaro',    title: 'Council Member' },
  4: { name: 'Council Member Harry Price',     title: 'Council Member' },
  5: { name: 'Council Member Nico Nava',       title: 'Council Member' },
  6: { name: 'City Manager',                   title: 'City Manager' },
  7: { name: 'City Attorney',                  title: 'City Attorney' },
  8: { name: 'City Clerk',                     title: 'City Clerk' },
}
```

Names are synced to the mixer's channel labels on connect (max 31 characters).

---

## REST API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/meeting` | Meeting info + council member list |
| `GET` | `/api/channels` | All 8 channel states |
| `GET` | `/api/channels/:ch` | Single channel state |
| `POST` | `/api/channels/:ch/mute` | `{ muted: true\|false }` |
| `POST` | `/api/transcription/start` | Start Azure Speech |
| `POST` | `/api/transcription/stop` | Stop Azure Speech |
| `POST` | `/api/simulate` | Force simulation mode |

## WebSocket Messages

All messages: `{ type, payload, ts }`

| Type | Direction | Description |
|---|---|---|
| `init` | server → client | Full state on connect |
| `mixer:connected` | server → client | SCM820 came online |
| `mixer:disconnected` | server → client | SCM820 went offline |
| `channel:update` | server → client | Single channel state changed |
| `transcript:final` | server → client | Committed transcript entry |
| `transcript:interim` | server → client | In-progress speech (italic) |
| `transcription:started` | server → client | Recording began |
| `transcription:stopped` | server → client | Recording ended |
| `mute` | client → server | `{ channel, muted }` mute command |
