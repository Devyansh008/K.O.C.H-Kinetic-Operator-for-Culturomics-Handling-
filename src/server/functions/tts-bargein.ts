import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

interface TTSPlaybackState {
  bargeInDetected: boolean;
}

// In-memory playback state keyed by experimentId
const playbackStates = new Map<string, TTSPlaybackState>();

export function getPlaybackState(experimentId: string): TTSPlaybackState {
  if (!playbackStates.has(experimentId)) {
    playbackStates.set(experimentId, { bargeInDetected: false });
  }
  return playbackStates.get(experimentId)!;
}

export function resetPlaybackState(experimentId: string) {
  const state = getPlaybackState(experimentId);
  state.bargeInDetected = false;
}

const HandleVADEventSchema = z.object({
  experimentId: z.string().min(1),
  isSpeaking: z.boolean(),
});

/**
 * Handles incoming Voice Activity Detection (VAD) events from the client.
 * If the user starts speaking while TTS is playing, we instantly flag it for barge-in.
 */
export const handleVADEvent = createServerFn({ method: 'POST' })
  .validator((data: unknown) => HandleVADEventSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.isSpeaking) {
      const state = getPlaybackState(data.experimentId);
      state.bargeInDetected = true;
    }
    return { success: true, bargeInDetected: data.isSpeaking };
  });

/**
 * Simulates a streaming TTS audio pipeline (WebSocket/WebRTC).
 * Yields audio chunks and immediately aborts if a barge-in is detected.
 */
export async function* streamTTSChunks(experimentId: string, phrase: string): AsyncIterable<Uint8Array> {
  const state = getPlaybackState(experimentId);
  
  // Simulate generating ~20 chunks of audio data for the phrase
  const totalChunks = 20;
  for (let i = 0; i < totalChunks; i++) {
    // Latency target: next frame < 10ms
    // We simulate a fast 5ms interval per chunk
    await new Promise((resolve) => setTimeout(resolve, 5));
    
    // Check for barge-in before emitting the next chunk
    if (state.bargeInDetected) {
      // Truncate active audio playback
      break;
    }
    
    // Yield mock audio data
    yield new Uint8Array([i]);
  }
}
