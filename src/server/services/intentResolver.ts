/**
 * src/server/services/intentResolver.ts
 *
 * Culturomics Voice Intent Resolver for Project K.O.C.H.
 * Pure string parsing and keyword matching with zero Node-specific runtime dependencies.
 */

export type ResolvedIntentPayload =
  | { action: 'MARK_WELL_PENDING'; plateLabel: string; wellCoordinate: string }
  | { action: 'ADD_TUBE'; tubeId: string }
  | { action: 'START_TIMER' }
  | { action: 'RECORD_OD600' }
  | { action: 'ADD_CULTURE'; culture: string }
  | { action: 'SET_ENVIRONMENT'; environment: string }
  | { action: 'UNKNOWN'; raw: string };

/**
 * Resolves a raw transcript string into a structured culturomics intent object.
 *
 * Patterns:
 *   - "mark plate <N> well <COORD>" → MARK_WELL_PENDING
 *   - "add tube <ID>"              → ADD_TUBE
 *   - "start timer"                → START_TIMER
 *   - "od600"                      → RECORD_OD600
 *   - "akkermansia"                → ADD_CULTURE
 *   - "anaerobic" / "5% co2"       → SET_ENVIRONMENT
 */
export function resolveIntent(transcript: string): ResolvedIntentPayload {
  const t = transcript.trim().toLowerCase();

  // MARK_WELL: "mark plate 4 well C7"
  const markWellMatch = t.match(/mark\s+plate\s+(\S+)\s+well\s+([a-p]\d+)/i);
  if (markWellMatch) {
    return {
      action: 'MARK_WELL_PENDING',
      plateLabel: `Plate ${markWellMatch[1]}`,
      wellCoordinate: markWellMatch[2].toUpperCase(),
    };
  }

  // Also support short form: "mark well C7"
  const markWellShortMatch = t.match(/mark\s+well\s+([a-p]\d+)/i);
  if (markWellShortMatch) {
    return {
      action: 'MARK_WELL_PENDING',
      plateLabel: 'Plate 4',
      wellCoordinate: markWellShortMatch[1].toUpperCase(),
    };
  }

  // ADD_TUBE: "add tube <ID>"
  const addTubeMatch = t.match(/add\s+tube\s+(\S+)/i);
  if (addTubeMatch) {
    return { action: 'ADD_TUBE', tubeId: addTubeMatch[1] };
  }

  // START_TIMER
  if (t.includes('start timer') || t.includes('lap timer') || t.includes('protocol timer')) {
    return { action: 'START_TIMER' };
  }

  // Microbiology Lexicon
  if (t.includes('od600')) {
    return { action: 'RECORD_OD600' };
  }

  if (t.includes('akkermansia')) {
    return { action: 'ADD_CULTURE', culture: 'Akkermansia' };
  }

  if (t.includes('anaerobic')) {
    return { action: 'SET_ENVIRONMENT', environment: 'anaerobic' };
  }

  if (t.includes('5% co2')) {
    return { action: 'SET_ENVIRONMENT', environment: '5% CO2' };
  }

  return { action: 'UNKNOWN', raw: transcript };
}
