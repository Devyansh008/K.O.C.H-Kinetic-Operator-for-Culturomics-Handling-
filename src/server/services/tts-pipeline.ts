import { ResolvedIntent } from '../functions/telemetry';

/**
 * Generates a concise spoken confirmation phrase based on the resolved intent.
 * Enforces a strict 3–5 word phrase constraint to keep laboratory interactions concise.
 */
export function generateConfirmationPhrase(intent: ResolvedIntent): string {
  let phrase = '';

  switch (intent.action) {
    case 'MARK_WELL':
      phrase = `Well ${intent.wellCoordinate || 'unknown'} marked inoculate`;
      break;
    case 'ADD_TUBE':
      phrase = `Tube ${intent.tubeId} added successfully`;
      break;
    case 'START_TIMER':
      phrase = 'Timer started right now';
      break;
    case 'RECORD_OD600':
      phrase = 'OD 600 recorded successfully';
      break;
    case 'ADD_CULTURE':
      phrase = `Culture ${intent.culture} added successfully`;
      break;
    case 'SET_ENVIRONMENT':
      phrase = `Environment set to ${intent.environment}`;
      break;
    case 'UNKNOWN':
    default:
      phrase = 'Command not fully understood';
      break;
  }

  // Enforce 3-5 word constraint
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    phrase = phrase + ' action complete';
  } else if (words.length > 5) {
    phrase = words.slice(0, 5).join(' ');
  }

  return phrase;
}
