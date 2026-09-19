import { useState, useEffect, useRef, useCallback } from 'react';

const workletCode = `
class LmsFilterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // LMS Parameters tuned for low frequency hums (65-75 dB HEPA fan blower)
    this.mu = 0.005; // Step size for adaptation
    this.filterLength = 256; // Number of weights (L)
    this.delayLength = 64; // Delay samples to isolate periodic noise
    
    this.weights = new Float32Array(this.filterLength);
    // Buffer needs to hold current delay + filter length for convolution
    this.delayBuffer = new Float32Array(this.delayLength + this.filterLength);
    this.delayIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) return true;

    const channelIn = input[0];
    const channelOut = output[0];

    // Adaptive Line Enhancer (ALE) logic
    for (let i = 0; i < channelIn.length; i++) {
      const d = channelIn[i]; // Desired signal (primary input with voice + periodic noise)
      
      // Insert current sample into the circular delay buffer
      this.delayBuffer[this.delayIndex] = d;
      
      // Calculate estimated periodic noise (y) using current weights
      let y = 0;
      for (let j = 0; j < this.filterLength; j++) {
        const refIndex = (this.delayIndex - this.delayLength - j + this.delayBuffer.length) % this.delayBuffer.length;
        y += this.weights[j] * this.delayBuffer[refIndex];
      }

      // Error signal (e) is the input minus the estimated periodic noise.
      // This error signal contains the non-periodic component (voice formants)
      const e = d - y;

      // Update LMS weights
      // Normalize mu to avoid divergence on loud inputs
      const normalizedMu = this.mu / (0.01 + Math.abs(e));
      
      for (let j = 0; j < this.filterLength; j++) {
        const refIndex = (this.delayIndex - this.delayLength - j + this.delayBuffer.length) % this.delayBuffer.length;
        this.weights[j] += 2 * normalizedMu * e * this.delayBuffer[refIndex];
      }

      // The output is the signal stripped of the periodic noise
      channelOut[i] = e;
      
      this.delayIndex = (this.delayIndex + 1) % this.delayBuffer.length;
    }

    return true;
  }
}

registerProcessor('lms-filter-processor', LmsFilterProcessor);
`;

interface UseLmsNoiseFilterReturn {
  filteredStream: MediaStream | null;
  isFiltering: boolean;
  toggleFilter: (enabled: boolean) => void;
}

export function useLmsNoiseFilter(inputStream: MediaStream | null): UseLmsNoiseFilterReturn {
  const [filteredStream, setFilteredStream] = useState<MediaStream | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const cleanupAudioNodes = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (destinationNodeRef.current) {
      destinationNodeRef.current.disconnect();
      destinationNodeRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setFilteredStream(null);
  }, []);

  const setupFilter = useCallback(async () => {
    if (!inputStream) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 48000
      });
      audioCtxRef.current = ctx;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const sourceNode = ctx.createMediaStreamSource(inputStream);
      sourceNodeRef.current = sourceNode;

      const workletNode = new AudioWorkletNode(ctx, 'lms-filter-processor');
      workletNodeRef.current = workletNode;

      const destinationNode = ctx.createMediaStreamDestination();
      destinationNodeRef.current = destinationNode;

      if (isFiltering) {
        sourceNode.connect(workletNode);
        workletNode.connect(destinationNode);
      } else {
        sourceNode.connect(destinationNode);
      }

      setFilteredStream(destinationNode.stream);
    } catch (err) {
      console.error('Failed to setup LMS filter:', err);
    }
  }, [inputStream, isFiltering]);

  useEffect(() => {
    if (inputStream) {
      setupFilter();
    } else {
      cleanupAudioNodes();
    }

    return () => {
      cleanupAudioNodes();
    };
  }, [inputStream, setupFilter, cleanupAudioNodes]);

  const toggleFilter = useCallback((enabled: boolean) => {
    setIsFiltering(enabled);
    if (!sourceNodeRef.current || !destinationNodeRef.current) return;

    sourceNodeRef.current.disconnect();
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
    }

    if (enabled && workletNodeRef.current) {
      sourceNodeRef.current.connect(workletNodeRef.current);
      workletNodeRef.current.connect(destinationNodeRef.current);
    } else {
      sourceNodeRef.current.connect(destinationNodeRef.current);
    }
  }, []);

  return {
    filteredStream,
    isFiltering,
    toggleFilter
  };
}
