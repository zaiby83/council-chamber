/**
 * Azure Cognitive Speech - Live Transcription
 *
 * Uses Azure Speech SDK to transcribe audio from the system default mic
 * (or Dante Virtual Soundcard routed input) in real time.
 *
 * Prerequisites:
 *   - Install Dante Virtual Soundcard on this machine
 *   - In Dante Controller, route mixer output channels to the virtual soundcard
 *   - Set the virtual soundcard as the Windows/Mac default audio input
 *   - Azure Speech resource key + region in .env
 */

const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { EventEmitter } = require('events');
const config = require('../config');

class AzureSpeechTranscriber extends EventEmitter {
  constructor() {
    super();
    this.recognizer = null;
    this.running = false;
    this.currentSpeaker = null;
  }

  start(activeChannelResolver, language = 'en-US') {
    if (this.running) return;

    if (!config.azure.speechKey) {
      console.warn('[Speech] No AZURE_SPEECH_KEY set — transcription disabled');
      return;
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(
      config.azure.speechKey,
      config.azure.speechRegion
    );
    speechConfig.speechRecognitionLanguage = language;

    // Enable profanity masking for public meetings
    speechConfig.setProfanity(sdk.ProfanityOption.Masked);

    // Server-side mic only works with Dante Virtual Soundcard in production.
    // In development, use the browser-based Azure transcription instead.
    let audioConfig;
    try {
      audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    } catch (err) {
      console.error('[Speech] Cannot open microphone on server — use browser-based transcription:', err.message);
      return;
    }

    this.recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // Interim results — shown while person is still speaking
    this.recognizer.recognizing = (_, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
        const active = activeChannelResolver ? activeChannelResolver() : null;
        this.emit('interim', {
          text: e.result.text,
          speaker: active ? active.name : 'Unknown',
          speakerTitle: active ? active.title : '',
          timestamp: new Date().toISOString(),
          isFinal: false,
        });
      }
    };

    // Final results — committed to transcript
    this.recognizer.recognized = (_, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text.trim()) {
        const active = activeChannelResolver ? activeChannelResolver() : null;
        const entry = {
          id: Date.now().toString(),
          text: e.result.text,
          speaker: active ? active.name : 'Unknown',
          speakerTitle: active ? active.title : '',
          timestamp: new Date().toISOString(),
          isFinal: true,
        };
        console.log(`[Speech] ${entry.speaker}: ${entry.text}`);
        this.emit('transcript', entry);
      }
    };

    this.recognizer.canceled = (_, e) => {
      console.error('[Speech] Canceled:', e.errorDetails);
      this.emit('error', new Error(e.errorDetails));
      this.running = false;
    };

    this.recognizer.sessionStopped = () => {
      this.running = false;
      this.emit('stopped');
    };

    this.recognizer.startContinuousRecognitionAsync(
      () => {
        this.running = true;
        console.log('[Speech] Continuous transcription started');
        this.emit('started');
      },
      (err) => {
        console.error('[Speech] Start error:', err);
        this.emit('error', new Error(err));
      }
    );
  }

  stop() {
    if (!this.recognizer || !this.running) return;
    this.recognizer.stopContinuousRecognitionAsync(
      () => {
        this.running = false;
        this.recognizer.close();
        this.recognizer = null;
        console.log('[Speech] Transcription stopped');
      },
      (err) => console.error('[Speech] Stop error:', err)
    );
  }

  isRunning() {
    return this.running;
  }
}

module.exports = new AzureSpeechTranscriber();
