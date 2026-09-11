/**
 * src/server/functions/perception.ts
 *
 * TanStack Start server functions for the Perception Core — Layer 2
 *
 * PRD §7 — Backend API Surface:
 *   requestColonyDetection  → forward frame ref to cloud CV, persist result
 *   getRecipeRecommendation → fetch historical detections, run pathway rules
 *
 * Design:
 *   - All inputs validated by Zod at the server function boundary.
 *   - No `any` at integration boundaries (PRD §9 — Type safety).
 *   - Heavy CV computation is fully offloaded to analyzeColonyFrame —
 *     handler stays thin to respect the <500 ms latency budget for any
 *     subsequent voice-pipeline interactions.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  createColonyDetection,
  getColonyDetectionsByWell,
} from '../db/repositories';

import {
  analyzeColonyFrame,
  calculatePathwayRecommendation,
  type PathwayRecommendation,
} from '../services/perception';

// ─── requestColonyDetection ───────────────────────────────────────────────────

const RequestColonyDetectionSchema = z.object({
  /** CUID of the well the frame was captured from */
  wellId: z.string().min(1),
  /**
   * Opaque frame reference string — storage URL, buffer UUID, or
   * base64 data URI for the video frame to be analysed.
   */
  frameRef: z.string().min(1),
});

type RequestColonyDetectionInput = z.infer<typeof RequestColonyDetectionSchema>;

/**
 * Forwards a captured video frame to the cloud CV endpoint, receives a
 * structured micro-colony detection result, persists it as a ColonyDetection
 * row, and returns the created record.
 *
 * PRD §7: `requestColonyDetection` → `{ wellId, frameRef }` → `ColonyDetection`
 * PRD §8: Backend server function forwards frame references; cloud CV returns
 *         structured detections — no local model inference.
 */
export const requestColonyDetection = createServerFn({ method: 'POST' })
  .validator((data: unknown) => RequestColonyDetectionSchema.parse(data))
  .handler(async ({ data }: { data: RequestColonyDetectionInput }) => {
    // 1. Call cloud CV service (retries once internally on transient failure)
    const detection = await analyzeColonyFrame(data.wellId, data.frameRef);

    // 2. Persist result via repository
    const record = await createColonyDetection({
      wellId:        data.wellId,
      confidence:    detection.confidence,
      growthVelocity: detection.growthVelocity ?? undefined,
      cvProvider:    detection.cvProvider,
    });

    return record;
  });

// ─── getRecipeRecommendation ──────────────────────────────────────────────────

const GetRecipeRecommendationSchema = z.object({
  /** CUID of the well to generate a recipe recommendation for */
  wellId: z.string().min(1),
});

type GetRecipeRecommendationInput = z.infer<typeof GetRecipeRecommendationSchema>;

/**
 * Queries all historical ColonyDetection rows for the specified well,
 * computes a representative growth velocity (mean of the most recent
 * detections), runs the biological pathway rule-set, and returns a
 * structured recipe adjustment payload.
 *
 * If no detections exist yet, a conservative "no action" recommendation
 * is returned (the pathway engine never throws).
 *
 * PRD §7: `getRecipeRecommendation` → `{ wellId }` → recommendation payload
 * PRD §5.1: Recipe recommendation via type-safe server function; growth-velocity-
 *           based recipe adjustments returned to frontend.
 */
export const getRecipeRecommendation = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetRecipeRecommendationSchema.parse(data))
  .handler(async ({
    data,
  }: { data: GetRecipeRecommendationInput }): Promise<PathwayRecommendation> => {
    // 1. Fetch historical detections for this well (ordered oldest-first)
    const detections = await getColonyDetectionsByWell(data.wellId);

    // 2. Derive a representative growth velocity from available data
    //    Strategy: mean of the last 5 detections that have a growthVelocity value.
    //    Trimming to the tail keeps the recommendation responsive to recent
    //    conditions rather than being dragged by stale early-growth data.
    const recentWithVelocity = detections
      .filter((d) => d.growthVelocity !== null)
      .slice(-5);

    let representativeVelocity = 0;
    if (recentWithVelocity.length > 0) {
      const sum = recentWithVelocity.reduce(
        (acc, d) => acc + (d.growthVelocity ?? 0),
        0,
      );
      representativeVelocity = sum / recentWithVelocity.length;
    }

    // 3. Run pathway rule-set
    const recommendation = calculatePathwayRecommendation(
      data.wellId,
      representativeVelocity,
    );

    return recommendation;
  });
