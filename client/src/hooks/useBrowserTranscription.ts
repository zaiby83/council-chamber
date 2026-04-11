import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  language: string;
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onStateChange: (running: boolean) => void;
}

export function useBrowserTranscription({ language, onFinal, onInterim, onStateChange }: Options) {
  const recognitionRef = useRef<any>(null);
  const [running, setRunning] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState('');
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onStateRef = useRef(onStateChange);

  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { onStateRef.current = onStateChange; }, [onStateChange]);

  useEffect(() => {
    setSupported(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
  }, []);

  const stopInternal = useCallback((clearRef = true) => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch {}
      if (clearRef) recognitionRef.current = null;
    }
    setRunning(false);
    onStateRef.current(false);
  }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    if (recognitionRef.current) return; // already running

    setError('');

    const recognition = new SR();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          onFinalRef.current(event.results[i][0].transcript.trim());
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (interim) onInterimRef.current(interim.trim());
    };

    recognition.onend = () => {
      // Auto-restart only if we're still supposed to be running
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (e: any) => {
      console.error('[BrowserSpeech] error:', e.error);
      // Clear ref before onend fires so auto-restart doesn't loop
      recognitionRef.current = null;
      recognition.onend = null;

      let msg = '';
      switch (e.error) {
        case 'not-allowed':
          msg = 'Microphone access denied. Click the camera/mic icon in the address bar and set it to Allow, then refresh.';
          break;
        case 'service-not-allowed':
          msg = 'Chrome speech service blocked (error: service-not-allowed). This usually means Chrome cannot reach Google\'s speech servers, or a browser policy is blocking it. Try: disable VPN, check chrome://settings/content/microphone, or use a different network.';
          break;
        case 'network':
          msg = 'Network error — Chrome speech recognition requires an internet connection to Google\'s servers.';
          break;
        case 'language-not-supported':
          msg = `Language "${language}" is not supported by the browser. Switch to English (US) and try again.`;
          break;
        case 'no-speech':
        case 'aborted':
          // Transient — silently restart
          if (recognitionRef.current === null) {
            try { recognition.start(); recognitionRef.current = recognition; } catch {}
          }
          return;
        default:
          msg = `Speech recognition error: ${e.error}`;
      }

      if (msg) {
        setError(msg);
        setRunning(false);
        onStateRef.current(false);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setRunning(true);
      onStateRef.current(true);
    } catch (e: any) {
      setError(`Could not start speech recognition: ${e.message}`);
    }
  }, [language, running, stopInternal]);

  const stop = useCallback(() => {
    stopInternal(true);
  }, [stopInternal]);

  return { start, stop, running, supported, error };
}
