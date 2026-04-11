import { useCallback, useEffect, useRef, useState } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { MeetingHeader } from './components/MeetingHeader';
import { MixerPanel } from './components/MixerPanel';
import { TranscriptPanel, TranscriptEntry } from './components/TranscriptPanel';
import { SetupWizard } from './components/setup/SetupWizard';
import { useWebSocket } from './hooks/useWebSocket';
import { useBrowserTranscription } from './hooks/useBrowserTranscription';
import { useAzureTranscription } from './hooks/useAzureTranscription';

const WS_URL = `ws://${window.location.hostname}:3001`;
const API_URL = `http://${window.location.hostname}:3001`;

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

const SESSION_KEY = 'cc_session_active';

export default function App() {
  const styles = useStyles();
  const { lastMessage, send } = useWebSocket(WS_URL);

  const [setupDone, setSetupDone] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true'
  );

  const [cityName, setCityName] = useState('City of Fairfield');
  const [chamberName, setChamberName] = useState('Council Chamber');
  const [channels, setChannels] = useState<ChannelState[]>([]);
  const [mixerConnected, setMixerConnected] = useState(false);
  const [transcriptionRunning, setTranscriptionRunning] = useState(false);
  const [transcriptionPaused, setTranscriptionPaused] = useState(false);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [interimSpeaker, setInterimSpeaker] = useState('');
  const entryCounter = useRef(0);

  // Language and provider — read from sessionStorage, kept as state so the
  // language dropdown in the toolbar can update them live.
  const [language, setLanguage] = useState(
    () => sessionStorage.getItem('cc_language') || 'en-US'
  );
  const provider = (sessionStorage.getItem('cc_transcription_provider') || 'browser') as 'browser' | 'azure';

  // Keep a live ref to channels so browser transcription callbacks can attribute speaker
  const channelsRef = useRef<ChannelState[]>([]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);

  const getActiveSpeaker = useCallback((): { speaker: string; speakerTitle: string } => {
    const active = channelsRef.current.find((c) => c.gateOpen && !c.muted);
    if (active) return { speaker: active.name, speakerTitle: active.title };
    const byLevel = [...channelsRef.current]
      .filter((c) => !c.muted)
      .sort((a, b) => b.level - a.level);
    if (byLevel[0]) return { speaker: byLevel[0].name, speakerTitle: byLevel[0].title };
    return { speaker: 'Unknown', speakerTitle: '' };
  }, []);

  const onFinal = useCallback((text: string) => {
    const { speaker, speakerTitle } = getActiveSpeaker();
    send('transcript:submit', { text, speaker, speakerTitle, timestamp: new Date().toISOString() });
  }, [getActiveSpeaker, send]);

  const onInterim = useCallback((text: string) => {
    const { speaker } = getActiveSpeaker();
    send('transcript:interim:submit', { text, speaker });
  }, [getActiveSpeaker, send]);

  const onStateChange = useCallback((running: boolean) => {
    setTranscriptionRunning(running);
  }, []);

  const browserTranscription = useBrowserTranscription({
    language, onFinal, onInterim, onStateChange,
  });

  const azureTranscription = useAzureTranscription({
    language, onFinal, onInterim, onStateChange,
  });

  const transcription = provider === 'azure' ? azureTranscription : browserTranscription;

  const handleSetupComplete = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    // Sync language state from whatever the wizard saved
    const savedLang = sessionStorage.getItem('cc_language');
    if (savedLang) setLanguage(savedLang);
    setSetupDone(true);
  };

  const handleNewMeeting = () => {
    if (transcriptionRunning) transcription.stop();
    sessionStorage.removeItem(SESSION_KEY);
    setTranscriptEntries([]);
    setInterimText('');
    setInterimSpeaker('');
    setTranscriptionPaused(false);
    setSetupDone(false);
  };

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    const { type, payload } = lastMessage;

    switch (type) {
      case 'init':
        setChannels(payload.channels ?? []);
        setTranscriptionRunning(payload.transcriptionRunning ?? false);
        setMixerConnected(payload.channels?.length > 0);
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
        setTranscriptionPaused(false);
        break;

      case 'transcription:stopped':
        setTranscriptionRunning(false);
        setTranscriptionPaused(false);
        setInterimText('');
        setInterimSpeaker('');
        break;

      case 'members:updated':
        setChannels((prev) =>
          prev.map((c) => {
            const m = payload[c.channel];
            return m ? { ...c, name: m.name, title: m.title } : c;
          })
        );
        break;
    }
  }, [lastMessage]);

  const handleMuteToggle = useCallback((channel: number, muted: boolean) => {
    send('mute', { channel, muted });
    setChannels((prev) =>
      prev.map((c) => (c.channel === channel ? { ...c, muted } : c))
    );
  }, [send]);

  const handleStartTranscription = useCallback(() => {
    setTranscriptionPaused(false);
    transcription.start();
  }, [transcription]);

  const handlePauseTranscription = useCallback(() => {
    setTranscriptionPaused(true);
    setInterimText('');
    setInterimSpeaker('');
    transcription.stop();
  }, [transcription]);

  const handleResumeTranscription = useCallback(() => {
    setTranscriptionPaused(false);
    transcription.start();
  }, [transcription]);

  const handleStopTranscription = useCallback(() => {
    setTranscriptionPaused(false);
    transcription.stop();
  }, [transcription]);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    sessionStorage.setItem('cc_language', lang);
    if (transcriptionRunning && !transcriptionPaused) {
      transcription.stop();
      setTimeout(() => transcription.start(), 100);
    }
  }, [transcriptionRunning, transcriptionPaused, transcription]);

  const handleSaveMembers = useCallback(async (
    updated: Record<number, { name: string; title: string }>
  ) => {
    const res = await fetch(`${API_URL}/api/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Failed to save members');
  }, []);

  return (
    <>
      {!setupDone && <SetupWizard onComplete={handleSetupComplete} />}

      <div className={styles.root}>
        <MeetingHeader
          cityName={cityName}
          chamberName={chamberName}
          transcriptionRunning={transcriptionRunning}
          mixerConnected={mixerConnected}
          onNewMeeting={handleNewMeeting}
        />
        <div className={styles.body}>
          <div className={styles.mixer}>
            <MixerPanel
              channels={channels}
              mixerConnected={mixerConnected}
              onMuteToggle={handleMuteToggle}
              onSaveMembers={handleSaveMembers}
            />
          </div>
          <div className={styles.transcript}>
            <TranscriptPanel
              entries={transcriptEntries}
              interimText={interimText}
              interimSpeaker={interimSpeaker}
              running={transcriptionRunning}
              paused={transcriptionPaused}
              language={language}
              supported={provider === 'azure' ? true : browserTranscription.supported}
              micError={transcription.error}
              onStart={handleStartTranscription}
              onPause={handlePauseTranscription}
              onResume={handleResumeTranscription}
              onStop={handleStopTranscription}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}
