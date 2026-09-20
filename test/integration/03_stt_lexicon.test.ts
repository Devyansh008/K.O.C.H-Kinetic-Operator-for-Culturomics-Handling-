import assert from 'node:assert';
import { resolveIntent } from '../../src/server/webhooks/voice-pipeline';
import { ingestVoiceIntent } from '../../src/server/functions/telemetry';
import { retryFailedUtterance, getVoiceAuditLogs } from '../../src/server/functions/voice';
import { startExperiment } from '../../src/server/functions/experiment';
import prisma from '../../src/lib/prisma';

import { runWithStartContext } from '@tanstack/start-storage-context';

const dummyContext = {
  request: new Request('http://localhost'),
  responseHeaders: new Headers(),
};

async function callFn(serverFn: any, data: any = {}) {
  return await runWithStartContext(dummyContext, async () => {
    return await serverFn({ data });
  });
}

async function runTest() {
  console.log('Testing Lexicon resolution...');
  
  // 1. Lexicon parsing accuracy
  const p1 = resolveIntent('mark plate 4 well P24');
  assert.equal(p1.action, 'MARK_WELL_PENDING');
  assert.equal((p1 as any).wellCoordinate, 'P24');

  const p2 = resolveIntent('measure od600');
  assert.equal(p2.action, 'RECORD_OD600');

  const p3 = resolveIntent('add culture Akkermansia');
  assert.equal(p3.action, 'ADD_CULTURE');
  assert.equal((p3 as any).culture, 'Akkermansia');

  const p4 = resolveIntent('set environment anaerobic');
  assert.equal(p4.action, 'SET_ENVIRONMENT');
  assert.equal((p4 as any).environment, 'anaerobic');
  
  const p5 = resolveIntent('set 5% co2');
  assert.equal(p5.action, 'SET_ENVIRONMENT');
  assert.equal((p5 as any).environment, '5% CO2');

  console.log('Lexicon parsing tests passed.');

  // 2. Setup Experiment for DB tests
  console.log('Testing DB operations (Append-only & Zod validation)...');
  const expRes: any = await callFn(startExperiment, { name: 'STT Lexicon Test' });
  const exp = expRes?.result !== undefined ? expRes.result : expRes;
  console.log('EXP IS:', exp);
  const experimentId = exp.id;

  // 3. Zod validation rejection on invalid well coordinates ("Z99")
  let zodFailed = false;
  try {
    await callFn(ingestVoiceIntent, {
      experimentId,
      transcript: 'mark well Z99',
      intent: {
        action: 'MARK_WELL',
        wellCoordinate: 'Z99'
      }
    });
  } catch (err: any) {
    if (err.name === 'ZodError' || err.issues) {
      zodFailed = true;
    }
  }
  assert.equal(zodFailed, true, 'Should reject invalid well coordinate Z99');
  console.log('Zod validation test passed.');

  // 4. Append-only persistence (ingestVoiceIntent & retryFailedUtterance)
  await callFn(ingestVoiceIntent, {
    experimentId,
    transcript: 'measure od600',
    intent: { action: 'RECORD_OD600' }
  });

  await callFn(retryFailedUtterance, {
    experimentId,
    rawTranscript: 'measure something',
    correctedTranscript: 'measure od600'
  });

  const auditLogsRes: any = await callFn(getVoiceAuditLogs, {
    experimentId
  });
  const auditLogs = auditLogsRes?.result !== undefined ? auditLogsRes.result : auditLogsRes;
  
  assert.equal(auditLogs.entries.length, 2, 'Should have exactly 2 VoiceIntentLog entries appended');
  
  const statuses = await prisma.voiceIntentLog.findMany({ where: { experimentId } });
  const hasRetried = statuses.some((s: any) => s.status === 'RETRIED');
  const hasProcessed = statuses.some((s: any) => s.status === 'PROCESSED');
  assert.equal(hasRetried, true, 'Should have a RETRIED status log');
  assert.equal(hasProcessed, true, 'Should have a PROCESSED status log');

  console.log('Append-only DB persistence tests passed.');
  console.log('All tests passed successfully.');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
