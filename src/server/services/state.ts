/**
 * src/server/services/state.ts
 *
 * In-memory Active State Manager for Project K.O.C.H.
 *
 * Responsibility (PRD §5.1 Layer 2 — Active-state tracking):
 *   Maintains the server-side source of truth for each running experiment:
 *   current tube IDs, selected plate/well coordinates, and experiment timers.
 *   The client receives snapshots via TanStack Query through the `getActiveState`
 *   server function — it never mutates this map directly.
 *
 * Lifecycle:
 *   - initActiveState()       → called by startExperiment server function
 *   - updateActiveState()     → called after every ingestVoiceIntent / ingestFrameMark
 *   - getActiveStateSnapshot()→ called by getActiveState server function
 *   - clearActiveState()      → called by endExperiment server function
 *
 * Note on persistence:
 *   This map lives in process memory and is intentionally ephemeral.
 *   It is the low-latency read surface for the UI; the immutable audit trail
 *   is in the `TelemetryEvent` table (append-only, via repositories.ts).
 *   On a cold restart the state is re-hydrated from DB via getExperimentById().
 */

import { Prisma } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ActiveCoordinate {
  /** Human-readable plate label (e.g. "Plate 4") */
  plateLabel: string;
  /** DB id of the plate row */
  plateId: string;
  /** Grid coordinate string (e.g. "C7") */
  wellCoordinate: string;
  /** DB id of the well row */
  wellId: string;
}

/** Full active state entry for one experiment. */
export interface ActiveState {
  experimentId: string;

  /** Operator-spoken tube/sample IDs currently active in this run */
  activeTubeIds: string[];

  /**
   * The last well coordinate the operator referred to.
   * Null until the first MARK_WELL voice intent is resolved.
   */
  activeCoordinate: ActiveCoordinate | null;

  /**
   * Monotonic ISO timestamp when this experiment run was started
   * (initialised by initActiveState, never mutated).
   */
  startedAtIso: string;

  /**
   * Running elapsed-time markers set by the operator ("start timer",
   * "lap timer" etc.). Each entry is an ISO timestamp string.
   */
  timerMarks: string[];

  /**
   * Arbitrary key/value bag for any lightweight transient state that
   * server functions need to communicate (e.g. frame-buffer cursor).
   * All values must be JSON-serialisable (Prisma.JsonValue covers null,
   * boolean, number, string, arrays, and plain objects).
   */
  meta: Record<string, Prisma.JsonValue>;
}

// ─── Module-level state map ──────────────────────────────────────────────────

/**
 * Keyed by experimentId. One entry per running experiment.
 * Multiple concurrent experiments are fully supported.
 */
const activeStateMap = new Map<string, ActiveState>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Initialises a fresh active state entry for the given experiment.
 * Must be called by the `startExperiment` server function immediately after
 * the Experiment row is created in the database.
 *
 * Calling this again for an already-running experiment is a no-op so that
 * a hot-reload or duplicate RPC does not reset in-flight state.
 *
 * @param experimentId  CUID of the newly created Experiment row
 */
export function initActiveState(experimentId: string): ActiveState {
  if (activeStateMap.has(experimentId)) {
    // Already initialised — return the existing entry unchanged.
    return activeStateMap.get(experimentId)!;
  }

  const initial: ActiveState = {
    experimentId,
    activeTubeIds: [],
    activeCoordinate: null,
    startedAtIso: new Date().toISOString(),
    timerMarks: [],
    meta: {},
  };

  activeStateMap.set(experimentId, initial);
  return initial;
}

/**
 * Returns a point-in-time snapshot of the active state for the given
 * experiment. Returns `null` if the experiment is not currently tracked
 * (e.g. after a cold restart — callers should re-hydrate from DB in that case).
 *
 * @param experimentId  CUID of the experiment
 */
export function getActiveStateSnapshot(experimentId: string): ActiveState | null {
  return activeStateMap.get(experimentId) ?? null;
}

/**
 * Merges partial updates into the active state for the given experiment.
 * Performs a shallow merge at the top level; nested objects (meta, timerMarks,
 * activeTubeIds) that are passed in the update completely replace the existing
 * value — callers must spread existing values themselves if they want additive
 * behaviour.
 *
 * Throws if the experiment has not been initialised (i.e. initActiveState was
 * never called for this ID — typically a programming error).
 *
 * @param experimentId  CUID of the experiment
 * @param updates       Partial<ActiveState> — fields to overwrite
 * @returns             The updated full ActiveState snapshot
 */
export function updateActiveState(
  experimentId: string,
  updates: Partial<Omit<ActiveState, 'experimentId' | 'startedAtIso'>>,
): ActiveState {
  const current = activeStateMap.get(experimentId);

  if (!current) {
    throw new Error(
      `[ActiveStateManager] No active state found for experimentId="${experimentId}". ` +
        'Call initActiveState() before updating.',
    );
  }

  const next: ActiveState = { ...current, ...updates };
  activeStateMap.set(experimentId, next);
  return next;
}

/**
 * Removes the active state entry for the given experiment.
 * Must be called by the `endExperiment` server function after the DB row
 * has been updated to COMPLETED or ABORTED.
 *
 * Silently no-ops if the experiment was already cleared.
 *
 * @param experimentId  CUID of the experiment
 */
export function clearActiveState(experimentId: string): void {
  activeStateMap.delete(experimentId);
}

/**
 * Appends a timer mark (ISO timestamp) to the active state for the given
 * experiment. Convenience wrapper around updateActiveState so callers do
 * not need to spread the existing timerMarks array.
 *
 * @param experimentId  CUID of the experiment
 * @returns             The ISO timestamp string that was appended
 */
export function addTimerMark(experimentId: string): string {
  const mark = new Date().toISOString();
  const current = getActiveStateSnapshot(experimentId);

  if (!current) {
    throw new Error(
      `[ActiveStateManager] No active state found for experimentId="${experimentId}".`,
    );
  }

  updateActiveState(experimentId, {
    timerMarks: [...current.timerMarks, mark],
  });

  return mark;
}
