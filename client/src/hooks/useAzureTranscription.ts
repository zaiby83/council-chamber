import { useCallback, useRef, useState } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const API_URL = `http://${window.location.hostname}:3001`;

interface Options {
  language: string;
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onStateChange: (running: boolean) => void;
}

export function useAzureTranscription({ language, onFinal, onInterim, onStateChange }: Options) {
  const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onStateRef = useRef(onStateChange);

  onFinalRef.current = onFinal;
  onInterimRef.current = onInterim;
  onStateRef.current = onStateChange;

  const start = useCallback(async () => {
    if (recognizerRef.current) return;
    setError('');

    // Fetch a short-lived token from the server (key never leaves the server)
    let token: string;
    let region: string;
    try {
      const res = await fetch(`${API_URL}/api/transcription/token`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to get Azure token from server');
        return;
      }
      token = data.token;
      region = data.region;
    } catch (e: any) {
      setError('Cannot reach server to get Azure token. Is the server running?');
      return;
    }

    try {
      // Validate BCP-47 tag (e.g. en-US, ur-PK, fil-PH)
      const safeLanguage = language && /^[a-z]{2,3}-[A-Z]{2,3}$/.test(language)
        ? language
        : 'en-US';
      console.log(`[AzureSpeech] connecting — language: "${safeLanguage}", region: "${region}"`);

      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = safeLanguage;
      speechConfig.setProfanity(sdk.ProfanityOption.Masked);

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      recognizer.recognizing = (_, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
          onInterimRef.current(e.result.text);
        }
      };

      recognizer.recognized = (_, e) => {
        if (
          e.result.reason === sdk.ResultReason.RecognizedSpeech &&
          e.result.text.trim()
        ) {
          onFinalRef.current(e.result.text.trim());
        }
      };

      recognizer.canceled = (_, e) => {
        if (e.reason === sdk.CancellationReason.Error) {
          setError(`Azure transcription error: ${e.errorDetails}`);
          console.error('[AzureSpeech] Canceled:', e.errorDetails);
        }
        recognizerRef.current = null;
        setRunning(false);
        onStateRef.current(false);
      };

      recognizer.startContinuousRecognitionAsync(
        () => {
          recognizerRef.current = recognizer;
          setRunning(true);
          onStateRef.current(true);
        },
        (err) => {
          setError(`Could not start Azure transcription: ${err}`);
          console.error('[AzureSpeech] Start error:', err);
          recognizer.close();
        }
      );
    } catch (e: any) {
      setError(`Azure SDK error: ${e.message}`);
    }
  }, [language]);

  const stop = useCallback(() => {
    const recognizer = recognizerRef.current;
    if (!recognizer) return;
    recognizerRef.current = null;
    recognizer.stopContinuousRecognitionAsync(
      () => {
        recognizer.close();
        setRunning(false);
        onStateRef.current(false);
      },
      (err) => {
        console.error('[AzureSpeech] Stop error:', err);
        recognizer.close();
        setRunning(false);
        onStateRef.current(false);
      }
    );
  }, []);

  return { start, stop, running, error };
}
