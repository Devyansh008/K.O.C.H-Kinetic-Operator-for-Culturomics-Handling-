/**
 * src/server/services/perception.ts
 *
 * Perception Core services for Project K.O.C.H. — Layer 2
 *
 * Responsibilities (PRD §5.1 — Orchestration & Perception Core):
 *   1. analyzeColonyFrame   — HTTP wrapper for cloud computer vision API;
 *                             returns structured detection output.
 *   2. calculatePathwayRecommendation — biological pathway rules engine;
 *                             evaluates growth velocity and returns recipe
 *                             adjustments (carbon source, pH, nutrients).
 *
 * Integration architecture (PRD §8 — Third-Party Integrations):
 *   - Cloud Vision API is called via a plain HTTPS POST to the endpoint
 *     configured in CLOUD_VISION_ENDPOINT, authenticated by CLOUD_VISION_API_KEY.
 *   - No local Python or ML runtimes — all inference is remote.
 *   - The pathway recommendation engine is a deterministic rule-set here
 *     (M2 baseline). It will be replaced with a live pathway DB query in M4.
 *
 * Error strategy:
 *   - analyzeColonyFrame retries once on 5xx before propagating.
 *   - calculatePathwayRecommendation never throws — it returns a conservative
 *     "no adjustment needed" recommendation on edge cases.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Structured output returned by the cloud CV endpoint after analysing a frame. */
export interface ColonyDetectionResult {
  /** Detection confidence score (0.0 – 1.0) as returned by the CV provider */
  confidence: number;
  /** Number of distinct micro-colony regions detected in the frame */
  colonyCount: number;
  /**
   * Estimated growth velocity in μm²/hr, derived from pixel-area delta
   * across the last two frames processed by the CV provider.
   * Null when the provider cannot compute delta (e.g. first frame for this well).
   */
  growthVelocity: number | null;
  /** Identifier string for the cloud CV endpoint that produced this result */
  cvProvider: string;
}

/** A single recipe/media adjustment recommendation. */
export interface RecipeAdjustment {
  /** Biological target being adjusted (e.g. "carbon_source", "ph_buffer") */
  target: string;
  /** Human-readable action (e.g. "Increase glucose concentration to 2% w/v") */
  action: string;
  /** Urgency level — operator sees HIGH as an audio alert */
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

/** Full recommendation payload returned by calculatePathwayRecommendation. */
export interface PathwayRecommendation {
  wellId: string;
  growthVelocity: number;
  /** Empty array = no adjustments required; items are ordered by urgency DESC */
  adjustments: RecipeAdjustment[];
  /**
   * Concise 3–5 word voice-confirmation message the operator will hear.
   * Kept short per PRD §9 (<500 ms latency budget).
   */
  voiceConfirmation: string;
  evaluatedAt: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Performs a single HTTPS POST to the configured cloud CV endpoint.
 * Throws on non-2xx response.
 */
async function callCloudVisionApi(
  frameRef: string,
  wellId: string,
): Promise<ColonyDetectionResult> {
  const endpoint = process.env.CLOUD_VISION_ENDPOINT;
  const apiKey   = process.env.CLOUD_VISION_API_KEY;

  if (!endpoint || !apiKey) {
    // Graceful dev-mode fallback: return a deterministic mock result
    // so the rest of the pipeline can be exercised without a live CV key.
    console.warn(
      '[perception] CLOUD_VISION_ENDPOINT or CLOUD_VISION_API_KEY not set — ' +
      'returning mock detection result.',
    );
    return buildMockDetectionResult(wellId);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ frameRef, wellId }),
  });

  if (!response.ok) {
    throw new Error(
      `[perception] Cloud CV API responded with ${response.status} for wellId="${wellId}"`,
    );
  }

  // The response shape matches ColonyDetectionResult; CV providers may return
  // extra fields which are safely ignored by the type cast below.
  const raw = await response.json() as Partial<ColonyDetectionResult>;

  return {
    confidence:    typeof raw.confidence    === 'number' ? raw.confidence    : 0,
    colonyCount:   typeof raw.colonyCount   === 'number' ? raw.colonyCount   : 0,
    growthVelocity: typeof raw.growthVelocity === 'number' ? raw.growthVelocity : null,
    cvProvider:    typeof raw.cvProvider    === 'string' ? raw.cvProvider    : endpoint,
  };
}

/**
 * Deterministic mock result — used in dev/CI when CLOUD_VISION_* env vars
 * are absent. Produces a plausible but synthetic detection.
 */
function buildMockDetectionResult(wellId: string): ColonyDetectionResult {
  // Seed deterministically from wellId so tests are repeatable
  const seed = wellId.charCodeAt(wellId.length - 1) / 127;
  return {
    confidence:    0.72 + seed * 0.15,          // 0.72 – 0.87
    colonyCount:   Math.round(3 + seed * 8),    // 3 – 11
    growthVelocity: 12.4 + seed * 20,           // 12.4 – 32.4 μm²/hr
    cvProvider:    'mock-cv-provider',
  };
}

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Dispatches a video frame reference to the cloud computer vision endpoint
 * for micro-colony detection analysis.
 *
 * Retries once on transient 5xx failures before propagating.
 * Falls back to a mock result when CV env vars are unset (dev mode).
 *
 * @param wellId    CUID of the well the frame was captured from
 * @param frameRef  Opaque frame reference string (e.g. storage URL or buffer ID)
 * @returns         Structured detection output from the CV provider
 */
export async function analyzeColonyFrame(
  wellId: string,
  frameRef: string,
): Promise<ColonyDetectionResult> {
  try {
    return await callCloudVisionApi(frameRef, wellId);
  } catch (firstErr) {
    // One retry on failure before surfacing the error
    console.warn('[perception] CV API call failed, retrying once…', firstErr);
    try {
      return await callCloudVisionApi(frameRef, wellId);
    } catch (retryErr) {
      console.error('[perception] CV API retry also failed:', retryErr);
      throw retryErr;
    }
  }
}

// ─── Pathway rules engine ─────────────────────────────────────────────────────

/**
 * Growth velocity thresholds (μm²/hr) used by the pathway rule-set.
 * These values represent M2 baseline biology heuristics; they will be
 * replaced with live pathway DB lookups in M4.
 */
const VELOCITY_THRESHOLDS = {
  /** Below this: colony is stalled — likely nutrient depletion */
  STALLED: 5,
  /** Below this: colony is growing slowly — suboptimal conditions */
  SLOW: 15,
  /** Above this: colony is growing well — minimal intervention */
  OPTIMAL_MIN: 30,
  /** Above this: runaway growth — risk of contamination cascade */
  RUNAWAY: 80,
} as const;

/**
 * Evaluates a well's current growth velocity against biological pathway
 * rules and returns a set of recipe/media adjustment recommendations.
 *
 * This is a deterministic rule-based engine (M2 baseline). Growth velocity
 * bands map to specific carbon-source, pH, and nutrient interventions as
 * defined in the K.O.C.H. culturomics protocol.
 *
 * @param wellId        CUID of the well being evaluated
 * @param growthVelocity Current growth velocity in μm²/hr
 * @returns             Structured recommendation payload
 */
export function calculatePathwayRecommendation(
  wellId: string,
  growthVelocity: number,
): PathwayRecommendation {
  const evaluatedAt = new Date().toISOString();
  const adjustments: RecipeAdjustment[] = [];
  let voiceConfirmation = 'Growth nominal, no action';

  if (growthVelocity < VELOCITY_THRESHOLDS.STALLED) {
    // Colony is stalled — likely carbon/nitrogen depletion or pH drift
    adjustments.push(
      {
        target: 'carbon_source',
        action: 'Increase glucose concentration to 2% w/v — colony stalled',
        urgency: 'HIGH',
      },
      {
        target: 'ph_buffer',
        action: 'Check pH; add 10 mM HEPES buffer if pH < 6.8',
        urgency: 'HIGH',
      },
      {
        target: 'nitrogen_source',
        action: 'Supplement with 0.5% peptone if no improvement after 2 h',
        urgency: 'MEDIUM',
      },
    );
    voiceConfirmation = 'Colony stalled, adjust media';

  } else if (growthVelocity < VELOCITY_THRESHOLDS.SLOW) {
    // Slow growth — suboptimal aeration or trace element deficiency
    adjustments.push(
      {
        target: 'aeration',
        action: 'Increase aeration rate to 200 rpm if shake-flask culture',
        urgency: 'MEDIUM',
      },
      {
        target: 'trace_elements',
        action: 'Add trace element solution (1× Balch vitamins)',
        urgency: 'LOW',
      },
    );
    voiceConfirmation = 'Growth slow, check aeration';

  } else if (growthVelocity >= VELOCITY_THRESHOLDS.RUNAWAY) {
    // Runaway growth — risk of contamination cascade or metabolic overflow
    adjustments.push(
      {
        target: 'carbon_source',
        action: 'Reduce glucose feed by 50% — overflow metabolism risk',
        urgency: 'HIGH',
      },
      {
        target: 'contamination_check',
        action: 'Perform Gram stain on aliquot — verify culture purity',
        urgency: 'HIGH',
      },
    );
    voiceConfirmation = 'Growth runaway, reduce feed';

  } else {
    // Optimal range — no action required
    voiceConfirmation = 'Growth optimal, no action';
  }

  // Sort adjustments: HIGH first, then MEDIUM, then LOW
  const urgencyRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  adjustments.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]);

  return {
    wellId,
    growthVelocity,
    adjustments,
    voiceConfirmation,
    evaluatedAt,
  };
}
