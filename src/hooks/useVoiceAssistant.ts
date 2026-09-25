/**
 * src/hooks/useVoiceAssistant.ts
 *
 * Full-lifecycle Voice Assistant hook for Project K.O.C.H.:
 *   1. Background wake-word listening ("Hey KOCH" / "Hey Coach") via client SpeechRecognition.
 *   2. Real-time PCM audio streaming to AssemblyAI WebSocket (with server token minting).
 *   3. Live interim and final transcript streaming on screen.
 *   4. AI response generation (Google Gemini / culturomics rule-engine) with lab intent execution.
 *   5. Browser Text-To-Speech (TTS) audio playback with mute controls.
 *   6. Seamless integration with active K.O.C.H. experiment state.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAssemblyAiToken, generateAssistantReply, type AssistantReplyResult } from '../server/functions/voice-assistant';
import { useKoch } from '../lib/mockState';
import { useVoiceSettings } from '../lib/voice-settings';
import {
  floatTo16BitPCM,
  playWakeChime,
  createAudioContext,
  computeRms,
  computeAudioLevels,
  simulateAudioLevels,
  defaultAudioLevels,
  getSpeechRecognitionCtor,
} from '../lib/audio-utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export type AssistantStatus =
  | 'IDLE'               // Voice assistant disabled
  | 'LISTENING_WAKEWORD' // Hands-free active, listening for "Hey KOCH"
  | 'HEARD_WAKEWORD'     // Wake word detected, initializing capture
  | 'LISTENING_SPEECH'   // Actively streaming speech to AssemblyAI
  | 'GENERATING_REPLY'   // AI is thinking & executing lab commands
  | 'SPEAKING'           // TTS is speaking the response aloud
  | 'ERROR';             // Error occurred

export interface VoiceAssistantState {
  status: AssistantStatus;
  isHandsFree: boolean;
  ttsMuted: boolean;
  currentTranscript: string;
  lastFinalTranscript: string;
  assistantReply: AssistantReplyResult | null;
  errorMessage: string | null;
  audioLevels: number[]; // 16 normalized values for animated waveform
  sttEngine: 'AssemblyAI' | 'WebSpeechFallback' | 'Ready';
}

const INITIAL_STATE: VoiceAssistantState = {
  status: 'IDLE',
  isHandsFree: false,
  ttsMuted: false,
  currentTranscript: '',
  lastFinalTranscript: '',
  assistantReply: null,
  errorMessage: null,
  audioLevels: defaultAudioLevels(),
  sttEngine: 'Ready',
};

// ─── Tuning Constants ───────────────────────────────────────────────────────

// Detect "hey koch", "hey coach" plus common ASR mishearings
const WAKE_WORD_PATTERN = /\b((hey|hi|ok|okay|yo)\s*)?(koch|kochs|coach|coke|kotch|kosh|cock|kok|croc)\b/i;

const CAPTURE_SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 4096; // ~256ms audio chunks
const SILENCE_TIMEOUT_MS = 2200;
const TOKEN_TIMEOUT_MS = 10000;
const WAKE_CHIME_DELAY_MS = 1500;   // give the operator time to react to the chime
const MANUAL_TALK_DELAY_MS = 150;
const WAKE_RESTART_DELAY_MS = 300;

const ERR_MIC_DENIED = 'Microphone access denied. Allow mic permission in your browser to use "Hey KOCH".';
const ERR_NO_MIC = 'No microphone found. Connect a mic and try again.';

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useVoiceAssistant() {
  const { state: kochState, markWell, emitVoiceUtterance } = useKoch();
  const setAutoWakeEnabled = useVoiceSettings((s) => s.setAutoWakeEnabled);

  const [state, setState] = useState<VoiceAssistantState>(INITIAL_STATE);

  // References to keep event listeners and cleanup stable
  const wakeRecognitionRef = useRef<any>(null);
  const fallbackRecognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTransitioningRef = useRef(false);
  const isWakeActiveRef = useRef(false);
  const finalTranscriptAccumulatorRef = useRef('');

  // ─── Microphone Permission ────────────────────────────────────────────────
  // Triggers the browser permission prompt. Tracks are released immediately;
  // the granted permission persists for SpeechRecognition & later capture.
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      console.warn('[VoiceAssistant] Microphone permission denied:', err);
      return false;
    }
  }, []);

  // ─── Shared State Helpers ─────────────────────────────────────────────────
  // Return to hands-free wake listening, or IDLE when hands-free is off.
  const settleStatus = useCallback(() => {
    setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
  }, []);

  // ─── Speak Reply via TTS ──────────────────────────────────────────────────
  const speakReply = useCallback((text: string) => {
    if (state.ttsMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      settleStatus();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select a clean English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')),
        ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setState((s) => ({ ...s, status: 'SPEAKING' }));
      };
      utterance.onend = settleStatus;
      utterance.onerror = settleStatus;

      window.speechSynthesis.speak(utterance);
    } catch {
      settleStatus();
    }
  }, [state.ttsMuted, settleStatus]);

  // ─── Process Final Transcript with AI Assistant ───────────────────────────
  const processFinalTranscript = useCallback(
    async (rawTranscript: string) => {
      const transcript = rawTranscript.trim();
      if (!transcript) {
        settleStatus();
        setState((s) => ({ ...s, currentTranscript: '' }));
        return;
      }

      setState((s) => ({
        ...s,
        status: 'GENERATING_REPLY',
        lastFinalTranscript: transcript,
        currentTranscript: transcript,
      }));

      // Update Koch in-memory state
      if (kochState.experiment) {
        emitVoiceUtterance(transcript);
      }

      try {
        const result = await generateAssistantReply({
          data: {
            transcript,
            experimentId: kochState.experiment?.id,
            plateLabel: kochState.plate?.label ?? 'Plate 4',
          },
        });

        // If intent was MARK_WELL, execute it in the frontend state
        if (result.intent.action === 'MARK_WELL_PENDING') {
          const coord = (result.intent.details as any)?.wellCoordinate;
          if (coord) {
            markWell(coord, 'colony_positive');
          }
        }

        setState((s) => ({
          ...s,
          assistantReply: result,
          currentTranscript: '',
        }));

        speakReply(result.replyText);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Assistant query failed';
        const fallbackReply: AssistantReplyResult = {
          replyText: `Recorded: "${transcript}". Ready for next command.`,
          source: 'rule-engine',
          intent: { action: 'TELEMETRY_LOG' },
        };
        setState((s) => ({
          ...s,
          assistantReply: fallbackReply,
          errorMessage: msg,
          currentTranscript: '',
        }));
        speakReply(fallbackReply.replyText);
      }
    },
    [kochState.experiment, kochState.plate, emitVoiceUtterance, markWell, speakReply, settleStatus],
  );

  // ─── Stop Audio Capture & WebSocket ───────────────────────────────────────
  const stopAudioStreaming = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ terminate_session: true }));
        } catch {}
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    if (fallbackRecognitionRef.current) {
      try {
        fallbackRecognitionRef.current.stop();
      } catch {}
      fallbackRecognitionRef.current = null;
    }

    setState((s) => ({ ...s, audioLevels: defaultAudioLevels() }));
  }, []);

  // ─── Web Speech API Fallback Capture ──────────────────────────────────────
  const startFallbackCapture = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      // No SpeechRecognition support — simulate a short capture so the
      // pipeline and HUD remain demonstrable (dev environments / Firefox).
      console.info('[VoiceAssistant] SpeechRecognition API not supported. Mocking voice capture...');
      setState((s) => ({
        ...s,
        status: 'LISTENING_SPEECH',
        sttEngine: 'WebSpeechFallback',
        currentTranscript: 'Mocking voice capture in 3s...',
      }));

      mockIntervalRef.current = setInterval(() => {
        setState((s) => ({ ...s, audioLevels: simulateAudioLevels() }));
      }, 100);

      silenceTimerRef.current = setTimeout(() => {
        stopAudioStreaming();
        processFinalTranscript('Mark plate 4 well C7 positive');
      }, 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setState((s) => ({
          ...s,
          status: 'LISTENING_SPEECH',
          sttEngine: 'WebSpeechFallback',
          currentTranscript: '',
        }));
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        setState((s) => ({
          ...s,
          currentTranscript: final || interim,
          audioLevels: simulateAudioLevels(),
        }));

        if (final) {
          finalTranscriptAccumulatorRef.current = final;
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[VoiceAssistant:Fallback] SpeechRecognition error:', e.error);
        if (finalTranscriptAccumulatorRef.current) {
          processFinalTranscript(finalTranscriptAccumulatorRef.current);
        } else {
          settleStatus();
        }
      };

      recognition.onend = () => {
        const text = finalTranscriptAccumulatorRef.current;
        finalTranscriptAccumulatorRef.current = '';
        stopAudioStreaming();
        if (text) {
          processFinalTranscript(text);
        } else {
          settleStatus();
        }
      };

      fallbackRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.warn('[VoiceAssistant:Fallback] Could not start speech recognition:', err);
      settleStatus();
    }
  }, [processFinalTranscript, stopAudioStreaming, settleStatus]);

  // ─── AssemblyAI Real-Time WebSocket Streaming ─────────────────────────────
  const startSpeechCapture = useCallback(async () => {
    isTransitioningRef.current = true;
    finalTranscriptAccumulatorRef.current = '';

    // Step 1: Request microphone stream (prompts if not yet granted)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: CAPTURE_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: unknown) {
      console.warn('[VoiceAssistant] Microphone access denied or unavailable:', err);
      setState((s) => ({
        ...s,
        status: 'ERROR',
        errorMessage: ERR_MIC_DENIED,
      }));
      isTransitioningRef.current = false;
      return;
    }

    // Step 2: Mint an AssemblyAI temporary token (with timeout guard)
    let tokenResult;
    try {
      tokenResult = await Promise.race([
        getAssemblyAiToken({ data: {} }),
        new Promise<{ token: null; configured: false }>((resolve) =>
          setTimeout(() => resolve({ token: null, configured: false }), TOKEN_TIMEOUT_MS),
        ),
      ]);
    } catch {
      tokenResult = { token: null, configured: false };
    }

    // Fallback if AssemblyAI is not configured or token minting failed
    if (!tokenResult.configured || !tokenResult.token) {
      console.info('[VoiceAssistant] AssemblyAI not configured, falling back to Web Speech API');
      startFallbackCapture();
      isTransitioningRef.current = false;
      return;
    }

    // Step 3: Connect to the AssemblyAI Real-Time WebSocket
    try {
      const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${CAPTURE_SAMPLE_RATE}&token=${tokenResult.token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          console.info('[VoiceAssistant] Silence timeout triggered, finalizing utterance.');
          stopAudioStreaming();
          const finalUtterance = finalTranscriptAccumulatorRef.current;
          finalTranscriptAccumulatorRef.current = '';
          processFinalTranscript(finalUtterance);
        }, SILENCE_TIMEOUT_MS);
      };

      ws.onopen = () => {
        setState((s) => ({
          ...s,
          status: 'LISTENING_SPEECH',
          sttEngine: 'AssemblyAI',
          currentTranscript: '',
        }));

        // Web Audio graph: mic -> ScriptProcessor -> PCM -> ws (silent sink)
        const audioCtx = audioContextRef.current || createAudioContext(CAPTURE_SAMPLE_RATE);
        if (!audioCtx) return;
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
        processorNodeRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);

          // RMS drives the animated waveform
          const levels = computeAudioLevels(computeRms(inputData));
          setState((s) => ({ ...s, audioLevels: levels }));

          try {
            ws.send(floatTo16BitPCM(inputData));
          } catch {}
        };

        source.connect(processor);
        // Keep the ScriptProcessor graph alive via a silent sink so mic audio
        // is not played back through the speakers (prevents echo feedback)
        const silentSink = audioCtx.createGain();
        silentSink.gain.value = 0;
        processor.connect(silentSink);
        silentSink.connect(audioCtx.destination);
        resetSilenceTimer();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message_type === 'PartialTranscript' && data.text) {
            setState((s) => ({ ...s, currentTranscript: data.text }));
            resetSilenceTimer();
          } else if (data.message_type === 'FinalTranscript' && data.text) {
            finalTranscriptAccumulatorRef.current =
              (finalTranscriptAccumulatorRef.current ? `${finalTranscriptAccumulatorRef.current} ` : '') + data.text;
            setState((s) => ({ ...s, currentTranscript: finalTranscriptAccumulatorRef.current }));
            resetSilenceTimer();
          }
        } catch (e) {
          console.warn('[VoiceAssistant:WS] Error parsing message:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[VoiceAssistant:WS] WebSocket error, falling back to Web Speech:', err);
        stopAudioStreaming();
        startFallbackCapture();
      };
    } catch (err: unknown) {
      console.warn('[VoiceAssistant] Failed to initiate AssemblyAI connection:', err);
      startFallbackCapture();
    } finally {
      isTransitioningRef.current = false;
    }
  }, [processFinalTranscript, startFallbackCapture, stopAudioStreaming]);

  // ─── Shared Capture Entry (chime + pause wake + delayed start) ────────────
  const beginCaptureFlow = useCallback(
    (promptText: string, delayMs: number) => {
      if (isTransitioningRef.current) return;
      playWakeChime();
      setState((s) => ({
        ...s,
        status: 'HEARD_WAKEWORD',
        errorMessage: null,
        currentTranscript: promptText,
      }));

      // Pause wake recognition while streaming user speech
      if (wakeRecognitionRef.current) {
        isWakeActiveRef.current = false;
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
      }

      setTimeout(() => {
        startSpeechCapture();
      }, delayMs);
    },
    [startSpeechCapture],
  );

  // ─── Wake-Word Detection Loop ─────────────────────────────────────────────
  const triggerWakeWordWakeup = useCallback(() => {
    beginCaptureFlow('🎙️ Speak your command now…', WAKE_CHIME_DELAY_MS);
  }, [beginCaptureFlow]);

  const startWakeWordRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    try {
      // Guard against overlapping recognition instances (browser mic conflicts)
      if (isWakeActiveRef.current && wakeRecognitionRef.current) return;

      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
        wakeRecognitionRef.current = null;
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      isWakeActiveRef.current = true;

      recognition.onstart = () => {
        setState((s) => ({
          ...s,
          status: 'LISTENING_WAKEWORD',
          errorMessage: null,
        }));
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const phrase = (event.results[i][0].transcript || '').toLowerCase();
          if (WAKE_WORD_PATTERN.test(phrase)) {
            console.info('[VoiceAssistant] Wake-word detected:', phrase);
            triggerWakeWordWakeup();
            return;
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          isWakeActiveRef.current = false;
          setState((s) => ({
            ...s,
            status: 'ERROR',
            errorMessage: ERR_MIC_DENIED,
          }));
        } else if (e.error === 'audio-capture') {
          isWakeActiveRef.current = false;
          setState((s) => ({
            ...s,
            status: 'ERROR',
            errorMessage: ERR_NO_MIC,
          }));
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[VoiceAssistant:WakeWord] Speech recognition event:', e.error);
        }
      };

      recognition.onend = () => {
        // Automatically keep alive if hands-free is enabled and we are not in active speech capture
        setState((current) => {
          if (
            current.isHandsFree &&
            current.status === 'LISTENING_WAKEWORD' &&
            isWakeActiveRef.current &&
            wakeRecognitionRef.current === recognition
          ) {
            setTimeout(() => {
              if (isWakeActiveRef.current && wakeRecognitionRef.current === recognition) {
                try {
                  recognition.start();
                } catch {}
              }
            }, WAKE_RESTART_DELAY_MS);
          }
          return current;
        });
      };

      wakeRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      isWakeActiveRef.current = false;
      console.warn('[VoiceAssistant] Wake word recognition init error:', err);
    }
  }, [triggerWakeWordWakeup]);

  // ─── Hands-Free Enable / Disable ──────────────────────────────────────────
  const enableHandsFree = useCallback(async (): Promise<boolean> => {
    // Explicitly trigger the browser mic permission prompt before wake listening
    const granted = await requestMicPermission();
    if (!granted) {
      setState((s) => ({
        ...s,
        status: 'ERROR',
        errorMessage: ERR_MIC_DENIED,
      }));
      return false;
    }
    setState((s) => ({
      ...s,
      isHandsFree: true,
      status: 'LISTENING_WAKEWORD',
      errorMessage: null,
    }));
    return true;
  }, [requestMicPermission]);

  const disableHandsFree = useCallback(() => {
    stopAudioStreaming();
    isWakeActiveRef.current = false;
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.stop();
      } catch {}
      wakeRecognitionRef.current = null;
    }
    setState((s) => ({
      ...s,
      isHandsFree: false,
      status: 'IDLE',
      currentTranscript: '',
      errorMessage: null,
    }));
  }, [stopAudioStreaming]);

  // ─── Toggle Hands-Free Listening ──────────────────────────────────────────
  const toggleHandsFree = useCallback(async () => {
    const next = !state.isHandsFree;
    setAutoWakeEnabled(next); // persist the user's wake preference to localStorage
    if (next) {
      await enableHandsFree();
    } else {
      disableHandsFree();
    }
  }, [state.isHandsFree, setAutoWakeEnabled, enableHandsFree, disableHandsFree]);

  // ─── Manual Push-To-Talk Trigger ──────────────────────────────────────────
  const triggerManualTalk = useCallback(() => {
    if (state.status === 'LISTENING_SPEECH') {
      // User tapped the button to finish talking early
      stopAudioStreaming();
      const text = finalTranscriptAccumulatorRef.current || state.currentTranscript;
      finalTranscriptAccumulatorRef.current = '';
      processFinalTranscript(text);
      return;
    }

    // User tapped the button to start talking.
    // Create/resume the AudioContext on this user gesture to prevent suspension.
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext(CAPTURE_SAMPLE_RATE);
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    beginCaptureFlow('Listening…', MANUAL_TALK_DELAY_MS);
  }, [state.status, state.currentTranscript, stopAudioStreaming, processFinalTranscript, beginCaptureFlow]);

  // ─── Toggle TTS Audio Mute ────────────────────────────────────────────────
  const toggleTtsMute = useCallback(() => {
    setState((s) => {
      if (!s.ttsMuted && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return { ...s, ttsMuted: !s.ttsMuted };
    });
  }, []);

  // ─── Dismiss / Clear HUD ──────────────────────────────────────────────────
  const dismissAssistant = useCallback(() => {
    stopAudioStreaming();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState((s) => ({
      ...s,
      status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE',
      currentTranscript: '',
      assistantReply: null,
      errorMessage: null,
    }));
  }, [stopAudioStreaming]);

  // ─── Lifecycle Sync ───────────────────────────────────────────────────────
  // Auto-enable hands-free wake listening on page load from the persisted
  // preference (zustand rehydrates localStorage synchronously before mount).
  useEffect(() => {
    if (useVoiceSettings.getState().autoWakeEnabled) {
      enableHandsFree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.isHandsFree && state.status === 'LISTENING_WAKEWORD') {
      startWakeWordRecognition();
    }
  }, [state.isHandsFree, state.status, startWakeWordRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioStreaming();
      isWakeActiveRef.current = false;
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopAudioStreaming]);

  return {
    state,
    toggleHandsFree,
    triggerManualTalk,
    toggleTtsMute,
    dismissAssistant,
    processFinalTranscript,
  };
}
