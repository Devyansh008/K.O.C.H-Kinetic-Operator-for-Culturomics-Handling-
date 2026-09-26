import { useState, useCallback, useEffect, useRef } from 'react';
import { useMicrophoneStream } from './useMicrophoneStream';
import { useLmsNoiseFilter } from './useLmsNoiseFilter';

export interface UseVoiceAssistantReturn {
  isListening: boolean;
  isConnecting: boolean;
  latencyMs: number;
  filteredAudioStream: MediaStream | null;
  lmsFilteringEnabled: boolean;
  toggleLmsFilter: (enabled: boolean) => void;
  startSession: () => Promise<void>;
  stopSession: () => void;
  audioRMS: number;
}

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const {
    isRecording,
    audioStream,
    startRecording,
    stopRecording,
  } = useMicrophoneStream();

  const {
    filteredStream,
    isFiltering,
    toggleFilter,
  } = useLmsNoiseFilter(audioStream);

  const [isConnecting, setIsConnecting] = useState(false);
  const [latencyMs, setLatencyMs] = useState(240); // round-trip target <500ms
  const [audioRMS, setAudioRMS] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio RMS calculation for orb dynamic pulsing
  useEffect(() => {
    if (!filteredStream) {
      setAudioRMS(0);
      return;
    }

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(filteredStream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioRMS(avg / 128); // normalize ~ 0.0 to 1.5+
        animFrameRef.current = requestAnimationFrame(loop);
      };
      loop();

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        source.disconnect();
        audioCtx.close();
      };
    } catch (err) {
      console.warn('RMS metering unavailable:', err);
    }
  }, [filteredStream]);

  // Round-trip latency simulation jitter
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setLatencyMs(210 + Math.floor(Math.random() * 80)); // 210-290 ms
    }, 1500);
    return () => clearInterval(interval);
  }, [isRecording]);

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    try {
      await startRecording();
      setIsConnecting(false);
    } catch {
      setIsConnecting(false);
    }
  }, [startRecording]);

  const stopSession = useCallback(() => {
    stopRecording();
    setIsConnecting(false);
  }, [stopRecording]);

  return {
    isListening: isRecording,
    isConnecting,
    latencyMs,
    filteredAudioStream: filteredStream,
    lmsFilteringEnabled: isFiltering,
    toggleLmsFilter: toggleFilter,
    startSession,
    stopSession,
    audioRMS,
  };
}
