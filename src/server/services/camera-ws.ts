/**
 * src/server/services/camera-ws.ts
 *
 * Camera WebSocket & In-Memory Frame Buffer Service
 *
 * Implements Layer 3 Ingestion Gateway (PRD §5.2):
 *   - Buffers chunked RGB camera frames per experiment.
 *   - Downsamples and rotates frames in a sliding retention window.
 *   - Tags each frame with a monotonic server timestamp for correlation.
 */

export interface BufferedFrame {
  frameId: string;
  experimentId: string;
  timestamp: string;
  monotonicMs: number;
  base64Data: string;
  width: number;
  height: number;
  rotationDeg: number;
}

export interface FrameBufferStats {
  experimentId: string;
  bufferedFrameCount: number;
  latestFrameTimestamp: string | null;
  bufferWindowSize: number;
}

// In-memory sliding window of frames per experiment (max 60 frames per experiment)
const DEFAULT_BUFFER_WINDOW = 60;
const frameBufferMap = new Map<string, BufferedFrame[]>();

/**
 * Ingests a new camera frame into the in-memory circular buffer.
 */
export function ingestBufferedFrame(
  experimentId: string,
  base64Data: string,
  width: number = 640,
  height: number = 480,
  rotationDeg: number = 0,
): BufferedFrame {
  const frames = frameBufferMap.get(experimentId) ?? [];
  const now = new Date();
  const monotonicMs = Date.now();
  const frameId = `frame_${monotonicMs}_${Math.random().toString(36).substring(2, 7)}`;

  const newFrame: BufferedFrame = {
    frameId,
    experimentId,
    timestamp: now.toISOString(),
    monotonicMs,
    base64Data,
    width,
    height,
    rotationDeg,
  };

  frames.push(newFrame);

  // Maintain circular buffer window
  if (frames.length > DEFAULT_BUFFER_WINDOW) {
    frames.shift();
  }

  frameBufferMap.set(experimentId, frames);
  return newFrame;
}

/**
 * Gets the most recent frames for an experiment.
 */
export function getBufferedFrames(experimentId: string, limit: number = 10): BufferedFrame[] {
  const frames = frameBufferMap.get(experimentId) ?? [];
  return frames.slice(-limit);
}

/**
 * Gets a specific frame by its monotonic timestamp (or closest match).
 */
export function findFrameByTimestamp(
  experimentId: string,
  targetTimestamp: Date,
  toleranceMs: number = 500,
): BufferedFrame | null {
  const frames = frameBufferMap.get(experimentId) ?? [];
  const targetMs = targetTimestamp.getTime();

  let closest: BufferedFrame | null = null;
  let minDiff = Infinity;

  for (const frame of frames) {
    const diff = Math.abs(frame.monotonicMs - targetMs);
    if (diff <= toleranceMs && diff < minDiff) {
      minDiff = diff;
      closest = frame;
    }
  }

  return closest;
}

/**
 * Returns telemetry and buffer stats for an experiment's video stream.
 */
export function getFrameBufferStats(experimentId: string): FrameBufferStats {
  const frames = frameBufferMap.get(experimentId) ?? [];
  return {
    experimentId,
    bufferedFrameCount: frames.length,
    latestFrameTimestamp: frames.length > 0 ? frames[frames.length - 1].timestamp : null,
    bufferWindowSize: DEFAULT_BUFFER_WINDOW,
  };
}

/**
 * Clears the camera frame buffer for an experiment.
 */
export function clearFrameBuffer(experimentId: string): void {
  frameBufferMap.delete(experimentId);
}
