import { useCallback, useEffect, useRef, useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { MeetingHeader } from './components/MeetingHeader';
import { MixerPanel } from './components/MixerPanel';
import { TranscriptPanel, TranscriptEntry } from './components/TranscriptPanel';
import { useWebSocket } from './hooks/useWebSocket';

const WS_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3001';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  body: {
    display: 'flex',
    flex: 1,
    gap: '12px',
    padding: '12px',
    overflow: 'hidden',
  },
  mixer: {
    flex: '0 0 420px',
    overflow: 'hidden',
  },
  transcript: {
    flex: 1,
    overflow: 'hidden',
  },
});

interface ChannelState {
  channel: number;
  name: string;
  title: string;
  muted: boolean;
  gateOpen: boolean;
  level: number;
  active: boolean;
}

export default function App() {
  const styles = useStyles();
  const { lastMessage, send } = useWebSocket(WS_URL);

  const [cityName, setCityName] = useState('City of Fairfield');
  const [chamberName, setChamberName] = useState('Council Chamber');
  const [channels, setChannels] = useState<ChannelState[]>([]);
  const [mixerConnected, setMixerConnected] = useState(false);
  const [transcriptionRunning, setTranscriptionRunning] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [interimSpeaker, setInterimSpeaker] = useState('');
  const entryCounter = useRef(0);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    const { type, payload } = lastMessage;

    switch (type) {
      case 'init':
        setChannels(payload.channels ?? []);
        setTranscriptionRunning(payload.transcriptionRunning ?? false);
        if (payload.meeting) {
          setCityName(payload.meeting.cityName);
          setChamberName(payload.meeting.chamberName);
        }
        break;

      case 'mixer:connected':
        setMixerConnected(true);
        break;

      case 'mixer:disconnected':
        setMixerConnected(false);
        break;

      case 'channel:update':
        setChannels((prev) => {
          const next = [...prev];
          const idx = next.findIndex((c) => c.channel === payload.channel);
          if (idx >= 0) next[idx] = payload;
          else next.push(payload);
          return next;
        });
        break;

      case 'transcript:final':
        entryCounter.current += 1;
        setTranscriptEntries((prev) => [
          ...prev,
          {
            id: `entry-${entryCounter.current}`,
            text: payload.text,
            speaker: payload.speaker ?? 'Unknown',
            speakerTitle: payload.speakerTitle ?? '',
            timestamp: lastMessage.ts,
            isFinal: true,
          },
        ]);
        setInterimText('');
        setInterimSpeaker('');
        break;

      case 'transcript:interim':
        setInterimText(payload.text ?? '');
        setInterimSpeaker(payload.speaker ?? '');
        break;

      case 'transcription:started':
        setTranscriptionRunning(true);
        break;

      case 'transcription:stopped':
        setTranscriptionRunning(false);
        setInterimText('');
        setInterimSpeaker('');
        break;
    }
  }, [lastMessage]);

  const handleMuteToggle = useCallback((channel: number, muted: boolean) => {
    send('mute', { channel, muted });
    // Optimistic update
    setChannels((prev) =>
      prev.map((c) => (c.channel === channel ? { ...c, muted } : c))
    );
  }, [send]);

  const handleStartTranscription = useCallback(async () => {
    await fetch(`${API_URL}/api/transcription/start`, { method: 'POST' });
  }, []);

  const handleStopTranscription = useCallback(async () => {
    await fetch(`${API_URL}/api/transcription/stop`, { method: 'POST' });
  }, []);

  return (
    <div className={styles.root}>
      <MeetingHeader
        cityName={cityName}
        chamberName={chamberName}
        transcriptionRunning={transcriptionRunning}
        mixerConnected={mixerConnected}
      />
      <div className={styles.body}>
        <div className={styles.mixer}>
          <MixerPanel
            channels={channels}
            mixerConnected={mixerConnected}
            onMuteToggle={handleMuteToggle}
          />
        </div>
        <div className={styles.transcript}>
          <TranscriptPanel
            entries={transcriptEntries}
            interimText={interimText}
            interimSpeaker={interimSpeaker}
            running={transcriptionRunning}
            onStart={handleStartTranscription}
            onStop={handleStopTranscription}
          />
        </div>
      </div>
    </div>
  );
}
