/**
 * test/integration/koch-backend.test.ts
 *
 * End-to-end integration test for Project K.O.C.H. backend.
 *
 * Executes a full simulated culturomics experiment lifecycle:
 *   A - Start Experiment
 *   B - Setup Plate & Well Coordinates
 *   C - Ingest Voice Intent (MARK_WELL)
 *   D - Ingest Camera Frame Mark
 *   E - Request Cloud Colony Detection
 *   F - Request Pathway Recipe Recommendation
 *   G - End Experiment
 *   H - Generate ELN Documents & Standardized Exports
 *
 * Architecture note:
 *   We call service and repository functions directly -- NOT createServerFn
 *   wrappers -- because createServerFn requires the TanStack Start / Nitro
 *   runtime context (HTTP request objects, middleware chains) that is not
 *   available in a plain Node.js script. Direct layer testing is the correct
 *   and comprehensive approach: it exercises the same business logic code paths
 *   as the server functions, minus the HTTP/RPC transport layer.
 *
 * Run: npx tsx test/integration/koch-backend.test.ts
 */

// Unset cloud vision env vars so the perception service uses the deterministic mock
delete process.env.CLOUD_VISION_ENDPOINT;
delete process.env.CLOUD_VISION_API_KEY;

import {
  createExperiment,
  updateExperimentStatus,
  createPlateWithWells,
  getWellByCoordinate,
  logTelemetryEvent,
  createColonyDetection,
  getColonyDetectionsByWell,
  saveElnReport,
  getExperimentById,
  ExperimentStatus,
  EventType,
  ReportFormat,
} from '../../src/server/db/repositories';

import {
  initActiveState,
  getActiveStateSnapshot,
  updateActiveState,
  clearActiveState,
  type ActiveCoordinate,
} from '../../src/server/services/state';

import {
  analyzeColonyFrame,
  calculatePathwayRecommendation,
} from '../../src/server/services/perception';

import { compileElnDocument } from '../../src/server/services/eln';
import { compileStandardizedExport } from '../../src/server/services/export';
import { Prisma } from '@prisma/client';

// ---- Test harness ------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log('  OK  ' + message);
    passed++;
  } else {
    console.error('  FAIL: ' + message);
    failed++;
    failures.push(message);
  }
}

function assertNotNull<T>(value: T | null | undefined, message: string): T {
  if (value !== null && value !== undefined) {
    console.log('  OK  ' + message);
    passed++;
    return value;
  }
  console.error('  FAIL (null/undefined): ' + message);
  failed++;
  failures.push(message);
  throw new Error('Assertion failed -- value is null/undefined: ' + message);
}

function section(label: string): void {
  console.log('\n' + '-'.repeat(72));
  console.log('  ' + label);
  console.log('-'.repeat(72));
}

// ---- Full lifecycle test -----------------------------------------------------

async function runLifecycleTest(): Promise<void> {
  console.log('\n========================================================================');
  console.log('  K.O.C.H. Backend -- Full Lifecycle Integration Test');
  console.log('========================================================================\n');

  // ---- Step A: Start Experiment -----------------------------------------------
  section('Step A: Start Experiment');

  const experiment = await createExperiment('Culturomics Run Alpha - E2E Verification');
  initActiveState(experiment.id);

  assert(!!experiment.id && experiment.id.length > 0, 'experiment.id is a non-empty CUID');
  assert(experiment.status === ExperimentStatus.ACTIVE,
    'experiment.status is ACTIVE (got: ' + experiment.status + ')');
  assert(experiment.name === 'Culturomics Run Alpha - E2E Verification', 'experiment.name matches input');

  const stateAfterStart = getActiveStateSnapshot(experiment.id);
  assertNotNull(stateAfterStart, 'getActiveStateSnapshot returns non-null after initActiveState');
  assert(stateAfterStart!.experimentId === experiment.id, 'activeState.experimentId matches experiment.id');
  assert(Array.isArray(stateAfterStart!.activeTubeIds) && stateAfterStart!.activeTubeIds.length === 0,
    'activeTubeIds initialised as empty array');
  assert(stateAfterStart!.activeCoordinate === null, 'activeCoordinate initialised as null');
  assert(Array.isArray(stateAfterStart!.timerMarks) && stateAfterStart!.timerMarks.length === 0,
    'timerMarks initialised as empty array');
  assert(typeof stateAfterStart!.startedAtIso === 'string', 'startedAtIso is a string timestamp');

  const experimentId = experiment.id;

  // ---- Step B: Setup Plate & Well Coordinates ---------------------------------
  section('Step B: Setup Plate & Well Coordinates');

  const plate = await createPlateWithWells(experimentId, 'Plate 1', ['C7', 'C8', 'D1']);

  assert(!!plate.id, 'plate.id is defined');
  assert(plate.label === 'Plate 1', 'plate.label is "Plate 1" (got: ' + plate.label + ')');
  assert(plate.wells.length === 3, 'plate has 3 wells (got: ' + plate.wells.length + ')');

  const wellCoordinates = plate.wells.map(w => w.coordinate).sort();
  assert(
    JSON.stringify(wellCoordinates) === JSON.stringify(['C7', 'C8', 'D1'].sort()),
    'wells have coordinates C7, C8, D1 (got: ' + wellCoordinates.join(', ') + ')'
  );

  const wellC7 = await getWellByCoordinate(plate.id, 'C7');
  assertNotNull(wellC7, 'getWellByCoordinate resolves C7 to a Well row');
  assert(wellC7!.coordinate === 'C7', 'wellC7.coordinate is "C7" (got: ' + wellC7!.coordinate + ')');
  assert(wellC7!.plateId === plate.id, 'wellC7.plateId matches plate.id');

  // ---- Step C: Ingest Voice Intent --------------------------------------------
  section('Step C: Ingest Voice Intent -- "Mark plate 1 well C7"');

  const now = new Date();

  const utteranceEvent = await logTelemetryEvent({
    experimentId,
    type: EventType.VOICE_UTTERANCE,
    rawPayload: { transcript: 'Mark plate 1 well C7' } as Prisma.InputJsonValue,
    frameTimestamp: now,
  });

  assert(!!utteranceEvent.id, 'VOICE_UTTERANCE event created with id');
  assert(utteranceEvent.type === EventType.VOICE_UTTERANCE,
    'utteranceEvent.type is VOICE_UTTERANCE (got: ' + utteranceEvent.type + ')');
  assert(utteranceEvent.experimentId === experimentId, 'utteranceEvent.experimentId matches experiment');

  const intentPayload: Prisma.InputJsonValue = {
    action: 'MARK_WELL',
    plateLabel: 'Plate 1',
    plateId: plate.id,
    wellCoordinate: 'C7',
    wellId: wellC7!.id,
  };

  const intentEvent = await logTelemetryEvent({
    experimentId,
    wellId: wellC7!.id,
    type: EventType.INTENT,
    rawPayload: intentPayload,
    frameTimestamp: now,
  });

  assert(!!intentEvent.id, 'INTENT event created with id');
  assert(intentEvent.type === EventType.INTENT, 'intentEvent.type is INTENT (got: ' + intentEvent.type + ')');
  assert(intentEvent.wellId === wellC7!.id, 'intentEvent.wellId is linked to wellC7');
  assert(intentEvent.id !== utteranceEvent.id, 'INTENT and VOICE_UTTERANCE are separate immutable rows');

  const activeCoord: ActiveCoordinate = {
    plateLabel: 'Plate 1',
    plateId: plate.id,
    wellCoordinate: 'C7',
    wellId: wellC7!.id,
  };
  updateActiveState(experimentId, { activeCoordinate: activeCoord });

  const stateAfterIntent = getActiveStateSnapshot(experimentId);
  assert(stateAfterIntent?.activeCoordinate !== null, 'activeCoordinate is no longer null after MARK_WELL');
  assert(stateAfterIntent?.activeCoordinate?.wellCoordinate === 'C7',
    'activeCoordinate.wellCoordinate is "C7" (got: ' + stateAfterIntent?.activeCoordinate?.wellCoordinate + ')');
  assert(stateAfterIntent?.activeCoordinate?.plateLabel === 'Plate 1', 'activeCoordinate.plateLabel is "Plate 1"');
  assert(stateAfterIntent?.activeCoordinate?.wellId === wellC7!.id, 'activeCoordinate.wellId matches wellC7.id');

  // ---- Step D: Ingest Camera Frame Mark ---------------------------------------
  section('Step D: Ingest Camera Frame Mark');

  const frameTimestamp = new Date();

  const frameMarkEvent = await logTelemetryEvent({
    experimentId,
    wellId: wellC7!.id,
    type: EventType.FRAME_MARK,
    rawPayload: { frameTimestamp: frameTimestamp.toISOString() } as Prisma.InputJsonValue,
    frameTimestamp,
  });

  assert(!!frameMarkEvent.id, 'FRAME_MARK event created with id');
  assert(frameMarkEvent.type === EventType.FRAME_MARK,
    'frameMarkEvent.type is FRAME_MARK (got: ' + frameMarkEvent.type + ')');
  assert(frameMarkEvent.wellId === wellC7!.id, 'frameMarkEvent.wellId linked to wellC7');
  assert(frameMarkEvent.frameTimestamp !== null, 'frameMarkEvent.frameTimestamp is set');

  const eventIds = new Set([utteranceEvent.id, intentEvent.id, frameMarkEvent.id]);
  assert(eventIds.size === 3, 'All 3 telemetry events are unique rows (append-only constraint verified)');

  // ---- Step E: Request Cloud Colony Detection ----------------------------------
  section('Step E: Request Cloud Colony Detection');

  const cvResult = await analyzeColonyFrame(wellC7!.id, 'frame_c7_001.png');

  assert(
    typeof cvResult.confidence === 'number' && cvResult.confidence >= 0 && cvResult.confidence <= 1,
    'cvResult.confidence is a number in [0,1] (got: ' + cvResult.confidence.toFixed(4) + ')'
  );
  assert(
    typeof cvResult.colonyCount === 'number' && cvResult.colonyCount >= 0,
    'cvResult.colonyCount is a non-negative number (got: ' + cvResult.colonyCount + ')'
  );
  assert(
    typeof cvResult.cvProvider === 'string' && cvResult.cvProvider.length > 0,
    'cvResult.cvProvider is a non-empty string (got: "' + cvResult.cvProvider + '")'
  );

  const detectionRecord = await createColonyDetection({
    wellId: wellC7!.id,
    confidence: cvResult.confidence,
    growthVelocity: cvResult.growthVelocity ?? undefined,
    cvProvider: cvResult.cvProvider,
  });

  assert(!!detectionRecord.id, 'ColonyDetection record created with id');
  assert(detectionRecord.wellId === wellC7!.id, 'detectionRecord.wellId matches wellC7.id');
  assert(detectionRecord.confidence === cvResult.confidence,
    'detectionRecord.confidence matches cvResult (got: ' + detectionRecord.confidence.toFixed(4) + ')');
  assert(detectionRecord.cvProvider === cvResult.cvProvider,
    'detectionRecord.cvProvider matches cvResult (got: "' + detectionRecord.cvProvider + '")');

  console.log('       Colony count: ' + cvResult.colonyCount);
  console.log('       Growth velocity: ' + (cvResult.growthVelocity !== null ? cvResult.growthVelocity.toFixed(2) + ' um2/hr' : 'null'));
  console.log('       CV provider: ' + cvResult.cvProvider);

  // ---- Step F: Request Pathway Recipe Recommendation --------------------------
  section('Step F: Request Pathway Recipe Recommendation');

  const detections = await getColonyDetectionsByWell(wellC7!.id);
  assert(detections.length >= 1, 'getColonyDetectionsByWell returns >= 1 record (got: ' + detections.length + ')');

  const recentWithVelocity = detections.filter(d => d.growthVelocity !== null).slice(-5);
  let representativeVelocity = 0;
  if (recentWithVelocity.length > 0) {
    representativeVelocity = recentWithVelocity.reduce((acc, d) => acc + (d.growthVelocity ?? 0), 0)
      / recentWithVelocity.length;
  }

  const recommendation = calculatePathwayRecommendation(wellC7!.id, representativeVelocity);

  assert(recommendation.wellId === wellC7!.id, 'recommendation.wellId matches wellC7.id');
  assert(typeof recommendation.growthVelocity === 'number',
    'recommendation.growthVelocity is a number (got: ' + recommendation.growthVelocity + ')');
  assert(Array.isArray(recommendation.adjustments), 'recommendation.adjustments is an array');
  assert(
    typeof recommendation.voiceConfirmation === 'string' && recommendation.voiceConfirmation.trim().length > 0,
    'voiceConfirmation is a non-empty string (got: "' + recommendation.voiceConfirmation + '")'
  );

  const wordCount = recommendation.voiceConfirmation.trim().split(/\s+/).length;
  assert(
    wordCount >= 3 && wordCount <= 5,
    'voiceConfirmation is 3-5 words (got: ' + wordCount + ' words -- "' + recommendation.voiceConfirmation + '")'
  );
  assert(typeof recommendation.evaluatedAt === 'string', 'recommendation.evaluatedAt is a string timestamp');

  if (recommendation.adjustments.length > 0) {
    const adj = recommendation.adjustments[0];
    assert(typeof adj.target === 'string' && adj.target.length > 0,
      'adjustment[0].target is a non-empty string (got: "' + adj.target + '")');
    assert(typeof adj.action === 'string' && adj.action.length > 0, 'adjustment[0].action is a non-empty string');
    assert(['LOW', 'MEDIUM', 'HIGH'].includes(adj.urgency),
      'adjustment[0].urgency is LOW|MEDIUM|HIGH (got: "' + adj.urgency + '")');
  }

  console.log('       Velocity used: ' + representativeVelocity.toFixed(2) + ' um2/hr');
  console.log('       Voice confirmation: "' + recommendation.voiceConfirmation + '"');
  console.log('       Adjustments: ' + recommendation.adjustments.length);

  // ---- Step G: End Experiment -------------------------------------------------
  section('Step G: End Experiment');

  const updatedExperiment = await updateExperimentStatus(experimentId, ExperimentStatus.COMPLETED);
  clearActiveState(experimentId);

  assert(updatedExperiment.id === experimentId, 'updatedExperiment.id matches original experimentId');
  assert(updatedExperiment.status === ExperimentStatus.COMPLETED,
    'updatedExperiment.status is COMPLETED (got: ' + updatedExperiment.status + ')');

  const stateAfterEnd = getActiveStateSnapshot(experimentId);
  assert(stateAfterEnd === null, 'getActiveStateSnapshot returns null after clearActiveState');

  // ---- Step H: Generate ELN Documents & Standardized Exports ------------------
  section('Step H: Generate ELN Documents & Standardized Exports');

  // H1: Markdown ELN
  const markdownResult = await compileElnDocument(experimentId, 'MARKDOWN');

  assert(markdownResult.format === 'MARKDOWN', 'markdownResult.format is MARKDOWN (got: ' + markdownResult.format + ')');
  assert(typeof markdownResult.content === 'string' && markdownResult.content.length > 0,
    'markdownResult.content is a non-empty string');
  assert(markdownResult.content.includes('K.O.C.H. Electronic Lab Notebook'), 'ELN contains document title');
  assert(markdownResult.content.includes(experimentId), 'ELN contains experiment ID (audit traceability)');
  assert(markdownResult.content.includes('Telemetry Event Timeline'), 'ELN contains telemetry timeline section');
  assert(markdownResult.content.includes('Micro-Colony Detection Log'), 'ELN contains colony detection section');
  assert(markdownResult.content.includes('Audit Trail'), 'ELN contains audit trail section');
  assert(markdownResult.content.includes(utteranceEvent.id), 'Audit trail contains VOICE_UTTERANCE event ID');
  assert(markdownResult.content.includes(intentEvent.id), 'Audit trail contains INTENT event ID');
  assert(markdownResult.content.includes(frameMarkEvent.id), 'Audit trail contains FRAME_MARK event ID');
  assert(
    typeof markdownResult.storageUrl === 'string' && markdownResult.storageUrl.startsWith('eln://'),
    'markdownResult.storageUrl has eln:// scheme (got: "' + markdownResult.storageUrl + '")'
  );

  const elnMarkdownRecord = await saveElnReport({
    experimentId,
    format: ReportFormat.MARKDOWN,
    storageUrl: markdownResult.storageUrl,
  });

  assert(!!elnMarkdownRecord.id, 'ElnReport (MARKDOWN) record created with id');
  assert(elnMarkdownRecord.format === ReportFormat.MARKDOWN, 'ElnReport.format is MARKDOWN');
  assert(elnMarkdownRecord.storageUrl === markdownResult.storageUrl, 'ElnReport.storageUrl matches compiled storageUrl');

  // H2: JSON Export
  const jsonResult = await compileStandardizedExport(experimentId, 'JSON');

  assert(jsonResult.format === 'JSON', 'jsonResult.format is JSON (got: ' + jsonResult.format + ')');
  assert(typeof jsonResult.content === 'string' && jsonResult.content.length > 0,
    'jsonResult.content is a non-empty string');

  let jsonArchive: Record<string, unknown>;
  try {
    jsonArchive = JSON.parse(jsonResult.content) as Record<string, unknown>;
    assert(true, 'jsonResult.content parses as valid JSON');
  } catch {
    assert(false, 'jsonResult.content is valid JSON');
    throw new Error('JSON parse failed');
  }

  assert(jsonArchive['schemaVersion'] === '1.0',
    'JSON archive schemaVersion is "1.0" (got: ' + jsonArchive['schemaVersion'] + ')');
  assert(typeof jsonArchive['exportedAt'] === 'string', 'JSON archive exportedAt is a string');

  const archiveExp = jsonArchive['experiment'] as Record<string, unknown>;
  assert(archiveExp?.['id'] === experimentId, 'JSON archive experiment.id matches experimentId');
  assert(archiveExp?.['status'] === 'COMPLETED',
    'JSON archive experiment.status is COMPLETED (got: ' + archiveExp?.['status'] + ')');
  assert(
    Array.isArray(archiveExp?.['plates']) && (archiveExp['plates'] as unknown[]).length >= 1,
    'JSON archive contains >= 1 plate'
  );

  const archivePlates = archiveExp['plates'] as Array<Record<string, unknown>>;
  const archiveWells = archivePlates[0]?.['wells'] as Array<Record<string, unknown>>;
  assert(
    Array.isArray(archiveWells) && archiveWells.length === 3,
    'JSON archive plate[0] has 3 wells (got: ' + archiveWells?.length + ')'
  );

  const c7Well = archiveWells.find(w => w['coordinate'] === 'C7') as Record<string, unknown> | undefined;
  assert(!!c7Well, 'JSON archive contains well C7');
  const c7Detections = c7Well?.['colonyDetections'] as unknown[] | undefined;
  assert(
    Array.isArray(c7Detections) && c7Detections.length >= 1,
    'JSON archive well C7 has >= 1 colony detection (got: ' + (c7Detections?.length ?? 0) + ')'
  );

  assert(
    typeof jsonResult.storageUrl === 'string' && jsonResult.storageUrl.startsWith('export://'),
    'jsonResult.storageUrl has export:// scheme (got: "' + jsonResult.storageUrl + '")'
  );

  const jsonExportRecord = await saveElnReport({
    experimentId,
    format: ReportFormat.JSON,
    storageUrl: jsonResult.storageUrl,
  });

  assert(!!jsonExportRecord.id, 'ElnReport (JSON) record created with id');
  assert(jsonExportRecord.format === ReportFormat.JSON, 'ElnReport.format is JSON');

  // H3: Both reports queryable from DB
  const finalExp = await getExperimentById(experimentId);
  assertNotNull(finalExp, 'getExperimentById returns experiment after reports are saved');
  assert(finalExp!.elnReports.length >= 2,
    'Experiment has >= 2 ElnReport records (got: ' + finalExp!.elnReports.length + ')');

  const reportFormats = finalExp!.elnReports.map(r => r.format);
  assert(reportFormats.includes(ReportFormat.MARKDOWN), 'Experiment has a MARKDOWN ElnReport');
  assert(reportFormats.includes(ReportFormat.JSON), 'Experiment has a JSON ElnReport');

  console.log('\n       Markdown ELN : ' + markdownResult.storageUrl);
  console.log('       JSON Export  : ' + jsonResult.storageUrl);
  console.log('       Markdown size: ' + markdownResult.content.length.toLocaleString() + ' chars');
  console.log('       JSON size    : ' + jsonResult.content.length.toLocaleString() + ' chars');
}

// ---- Entry point -------------------------------------------------------------

async function main(): Promise<void> {
  try {
    await runLifecycleTest();
  } catch (err) {
    console.error('\n  FATAL TEST ERROR:', err);
    failed++;
    failures.push(String(err));
  }

  console.log('\n========================================================================');
  console.log('  Test Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================================================\n');

  if (failures.length > 0) {
    console.error('Failed assertions:');
    failures.forEach((f, i) => console.error('  ' + (i + 1) + '. ' + f));
    console.log('');
  }

  const exitCode = failed > 0 ? 1 : 0;
  if (exitCode === 0) {
    console.log('ALL TESTS PASSED -- K.O.C.H. backend is system-ready.\n');
  } else {
    console.log('SOME TESTS FAILED -- review output above.\n');
  }
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
