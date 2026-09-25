/**
 * src/lib/audio-utils.ts
 *
 * Pure browser-audio helpers shared by the K.O.C.H. voice pipeline:
 * PCM conversion, RMS metering, waveform level generation, and the
 * wake-up chime. No React or network dependencies — safe to unit test.
 */

// ─── Waveform Visualizer ────────────────────────────────────────────────────

export const AUDIO_BAR_COUNT = 16;
const BASE_LEVEL = 4;

export function defaultAudioLevels(): number[] {
  return Array(AUDIO_BAR_COUNT).fill(BASE_LEVEL);
}

/** Map an RMS amplitude to a full waveform bar set (live mic input). */
export function computeAudioLevels(rms: number, scale = 180, max = 32): number[] {
  const level = Math.min(max, Math.max(BASE_LEVEL, rms * scale));
  return Array.from({ length: AUDIO_BAR_COUNT }, () => BASE_LEVEL + Math.random() * level);
}

/** Simulated waveform bar set (fallback / unsupported engine visual feedback). */
export function simulateAudioLevels(): number[] {
  return Array.from({ length: AUDIO_BAR_COUNT }, () => 8 + Math.random() * 24);
}

// ─── Signal Processing ──────────────────────────────────────────────────────

/** Root-mean-square amplitude of a float32 mono channel. */
export function computeRms(input: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input[i] * input[i];
  }
  return Math.sqrt(sum / input.length);
}

/** Convert Float32Array [-1, 1] to 16-bit mono PCM for the AssemblyAI WebSocket. */
export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

// ─── AudioContext & Chime ───────────────────────────────────────────────────

/** Create a vendor-prefixed AudioContext, SSR-safe. Returns null if unsupported. */
export function createAudioContext(sampleRate = 16000): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  return AudioCtx ? new AudioCtx({ sampleRate }) : null;
}

/** Vendor-prefixed SpeechRecognition constructor, SSR-safe. Returns null if unsupported. */
export function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Ctor ?? null;
}

/**
 * Play a pleasant two-tone wake-up chime (D5 → A5) via the Web Audio API.
 * Autoplay-restriction failures are ignored safely.
 */
export function playWakeChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const tone = (freq: number, startAt: number, duration: number, peak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(peak, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration);
    };

    tone(587.33, now, 0.12, 0.12); // D5
    tone(880, now + 0.1, 0.18, 0.14); // A5
  } catch {
    // AudioContext autoplay restrictions are ignored safely
  }
}
