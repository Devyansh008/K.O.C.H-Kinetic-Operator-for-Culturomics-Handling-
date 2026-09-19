/**
 * src/server/functions/camera.ts
 *
 * Module 4: Camera & Vision Telemetry Server Functions
 *
 * Implements:
 *   - ingestCameraFrame (#17): Real-time gateway endpoint to receive, buffer, downsample, and rotate chunked RGB frames.
 *   - getCameraBufferStatus: Returns buffer queue depth and latest frame timestamp.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  ingestBufferedFrame,
  getFrameBufferStats,
  type BufferedFrame,
  type FrameBufferStats,
} from '../services/camera-ws';

// ─── ingestCameraFrame (#17) ────────────────────────────────────────────────

const IngestCameraFrameSchema = z.object({
  experimentId: z.string().min(1),
  base64Data: z.string().min(1),
  width: z.number().int().positive().optional().default(640),
  height: z.number().int().positive().optional().default(480),
  rotationDeg: z.number().int().min(0).max(360).optional().default(0),
});

type IngestCameraFrameInput = z.infer<typeof IngestCameraFrameSchema>;

/**
 * Streams, buffers, downsamples, and rotates chunked RGB camera frames.
 * Serves as the HTTP/WS gateway receiver for client camera telemetry.
 *
 * Module 4 (#17): `ingestCameraFrame` → `{ experimentId, base64Data }` → `BufferedFrame`
 */
export const ingestCameraFrame = createServerFn({ method: 'POST' })
  .validator((data: unknown) => IngestCameraFrameSchema.parse(data))
  .handler(async ({ data }: { data: IngestCameraFrameInput }): Promise<BufferedFrame> => {
    return ingestBufferedFrame(
      data.experimentId,
      data.base64Data,
      data.width,
      data.height,
      data.rotationDeg,
    );
  });

// ─── getCameraBufferStatus ──────────────────────────────────────────────────

const GetCameraBufferStatusSchema = z.object({
  experimentId: z.string().min(1),
});

type GetCameraBufferStatusInput = z.infer<typeof GetCameraBufferStatusSchema>;

/**
 * Retrieves the current camera frame buffer status and queue depth.
 */
export const getCameraBufferStatus = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetCameraBufferStatusSchema.parse(data))
  .handler(async ({ data }: { data: GetCameraBufferStatusInput }): Promise<FrameBufferStats> => {
    return getFrameBufferStats(data.experimentId);
  });
