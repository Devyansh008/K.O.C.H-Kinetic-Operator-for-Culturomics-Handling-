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
  getExperimentById,
  listExperiments as dbListExperiments,
  updateExperimentStatus as dbUpdateExperimentStatus,
  archiveExperiment as dbArchiveExperiment,
  ExperimentStatus,
  type ExperimentWithRelations,
  type ListExperimentsResult,
} from '../db/repositories';

import {
  initActiveState,
  getActiveStateSnapshot,
  clearActiveState,
  type ActiveState,
} from '../services/state';

// ─── startExperiment (#1) ───────────────────────────────────────────────────

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

// ─── getExperiment (#2) ─────────────────────────────────────────────────────

const GetExperimentSchema = z.object({
  experimentId: z.string().min(1),
});

type GetExperimentInput = z.infer<typeof GetExperimentSchema>;

/**
 * Retrieves metadata, plates, wells, telemetry events, and ELN report details
 * for a specific experiment ID.
 *
 * Module 1 (#2): `getExperiment` → `{ experimentId }` → `ExperimentWithRelations | null`
 */
export const getExperiment = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetExperimentSchema.parse(data))
  .handler(async ({ data }: { data: GetExperimentInput }): Promise<ExperimentWithRelations | null> => {
    return getExperimentById(data.experimentId);
  });

// ─── listExperiments (#3) ───────────────────────────────────────────────────

const ListExperimentsSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  status: z.enum([
    ExperimentStatus.ACTIVE,
    ExperimentStatus.COMPLETED,
    ExperimentStatus.ABORTED,
    ExperimentStatus.ARCHIVED,
  ]).optional(),
  search: z.string().optional(),
});

type ListExperimentsInput = z.infer<typeof ListExperimentsSchema>;

/**
 * Paginated, status-filtered, and searchable listing of experiments.
 *
 * Module 1 (#3): `listExperiments` → `{ page, limit, status, search }` → `ListExperimentsResult`
 */
export const listExperiments = createServerFn({ method: 'GET' })
  .validator((data: unknown) => ListExperimentsSchema.parse(data))
  .handler(async ({ data }): Promise<ListExperimentsResult> => {
    return dbListExperiments(data);
  });

// ─── updateExperimentStatus (#4) ───────────────────────────────────────────

const UpdateExperimentStatusSchema = z.object({
  experimentId: z.string().min(1),
  status: z.enum([
    ExperimentStatus.ACTIVE,
    ExperimentStatus.COMPLETED,
    ExperimentStatus.ABORTED,
    ExperimentStatus.ARCHIVED,
  ]),
});

type UpdateExperimentStatusInput = z.infer<typeof UpdateExperimentStatusSchema>;

/**
 * Updates run lifecycle state (ACTIVE → COMPLETED / ABORTED / ARCHIVED).
 * Automatically handles in-memory active state clearing for non-ACTIVE transitions.
 *
 * Module 1 (#4): `updateExperimentStatus` → `{ experimentId, status }` → `Experiment`
 */
export const updateExperimentStatus = createServerFn({ method: 'POST' })
  .validator((data: unknown) => UpdateExperimentStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const updated = await dbUpdateExperimentStatus(data.experimentId, data.status);
    if (data.status === ExperimentStatus.ACTIVE) {
      initActiveState(data.experimentId);
    } else {
      clearActiveState(data.experimentId);
    }
    return updated;
  });

// ─── archiveExperiment (#5) ─────────────────────────────────────────────────

const ArchiveExperimentSchema = z.object({
  experimentId: z.string().min(1),
  reason: z.string().optional(),
});

type ArchiveExperimentInput = z.infer<typeof ArchiveExperimentSchema>;

/**
 * Soft-archives completed or aborted experiment runs for long-term storage.
 *
 * Module 1 (#5): `archiveExperiment` → `{ experimentId, reason }` → `Experiment`
 */
export const archiveExperiment = createServerFn({ method: 'POST' })
  .validator((data: unknown) => ArchiveExperimentSchema.parse(data))
  .handler(async ({ data }) => {
    const updated = await dbArchiveExperiment(data.experimentId);
    clearActiveState(data.experimentId);
    return updated;
  });

// ─── getActiveState (#29) ───────────────────────────────────────────────────

const GetActiveStateSchema = z.object({
  experimentId: z.string().min(1),
});

type GetActiveStateInput = z.infer<typeof GetActiveStateSchema>;

/**
 * Returns the current in-memory active state snapshot for an experiment.
 * Returns null if the experiment is unknown (e.g. after a cold restart).
 *
 * Module 9 (#29): `getActiveState` → `{ experimentId }` → active-state snapshot
 */
export const getActiveState = createServerFn({ method: 'GET' })
  .validator((data: unknown) => GetActiveStateSchema.parse(data))
  .handler(async ({ data }: { data: GetActiveStateInput }): Promise<ActiveState | null> => {
    return getActiveStateSnapshot(data.experimentId);
  });

// ─── endExperiment (Convenience wrapper around updateExperimentStatus) ───────

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
 */
export const endExperiment = createServerFn({ method: 'POST' })
  .validator((data: unknown) => EndExperimentSchema.parse(data))
  .handler(async ({ data }: { data: EndExperimentInput }) => {
    const updated = await dbUpdateExperimentStatus(data.experimentId, data.status);
    clearActiveState(data.experimentId);
    return updated;
  });
