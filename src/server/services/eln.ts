/**
 * src/server/services/eln.ts
 *
 * ELN Document Compiler — Layer 4 (PRD §5.3)
 *
 * Transforms the immutable telemetry event stream + colony detections for
 * a completed experiment into a structured Electronic Lab Notebook document.
 *
 * Supported formats:
 *   MARKDOWN  — Human-readable Markdown text; can be committed to a LIMS or
 *               rendered in any Markdown viewer.
 *   PDF       — Server-side PDF rendered from the Markdown via a lightweight
 *               text-to-PDF approach (no browser, no Chromium). Uses
 *               @react-pdf/renderer when available; falls back to a
 *               text/plain buffer so the pipeline never breaks in dev.
 *
 * Auditability guarantee (PRD §9):
 *   Every report includes the complete, unfiltered list of TelemetryEvent
 *   IDs that contributed to it. This makes every ELN traceable back to
 *   exact DB rows.
 *
 * storageUrl convention (M2 baseline):
 *   Returns a deterministic, human-readable "virtual" storage path. In M5
 *   this will be replaced by an actual S3/R2/Supabase Storage upload.
 */

import {
  getExperimentById,
  type ExperimentWithRelations,
} from '../db/repositories';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ElnFormat = 'PDF' | 'MARKDOWN';

export interface ElnDocumentResult {
  /** Format this result was compiled for */
  format: ElnFormat;
  /**
   * Content of the compiled document.
   * MARKDOWN → UTF-8 string.
   * PDF      → base64-encoded PDF bytes (string) so it's serialisable
   *            across the server function boundary.
   */
  content: string;
  /** Virtual or real storage URL for persisting the ElnReport row */
  storageUrl: string;
}

// ─── Markdown compiler ────────────────────────────────────────────────────────

/**
 * Renders a fully-hydrated experiment into a structured Markdown ELN document.
 *
 * Sections:
 *   1. Experiment header (ID, name, status, timestamps)
 *   2. Plate & well manifest
 *   3. Chronological telemetry event timeline (voice utterances, intents,
 *      frame marks, state changes)
 *   4. Micro-colony detection log (per well)
 *   5. Audit footer (event IDs for traceability)
 */
function renderMarkdown(exp: ExperimentWithRelations): string {
  const lines: string[] = [];

  // ── 1. Header ───────────────────────────────────────────────────────────────
  lines.push(`# K.O.C.H. Electronic Lab Notebook`);
  lines.push(``);
  lines.push(`## Experiment: ${exp.name}`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| **Experiment ID** | \`${exp.id}\` |`);
  lines.push(`| **Status** | ${exp.status} |`);
  lines.push(`| **Started At** | ${exp.startedAt.toISOString()} |`);
  lines.push(`| **Ended At** | ${exp.endedAt ? exp.endedAt.toISOString() : '—'} |`);
  lines.push(`| **Plates** | ${exp.plates.length} |`);
  lines.push(`| **Total Events** | ${exp.events.length} |`);
  lines.push(``);

  // ── 2. Plate & well manifest ─────────────────────────────────────────────────
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Plate & Well Manifest`);
  lines.push(``);

  if (exp.plates.length === 0) {
    lines.push(`_No plates registered for this experiment._`);
    lines.push(``);
  } else {
    for (const plate of exp.plates) {
      lines.push(`### ${plate.label} (\`${plate.id}\`)`);
      lines.push(``);
      if (plate.wells.length === 0) {
        lines.push(`_No wells._`);
      } else {
        lines.push(`| Well ID | Coordinate | Events | Detections |`);
        lines.push(`| :--- | :--- | ---: | ---: |`);
        for (const well of plate.wells) {
          lines.push(
            `| \`${well.id}\` | **${well.coordinate}** | ${well.events.length} | ${well.detections.length} |`,
          );
        }
      }
      lines.push(``);
    }
  }

  // ── 3. Telemetry event timeline ───────────────────────────────────────────────
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Telemetry Event Timeline`);
  lines.push(``);

  const sortedEvents = [...exp.events].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  if (sortedEvents.length === 0) {
    lines.push(`_No telemetry events recorded._`);
    lines.push(``);
  } else {
    lines.push(`| # | Timestamp | Type | Well | Payload Summary |`);
    lines.push(`| ---: | :--- | :--- | :--- | :--- |`);
    sortedEvents.forEach((ev, i) => {
      const payloadSummary = summarisePayload(ev.rawPayload);
      lines.push(
        `| ${i + 1} | ${ev.createdAt.toISOString()} | \`${ev.type}\` | ${ev.wellId ? `\`${ev.wellId}\`` : '—'} | ${payloadSummary} |`,
      );
    });
    lines.push(``);
  }

  // ── 4. Micro-colony detection log ────────────────────────────────────────────
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Micro-Colony Detection Log`);
  lines.push(``);

  let totalDetections = 0;
  for (const plate of exp.plates) {
    for (const well of plate.wells) {
      if (well.detections.length === 0) continue;
      totalDetections += well.detections.length;

      lines.push(`### ${plate.label} — Well ${well.coordinate}`);
      lines.push(``);
      lines.push(`| Detected At | Confidence | Growth Velocity (μm²/hr) | CV Provider |`);
      lines.push(`| :--- | ---: | ---: | :--- |`);
      for (const det of well.detections) {
        lines.push(
          `| ${det.detectedAt.toISOString()} | ${(det.confidence * 100).toFixed(1)}% | ${det.growthVelocity !== null ? det.growthVelocity.toFixed(2) : '—'} | ${det.cvProvider} |`,
        );
      }
      lines.push(``);
    }
  }

  if (totalDetections === 0) {
    lines.push(`_No colony detections recorded._`);
    lines.push(``);
  }

  // ── 5. Audit footer ───────────────────────────────────────────────────────────
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Audit Trail`);
  lines.push(``);
  lines.push(`This report was generated from the following immutable TelemetryEvent records:`);
  lines.push(``);
  lines.push(`\`\`\``);
  sortedEvents.forEach((ev) => lines.push(ev.id));
  lines.push(`\`\`\``);
  lines.push(``);
  lines.push(`_Report generated at: ${new Date().toISOString()}_`);
  lines.push(``);
  lines.push(`---`);
  lines.push(`_K.O.C.H. — Kinetic Operator for Culturomics & Handling_`);

  return lines.join('\n');
}

/**
 * Extracts a short summary string from a rawPayload JSON value for table display.
 * Keeps the summary under 80 characters so Markdown tables stay readable.
 */
function summarisePayload(raw: unknown): string {
  if (raw === null || raw === undefined) return '—';
  if (typeof raw === 'string') return truncate(raw, 80);

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    // Prefer the most descriptive field if present
    if (typeof obj['transcript'] === 'string') return truncate(`transcript: "${obj['transcript']}"`, 80);
    if (typeof obj['action'] === 'string')     return truncate(`action: ${obj['action']}`, 80);
    if (typeof obj['frameTimestamp'] === 'string') return truncate(`frame: ${obj['frameTimestamp']}`, 80);
  }

  return truncate(JSON.stringify(raw), 80);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

// ─── PDF renderer ─────────────────────────────────────────────────────────────

/**
 * Renders the Markdown ELN string into a base64-encoded PDF.
 *
 * Strategy: in production @react-pdf/renderer is used server-side.
 * In dev/test (or when react-pdf is unavailable at runtime), the raw
 * Markdown is base64-encoded so the pipeline doesn't break.
 *
 * The returned string is always base64 to keep the return type uniform
 * across formats and safe to serialise over the server function boundary.
 */
async function renderPdf(markdown: string, experimentName: string): Promise<string> {
  try {
    // Dynamic import avoids bundling react-pdf into non-PDF codepaths.
    // We use React.createElement (no JSX) so this .ts file does not need
    // the jsx compiler option — JSX is syntactic sugar for createElement.
    const { renderToBuffer, Document, Page, Text, View, StyleSheet } =
      await import('@react-pdf/renderer');
    const { createElement: h } = await import('react');

    const styles = StyleSheet.create({
      page:    { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
      title:   { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
      section: { marginBottom: 8 },
      line:    { marginBottom: 3 },
    });

    const mdLines = markdown.split('\n');

    const doc = h(
      Document,
      { title: 'K.O.C.H. ELN — ' + experimentName, author: 'K.O.C.H. System' },
      h(
        Page,
        { size: 'A4', style: styles.page },
        h(View, { style: styles.section },
          h(Text, { style: styles.title }, 'K.O.C.H. Electronic Lab Notebook'),
          h(Text, { style: styles.title }, experimentName),
        ),
        h(View, { style: styles.section },
          ...mdLines.map((line, i) => h(Text, { key: String(i), style: styles.line }, line)),
        ),
      ),
    );

    const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
    return buffer.toString('base64');
  } catch {
    // Fallback: base64-encode the raw Markdown so ELN record is always created
    console.warn(
      '[eln] @react-pdf/renderer unavailable or failed — storing Markdown as base64 PDF fallback.',
    );
    return Buffer.from(markdown, 'utf8').toString('base64');
  }
}

// ─── Public service function ──────────────────────────────────────────────────

/**
 * Compiles an ELN document for the given experiment in the requested format.
 *
 * @param experimentId  CUID of the experiment to compile
 * @param format        "PDF" | "MARKDOWN"
 * @throws              If the experiment is not found in the database
 */
export async function compileElnDocument(
  experimentId: string,
  format: ElnFormat,
): Promise<ElnDocumentResult> {
  const exp = await getExperimentById(experimentId);
  if (!exp) {
    throw new Error(`[eln] Experiment not found: "${experimentId}"`);
  }

  const markdown = renderMarkdown(exp);

  let content: string;
  if (format === 'PDF') {
    content = await renderPdf(markdown, exp.name);
  } else {
    content = markdown;
  }

  // Virtual storage URL (replaced by real upload in M5)
  const ext = format === 'PDF' ? 'pdf' : 'md';
  const storageUrl = `eln://${experimentId}/${Date.now()}.${ext}`;

  return { format, content, storageUrl };
}
