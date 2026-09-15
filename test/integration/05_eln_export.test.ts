/**
 * test/integration/05_eln_export.test.ts
 *
 * Pillar 5: ELN Report & ISA-Tab Compiler Tests
 * Verifies end-to-end document compilation, LIMS JSON, and ISA-Tab standardized exports.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { callFn } from './helper';
import { startExperiment, updateExperimentStatus } from '../../src/server/functions/experiment';
import { configurePlateLayout, updateWellState } from '../../src/server/functions/plate';
import { ingestVoiceIntent, ingestFrameMark } from '../../src/server/functions/telemetry';
import { generateElnReport, downloadElnReport, exportStandardized } from '../../src/server/functions/eln';
import { ExperimentStatus, ReportFormat } from '../../src/server/db/repositories';

describe('Pillar 5: ELN Report & ISA-Tab Compiler Tests', () => {
  let experimentId: string;
  let plateId: string;
  let wellC3Id: string;

  beforeEach(async () => {
    const exp = await callFn<any, any>(startExperiment, { name: 'ELN Compliance Run 2026' });
    experimentId = exp.id;

    const plate = await callFn<any, any>(configurePlateLayout, {
      experimentId,
      label: 'Plate 1',
      wellCount: 24,
      media: 'Nutrient Agar',
    });
    plateId = plate.id;
    const well = plate.wells.find((w: any) => w.coordinate === 'C3');
    wellC3Id = well.id;

    // Log telemetry events
    await callFn(ingestVoiceIntent, {
      experimentId,
      transcript: 'mark plate 1 well C3',
      intent: { action: 'MARK_WELL', plateLabel: 'Plate 1', wellCoordinate: 'C3', wellId: wellC3Id },
    });

    await callFn(updateWellState, {
      experimentId,
      plateId,
      coordinate: 'C3',
      state: { opticalDensity600: 0.58 },
      notes: 'Colony isolated',
    });

    await callFn(ingestFrameMark, {
      experimentId,
      wellId: wellC3Id,
      frameTimestamp: new Date(),
    });

    await callFn(updateExperimentStatus, {
      experimentId,
      status: ExperimentStatus.COMPLETED,
    });
  });

  it('should generate and persist ELN report records in Markdown format', async () => {
    const reportRecord = await callFn<any, any>(generateElnReport, {
      experimentId,
      format: 'MARKDOWN',
    });

    expect(reportRecord.id).toBeDefined();
    expect(reportRecord.format).toBe(ReportFormat.MARKDOWN);
    expect(reportRecord.storageUrl).toMatch(/^eln:\/\//);

    // Verify downloadable content
    const downloaded = await callFn<any, any>(downloadElnReport, {
      experimentId,
      format: 'MARKDOWN',
    });

    expect(downloaded.mimeType).toContain('text/markdown');
    expect(downloaded.content).toContain('K.O.C.H. Electronic Lab Notebook');
    expect(downloaded.content).toContain(experimentId);
    expect(downloaded.content).toContain('C3');
  });

  it('should compile standardized LIMS JSON archives with full experiment hierarchy', async () => {
    const jsonExport = await callFn<any, any>(exportStandardized, {
      experimentId,
      format: 'JSON',
    });

    expect(jsonExport.format).toBe(ReportFormat.JSON);
    expect(jsonExport.storageUrl).toMatch(/^export:\/\//);

    // Download and parse JSON content
    const downloaded = await callFn<any, any>(downloadElnReport, {
      experimentId,
      format: 'JSON',
    });

    expect(downloaded.mimeType).toBe('application/json');
    const parsed = JSON.parse(downloaded.content);
    expect(parsed.schemaVersion).toBe('1.0');
    expect(parsed.experiment.id).toBe(experimentId);
    expect(parsed.experiment.status).toBe(ExperimentStatus.COMPLETED);
    expect(parsed.experiment.plates.length).toBeGreaterThanOrEqual(1);
    expect(parsed.experiment.plates[0].wells.some((w: any) => w.coordinate === 'C3')).toBe(true);
  });

  it('should compile standardized ISA-Tab multi-file packages', async () => {
    const isaTabExport = await callFn<any, any>(exportStandardized, {
      experimentId,
      format: 'ISA_TAB',
    });

    expect(isaTabExport.format).toBe(ReportFormat.ISA_TAB);
    expect(isaTabExport.storageUrl).toMatch(/^export:\/\//);

    const downloaded = await callFn<any, any>(downloadElnReport, {
      experimentId,
      format: 'ISA_TAB',
    });

    expect(downloaded.mimeType).toContain('text/tab-separated-values');
    expect(downloaded.content).toContain('ONTOLOGY SOURCE REFERENCE');
    expect(downloaded.content).toContain('INVESTIGATION');
    expect(downloaded.content).toContain('STUDY');
    expect(downloaded.content).toContain('ASSAY');
  });
});
