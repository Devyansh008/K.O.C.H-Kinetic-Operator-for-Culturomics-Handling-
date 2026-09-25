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

// Convert Float32Array to 16-bit mono PCM for AssemblyAI WebSocket
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

// Play pleasant two-tone wake-up chime via Web Audio API
function playWakeChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.14, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.28);
  } catch (e) {
    // AudioContext autoplay restrictions are ignored safely
  }
}

export function useVoiceAssistant() {
  const { state: kochState, dispatch, markWell, emitVoiceUtterance } = useKoch();

  const [state, setState] = useState<VoiceAssistantState>({
    status: 'IDLE',
    isHandsFree: false,
    ttsMuted: false,
    currentTranscript: '',
    lastFinalTranscript: '',
    assistantReply: null,
    errorMessage: null,
    audioLevels: Array(16).fill(4),
    sttEngine: 'Ready',
  });

  // References to keep event listeners and cleanup stable
  const wakeRecognitionRef = useRef<any>(null);
  const fallbackRecognitionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);
  const finalTranscriptAccumulatorRef = useRef('');

  // ─── Speak Reply via TTS ──────────────────────────────────────────────────
  const speakReply = useCallback((text: string) => {
    if (state.ttsMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select a clean English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => (v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setState((s) => ({ ...s, status: 'SPEAKING' }));
      };

      utterance.onend = () => {
        setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
      };

      utterance.onerror = () => {
        setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
    }
  }, [state.ttsMuted]);

  // ─── Process Final Transcript with AI Assistant ────────────────────────────
  const processFinalTranscript = useCallback(
    async (rawTranscript: string) => {
      const transcript = rawTranscript.trim();
      if (!transcript) {
        setState((s) => ({
          ...s,
          status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE',
          currentTranscript: '',
        }));
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

        // Speak aloud
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
    [kochState.experiment, kochState.plate, emitVoiceUtterance, markWell, speakReply],
  );

  // ─── Stop Audio Capture & WebSocket ───────────────────────────────────────
  const stopAudioStreaming = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
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

    // Reset audio levels
    setState((s) => ({ ...s, audioLevels: Array(16).fill(4) }));
  }, []);

  // ─── Start Web Speech API Fallback Capture ─────────────────────────────────
  const startFallbackCapture = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.info('[VoiceAssistant] SpeechRecognition API not supported. Mocking voice capture...');
      setState((s) => ({
        ...s,
        status: 'LISTENING_SPEECH',
        sttEngine: 'WebSpeechFallback',
        currentTranscript: 'Mocking voice capture in 3s...',
      }));
      // Simulate audio levels for visual feedback
      const mockInterval = setInterval(() => {
        setState((s) => ({
          ...s,
          audioLevels: Array.from({ length: 16 }, () => 8 + Math.random() * 24),
        }));
      }, 100);
      
      setTimeout(() => {
        clearInterval(mockInterval);
        stopAudioStreaming();
        processFinalTranscript('Mark plate 4 well C7 positive');
      }, 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
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

        const display = final || interim;
        setState((s) => ({
          ...s,
          currentTranscript: display,
          // Generate active waveform animations
          audioLevels: Array.from({ length: 16 }, () => 8 + Math.random() * 24),
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
          setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
        }
      };

      recognition.onend = () => {
        const text = finalTranscriptAccumulatorRef.current;
        finalTranscriptAccumulatorRef.current = '';
        stopAudioStreaming();
        if (text) {
          processFinalTranscript(text);
        } else {
          setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
        }
      };

      fallbackRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.warn('[VoiceAssistant:Fallback] Could not start speech recognition:', err);
      setState((s) => ({ ...s, status: s.isHandsFree ? 'LISTENING_WAKEWORD' : 'IDLE' }));
    }
  }, [processFinalTranscript, stopAudioStreaming]);

  // ─── Start AssemblyAI Real-Time WebSocket Streaming ────────────────────────
  const startSpeechCapture = useCallback(async () => {
    isTransitioningRef.current = true;
    finalTranscriptAccumulatorRef.current = '';

    // Step 1: Request microphone permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
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
        errorMessage: 'Microphone access denied. Please allow microphone permissions.',
      }));
      isTransitioningRef.current = false;
      return;
    }

    // Step 2: Try to mint AssemblyAI temporary token
    let tokenResult;
    try {
      tokenResult = await Promise.race([
        getAssemblyAiToken(),
        new Promise<{ token: null; configured: false }>((resolve) =>
          setTimeout(() => resolve({ token: null, configured: false }), 10000)
        ),
      ]);
    } catch (err) {
      tokenResult = { token: null, configured: false };
    }

    // Fallback if AssemblyAI is not configured or token failed
    if (!tokenResult.configured || !tokenResult.token) {
      console.info('[VoiceAssistant] AssemblyAI not configured, falling back to Web Speech API');
      startFallbackCapture();
      isTransitioningRef.current = false;
      return;
    }

    // Step 3: Connect to AssemblyAI WebSocket
    try {
      const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tokenResult.token}`;
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
        }, 2200);
      };

      ws.onopen = () => {
        setState((s) => ({
          ...s,
          status: 'LISTENING_SPEECH',
          sttEngine: 'AssemblyAI',
          currentTranscript: '',
        }));

        // Setup Web Audio graph: mic -> ScriptProcessor -> floatTo16BitPCM -> ws
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = audioContextRef.current || new AudioCtx({ sampleRate: 16000 });
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        // ScriptProcessor bufferSize = 4096 gives ~256ms audio chunks
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorNodeRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);

          // Calculate RMS for visualizer
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          const level = Math.min(32, Math.max(4, rms * 180));

          setState((s) => ({
            ...s,
            audioLevels: Array.from({ length: 16 }, () => 4 + Math.random() * level),
          }));

          const pcmData = floatTo16BitPCM(inputData);
          try {
            ws.send(pcmData);
          } catch {}
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
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

      ws.onclose = () => {
        // Handled via stopAudioStreaming
      };
    } catch (err: unknown) {
      console.warn('[VoiceAssistant] Failed to initiate AssemblyAI connection:', err);
      startFallbackCapture();
    } finally {
      isTransitioningRef.current = false;
    }
  }, [processFinalTranscript, startFallbackCapture, stopAudioStreaming]);

  // ─── Background Wake-Word Detection Loop ──────────────────────────────────
  const triggerWakeWordWakeup = useCallback(() => {
    if (isTransitioningRef.current) return;
    playWakeChime();
    setState((s) => ({
      ...s,
      status: 'HEARD_WAKEWORD',
      errorMessage: null,
      currentTranscript: 'Listening to command…',
    }));

    // Pause wake recognition while streaming user speech
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.stop();
      } catch {}
    }

    setTimeout(() => {
      startSpeechCapture();
    }, 200);
  }, [startSpeechCapture]);

  const startWakeWordRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

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
          // Detect "hey koch", "hey coach", "coach", "koch", "ok coach", "hi coach"
          const isWakeWord = /\b(hey|hi|ok|okay)?\s*(koch|coach|coke|cotch)\b/i.test(phrase);

          if (isWakeWord) {
            console.info('[VoiceAssistant] Wake-word detected:', phrase);
            triggerWakeWordWakeup();
            return;
          }
        }
      };

      recognition.onerror = (e: any) => {
        // Ignore aborted / no-speech errors in background listening
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[VoiceAssistant:WakeWord] Speech recognition event:', e.error);
        }
      };

      recognition.onend = () => {
        // Automatically keep alive if hands-free is enabled and we are not in active speech capture
        setState((current) => {
          if (current.isHandsFree && current.status === 'LISTENING_WAKEWORD') {
            setTimeout(() => {
              try {
                recognition.start();
              } catch {}
            }, 300);
          }
          return current;
        });
      };

      wakeRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[VoiceAssistant] Wake word recognition init error:', err);
    }
  }, [triggerWakeWordWakeup]);

  // ─── Toggle Hands-Free Listening ──────────────────────────────────────────
  const toggleHandsFree = useCallback(() => {
    setState((prev) => {
      const nextActive = !prev.isHandsFree;
      if (nextActive) {
        return { ...prev, isHandsFree: true, status: 'LISTENING_WAKEWORD' };
      } else {
        stopAudioStreaming();
        if (wakeRecognitionRef.current) {
          try {
            wakeRecognitionRef.current.stop();
          } catch {}
          wakeRecognitionRef.current = null;
        }
        return {
          ...prev,
          isHandsFree: false,
          status: 'IDLE',
          currentTranscript: '',
        };
      }
    });
  }, [stopAudioStreaming]);

  // ─── Manual Push-To-Talk Trigger ──────────────────────────────────────────
  const triggerManualTalk = useCallback(() => {
    if (state.status === 'LISTENING_SPEECH') {
      // User tapped button to finish talking early
      stopAudioStreaming();
      const text = finalTranscriptAccumulatorRef.current || state.currentTranscript;
      finalTranscriptAccumulatorRef.current = '';
      processFinalTranscript(text);
    } else {
      // User tapped button to start talking
      // Create AudioContext early on user gesture to prevent suspension
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !audioContextRef.current) {
        audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      playWakeChime();
      setState((s) => ({
        ...s,
        status: 'HEARD_WAKEWORD',
        currentTranscript: 'Listening…',
      }));
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
      }
      setTimeout(() => {
        startSpeechCapture();
      }, 150);
    }
  }, [state.status, state.currentTranscript, stopAudioStreaming, processFinalTranscript, startSpeechCapture]);

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
  useEffect(() => {
    if (state.isHandsFree && state.status === 'LISTENING_WAKEWORD') {
      startWakeWordRecognition();
    }
  }, [state.isHandsFree, state.status, startWakeWordRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioStreaming();
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
