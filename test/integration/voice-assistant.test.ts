/**
 * test/integration/voice-assistant.test.ts
 *
 * Direct business logic unit tests for AssemblyAI token minting and Voice Assistant reply generation.
 */

import { describe, it, expect } from 'vitest';
import {
  handleGetAssemblyAiToken,
  handleGenerateAssistantReply,
} from '../../src/server/functions/voice';

describe('Voice Assistant Core Handlers', () => {
  it('handles handleGetAssemblyAiToken gracefully when key is missing or placeholder', async () => {
    const res = await handleGetAssemblyAiToken();
    expect(res).toBeDefined();
    expect(typeof res.configured).toBe('boolean');
    if (!res.configured) {
      expect(res.token).toBeNull();
      expect(typeof res.error).toBe('string');
    }
  });

  it('generates culturomics assistant reply for well marking intent', async () => {
    const res = await handleGenerateAssistantReply({
      transcript: 'Hey KOCH mark plate 4 well C7 positive',
    });

    expect(res).toBeDefined();
    expect(res.replyText).toContain('C7');
    expect(res.intent.action).toBe('MARK_WELL_PENDING');
  });

  it('generates culturomics assistant reply for incubation timer', async () => {
    const res = await handleGenerateAssistantReply({
      transcript: 'Hey KOCH start timer for incubation',
    });

    expect(res).toBeDefined();
    expect(res.intent.action).toBe('START_TIMER');
    expect(res.replyText.toLowerCase()).toContain('timer');
  });

  it('generates culturomics assistant reply for OD600 reading', async () => {
    const res = await handleGenerateAssistantReply({
      transcript: 'Record OD600 0.145',
    });

    expect(res).toBeDefined();
    expect(res.intent.action).toBe('RECORD_OD600');
    expect(res.replyText.toLowerCase()).toContain('od600');
  });

  it('handles conversational status queries', async () => {
    const res = await handleGenerateAssistantReply({
      transcript: 'Hey KOCH what is your status?',
    });

    expect(res).toBeDefined();
    expect(typeof res.replyText).toBe('string');
    expect(res.replyText.length).toBeGreaterThan(5);
  });
});
