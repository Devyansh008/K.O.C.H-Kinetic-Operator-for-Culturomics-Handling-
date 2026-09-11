/**
 * src/server/services/export.ts
 *
 * Standardised Bio-Data Export Compiler — Layer 4 (PRD §5.3)
 *
 * Transforms the immutable telemetry + colony detection history of a completed
 * experiment into standardised bio-data formats for LIMS integration and
 * repository archiving.
 *
 * Supported formats:
 *   JSON     — LIMS-compliant structured JSON archive of the full experiment.
 *   ISA_TAB  — ISA-Tab (Investigation / Study / Assay) tab-separated text.
 *              ISA-Tab is the community standard for -omics experiments:
 *              https://isa-specs.readthedocs.io/en/latest/isatab.html
 *
 * storageUrl convention (M2 baseline):
 *   Returns a deterministic virtual path. Replaced by a real storage upload in M5.
 */

import {
  getExperimentById,
  type ExperimentWithRelations,
} from '../db/repositories';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = 'ISA_TAB' | 'JSON';

export interface ExportResult {
  format: ExportFormat;
  /** Serialised export content (UTF-8 string for both formats) */
  content: string;
  /** Virtual or real storage URL for persisting the ElnReport row */
  storageUrl: string;
}

// ─── JSON compiler ────────────────────────────────────────────────────────────

/**
 * Normalised LIMS-compliant JSON archive shape.
 * All dates are ISO-8601 strings; all IDs are CUIDs.
 */
interface LimsJsonArchive {
  schemaVersion: '1.0';
  exportedAt: string;
  experiment: {
    id: string;
    name: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    plates: Array<{
      id: string;
      label: string;
      wells: Array<{
        id: string;
        coordinate: string;
        colonyDetections: Array<{
          id: string;
          detectedAt: string;
          confidence: number;
          growthVelocity: number | null;
          cvProvider: string;
        }>;
        telemetryEvents: Array<{
          id: string;
          type: string;
          createdAt: string;
          frameTimestamp: string | null;
          rawPayload: unknown;
        }>;
      }>;
    }>;
    experimentLevelEvents: Array<{
      id: string;
      type: string;
      createdAt: string;
      wellId: string | null;
      rawPayload: unknown;
    }>;
    elnReports: Array<{
      id: string;
      format: string;
      storageUrl: string;
      generatedAt: string;
    }>;
  };
}

function compileJson(exp: ExperimentWithRelations): string {
  const archive: LimsJsonArchive = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    experiment: {
      id: exp.id,
      name: exp.name,
      status: exp.status,
      startedAt: exp.startedAt.toISOString(),
      endedAt: exp.endedAt ? exp.endedAt.toISOString() : null,
      plates: exp.plates.map((plate) => ({
        id: plate.id,
        label: plate.label,
        wells: plate.wells.map((well) => ({
          id: well.id,
          coordinate: well.coordinate,
          colonyDetections: well.detections.map((d) => ({
            id: d.id,
            detectedAt: d.detectedAt.toISOString(),
            confidence: d.confidence,
            growthVelocity: d.growthVelocity,
            cvProvider: d.cvProvider,
          })),
          telemetryEvents: well.events.map((ev) => ({
            id: ev.id,
            type: ev.type,
            createdAt: ev.createdAt.toISOString(),
            frameTimestamp: ev.frameTimestamp ? ev.frameTimestamp.toISOString() : null,
            rawPayload: ev.rawPayload,
          })),
        })),
      })),
      experimentLevelEvents: exp.events.map((ev) => ({
        id: ev.id,
        type: ev.type,
        createdAt: ev.createdAt.toISOString(),
        wellId: ev.wellId ?? null,
        rawPayload: ev.rawPayload,
      })),
      elnReports: exp.elnReports.map((r) => ({
        id: r.id,
        format: r.format,
        storageUrl: r.storageUrl,
        generatedAt: r.generatedAt.toISOString(),
      })),
    },
  };

  return JSON.stringify(archive, null, 2);
}

// ─── ISA-Tab compiler ─────────────────────────────────────────────────────────

/**
 * Compiles ISA-Tab text from the experiment.
 *
 * ISA-Tab consists of three tab-separated sections joined by a sentinel line:
 *   [Investigation] — top-level metadata
 *   [Study]         — study/experiment descriptors
 *   [Assay]         — per-well measurement records
 *
 * Reference: https://isa-specs.readthedocs.io/en/latest/isatab.html
 *
 * Field names follow ISA-Tab v1.0 vocabulary where applicable.
 * Non-standard K.O.C.H. fields are prefixed with "Comment[koch.*]" as
 * the ISA-Tab spec allows arbitrary comment columns.
 */
function compileIsaTab(exp: ExperimentWithRelations): string {
  const TAB = '\t';
  const NL  = '\n';
  const sections: string[] = [];

  // ── [Investigation] ──────────────────────────────────────────────────────────
  const investigation: string[] = [
    `ONTOLOGY SOURCE REFERENCE`,
    `Term Source Name${TAB}OBI${TAB}NCIT`,
    `Term Source File${TAB}http://purl.obolibrary.org/obo/obi.owl${TAB}http://purl.obolibrary.org/obo/ncit.owl`,
    `Term Source Description${TAB}Ontology for Biomedical Investigations${TAB}NCI Thesaurus`,
    ``,
    `INVESTIGATION`,
    `Investigation Identifier${TAB}${exp.id}`,
    `Investigation Title${TAB}K.O.C.H. Culturomics Experiment`,
    `Investigation Description${TAB}Automated ELN generated by K.O.C.H. — Kinetic Operator for Culturomics & Handling`,
    `Investigation Submission Date${TAB}${exp.startedAt.toISOString().slice(0, 10)}`,
    `Investigation Public Release Date${TAB}${(exp.endedAt ?? new Date()).toISOString().slice(0, 10)}`,
    ``,
    `INVESTIGATION PUBLICATIONS`,
    `Investigation PubMed ID${TAB}`,
    ``,
    `INVESTIGATION CONTACTS`,
    `Investigation Person Last Name${TAB}`,
    `Investigation Person First Name${TAB}`,
    `Investigation Person Email${TAB}`,
    ``,
  ];
  sections.push(investigation.join(NL));

  // ── [Study] ───────────────────────────────────────────────────────────────────
  const studyFileName = `s_${exp.id}.txt`;
  const study: string[] = [
    `STUDY`,
    `Study Identifier${TAB}${exp.id}`,
    `Study Title${TAB}${exp.name}`,
    `Study Description${TAB}Culturomics experiment with ${exp.plates.length} plate(s) and ${exp.events.length} telemetry events`,
    `Study Submission Date${TAB}${exp.startedAt.toISOString().slice(0, 10)}`,
    `Study Public Release Date${TAB}${(exp.endedAt ?? new Date()).toISOString().slice(0, 10)}`,
    `Study File Name${TAB}${studyFileName}`,
    `Comment[Koch.Status]${TAB}${exp.status}`,
    `Comment[Koch.StartedAt]${TAB}${exp.startedAt.toISOString()}`,
    `Comment[Koch.EndedAt]${TAB}${exp.endedAt ? exp.endedAt.toISOString() : ''}`,
    ``,
    `STUDY DESIGN DESCRIPTORS`,
    `Study Design Type${TAB}culturomics${TAB}voice-commanded`,
    ``,
    `STUDY PUBLICATIONS`,
    `Study PubMed ID${TAB}`,
    ``,
    `STUDY FACTORS`,
    `Study Factor Name${TAB}plate_label${TAB}well_coordinate`,
    `Study Factor Type${TAB}plate identifier${TAB}well grid coordinate`,
    ``,
    `STUDY ASSAYS`,
    `Study Assay Measurement Type${TAB}micro-colony detection`,
    `Study Assay Technology Type${TAB}computer vision`,
    `Study Assay Technology Platform${TAB}Cloud CV API`,
    `Study Assay File Name${TAB}a_${exp.id}_colony_detection.txt`,
    ``,
    `STUDY CONTACTS`,
    `Study Person Last Name${TAB}`,
    ``,
  ];
  sections.push(study.join(NL));

  // ── [Assay] — per-well colony detection records ───────────────────────────────
  const assayHeaderCols = [
    'Sample Name',
    'Characteristics[Plate Label]',
    'Characteristics[Well Coordinate]',
    'Protocol REF',
    'Parameter Value[CV Provider]',
    'Data Transformation Name',
    'Derived Data File',
    'Comment[DetectedAt]',
    'Comment[Confidence]',
    'Comment[GrowthVelocity.um2.hr]',
  ];

  const assayRows: string[] = [
    `ASSAY`,
    assayHeaderCols.join(TAB),
  ];

  for (const plate of exp.plates) {
    for (const well of plate.wells) {
      if (well.detections.length === 0) {
        // Include the well even without detections so the manifest is complete
        assayRows.push([
          `${plate.label}_${well.coordinate}`,
          plate.label,
          well.coordinate,
          'Colony Detection Protocol',
          '',
          'cloud-cv-inference',
          '',
          '',
          '',
          '',
        ].join(TAB));
      } else {
        for (const det of well.detections) {
          assayRows.push([
            `${plate.label}_${well.coordinate}`,
            plate.label,
            well.coordinate,
            'Colony Detection Protocol',
            det.cvProvider,
            'cloud-cv-inference',
            `det_${det.id}.json`,
            det.detectedAt.toISOString(),
            det.confidence.toFixed(4),
            det.growthVelocity !== null ? det.growthVelocity.toFixed(4) : '',
          ].join(TAB));
        }
      }
    }
  }

  sections.push(assayRows.join(NL));

  return sections.join(NL);
}

// ─── Public service function ──────────────────────────────────────────────────

/**
 * Compiles a standardised bio-data export for the given experiment.
 *
 * @param experimentId  CUID of the experiment to export
 * @param format        "ISA_TAB" | "JSON"
 * @throws              If the experiment is not found in the database
 */
export async function compileStandardizedExport(
  experimentId: string,
  format: ExportFormat,
): Promise<ExportResult> {
  const exp = await getExperimentById(experimentId);
  if (!exp) {
    throw new Error(`[export] Experiment not found: "${experimentId}"`);
  }

  let content: string;
  let ext: string;

  if (format === 'JSON') {
    content = compileJson(exp);
    ext = 'json';
  } else {
    content = compileIsaTab(exp);
    ext = 'isa.tab';
  }

  // Virtual storage URL (replaced by real upload in M5)
  const storageUrl = `export://${experimentId}/${Date.now()}.${ext}`;

  return { format, content, storageUrl };
}
