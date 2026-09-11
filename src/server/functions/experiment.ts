/**
 * src/server/functions/experiment.ts
 *
 * TanStack Start server functions for experiment lifecycle management.
 *
 * PRD §7 — Backend API Surface (createServerFn pattern):
 *   startExperiment   → create Experiment row + init active state
 *   getActiveState    → return in-memory snapshot for the given experiment
 *   endExperiment     → mark experiment COMPLETED/ABORTED, clear active state
 *
 * All inputs are validated with Zod before touching the DB.
 * All outputs are fully typed from Prisma-generated types.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import {
  createExperiment,
  updateExperimentStatus,
  ExperimentStatus,
} from '../db/repositories';

import {
  initActiveState,
  getActiveStateSnapshot,
  clearActiveState,
  type ActiveState,
} from '../services/state';

// ─── startExperiment ─────────────────────────────────────────────────────────

const StartExperimentSchema = z.object({
  /** Human-readable name for the experiment run (e.g. "Plate Run 2026-09-12") */
  name: z.string().min(1, 'Experiment name must not be empty'),
});

type StartExperimentInput = z.infer<typeof StartExperimentSchema>;

/**
 * Creates a new Experiment row in the database, initialises the in-memory
 * active state entry, and returns the created Experiment.
 *
 * PRD §7: `startExperiment` → `{ name }` → `Experiment`
 */
export const startExperiment = createServerFn({ method: 'POST' })
  .validator((data: unknown) => StartExperimentSchema.parse(data))
  .handler(async ({ data }: { data: StartExperimentInput }) => {
    const experiment = await createExperiment(data.name);
    initActiveState(experiment.id);
    return experiment;
  });

// ─── getActiveState ───────────────────────────────────────────────────────────

const GetActiveStateSchema = z.object({
  experimentId: z.string().min(1),
});

type GetActiveStateInput = z.infer<typeof GetActiveStateSchema>;

/**
 * Returns the current in-memory active state snapshot for an experiment.
 * Returns null if the experiment is unknown (e.g. after a cold restart).
 *
 * PRD §7: `getActiveState` → `{ experimentId }` → active-state snapshot
 */
export const getActiveState = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetActiveStateSchema.parse(data))
  .handler(async ({ data }: { data: GetActiveStateInput }): Promise<ActiveState | null> => {
    return getActiveStateSnapshot(data.experimentId);
  });

// ─── endExperiment ────────────────────────────────────────────────────────────

const EndExperimentSchema = z.object({
  experimentId: z.string().min(1),
  /**
   * Final status to write. Defaults to COMPLETED.
   * Pass ABORTED if the operator aborts mid-run.
   */
  status: z
    .enum([ExperimentStatus.COMPLETED, ExperimentStatus.ABORTED])
    .default(ExperimentStatus.COMPLETED),
});

type EndExperimentInput = z.infer<typeof EndExperimentSchema>;

/**
 * Marks the experiment as COMPLETED (or ABORTED), clears the in-memory
 * active state entry, and returns the updated Experiment row.
 *
 * PRD §7: `endExperiment` → `{ experimentId }` → `Experiment`
 */
export const endExperiment = createServerFn({ method: 'POST' })
  .validator((data: unknown) => EndExperimentSchema.parse(data))
  .handler(async ({ data }: { data: EndExperimentInput }) => {
    const updated = await updateExperimentStatus(data.experimentId, data.status);
    clearActiveState(data.experimentId);
    return updated;
  });
