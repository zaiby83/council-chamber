# Council Chamber Client

React + TypeScript client for the Council Chamber live transcription dashboard.

## Tech Stack

- **React 19** with TypeScript
- **Fluent UI v9** for Microsoft Teams-style interface
- **Web Speech API** for browser-based transcription
- **Azure Cognitive Speech SDK** for multi-language transcription
- **WebSocket** for real-time updates from the server

## Development

```bash
npm start
```

Runs the app at [http://localhost:3000](http://localhost:3000) with hot reload enabled.

The client proxies API requests to `http://localhost:3001` (configured in `package.json`).

## Build

```bash
npm run build
```

Creates an optimized production build in the `build/` folder.

## Key Components

- **App.tsx** — Root component, manages WebSocket connection and transcription state
- **SetupWizard** — Multi-step configuration flow for source, transcription, and channel names
- **MixerPanel** — 8-channel grid showing gate status, mute controls, and audio levels
- **TranscriptPanel** — Live scrolling transcript with pause/resume and speaker attribution
- **MeetingHeader** — Title bar with connection status badges

## Hooks

- **useWebSocket** — Auto-reconnecting WebSocket with event handlers
- **useBrowserTranscription** — Web Speech API integration (Chrome/Edge only)
- **useAzureTranscription** — Azure Speech SDK with token-based authentication

## Browser Compatibility

- **Chrome/Edge**: Full support (Web Speech API + Azure SDK)
- **Firefox**: Azure SDK only (no Web Speech API)
- **Safari**: Limited support (use Azure transcription)

## Environment

The client uses the server's configuration via API calls. No client-side environment variables are required.
