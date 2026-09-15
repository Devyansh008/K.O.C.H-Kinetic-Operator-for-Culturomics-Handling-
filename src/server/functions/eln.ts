/**
 * src/server/functions/eln.ts
 *
 * TanStack Start server functions for the ELN & Export engine — Layer 4
 *
 * PRD §7 — Backend API Surface:
 *   generateElnReport   → compile PDF/Markdown ELN from event log
 *   exportStandardized  → compile ISA-Tab / JSON export
 *
 * Both functions:
 *   1. Validate input at the server function boundary (Zod).
 *   2. Delegate to the appropriate compiler service (eln.ts / export.ts).
 *   3. Persist the resulting metadata as an ElnReport row via saveElnReport.
 *   4. Return the created ElnReport record.
 *
 * PRD §9 Auditability: every generated report is traceable to the exact set
 * of TelemetryEvent rows used to compile it (enforced inside the services).
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { saveElnReport, ReportFormat } from '../db/repositories';
import { compileElnDocument }           from '../services/eln';
import { compileStandardizedExport }    from '../services/export';

// ─── generateElnReport ────────────────────────────────────────────────────────

const GenerateElnReportSchema = z.object({
  experimentId: z.string().min(1),
  format: z.enum(['PDF', 'MARKDOWN']),
});

type GenerateElnReportInput = z.infer<typeof GenerateElnReportSchema>;

/**
 * Compiles a PDF or Markdown ELN from the full event log and colony detection
 * history of the specified experiment, then persists the report metadata.
 *
 * PRD §7: `generateElnReport` → `{ experimentId, format }` → `ElnReport`
 */
export const generateElnReport = createServerFn({ method: 'POST' })
  .validator((data: unknown) => GenerateElnReportSchema.parse(data))
  .handler(async ({ data }: { data: GenerateElnReportInput }) => {
    // 1. Compile document content via the ELN service
    const compiled = await compileElnDocument(data.experimentId, data.format);

    // 2. Map UI-facing format string to Prisma enum
    const dbFormat =
      data.format === 'PDF' ? ReportFormat.PDF : ReportFormat.MARKDOWN;

    // 3. Persist report metadata
    const report = await saveElnReport({
      experimentId: data.experimentId,
      format: dbFormat,
      storageUrl: compiled.storageUrl,
    });

    return report;
  });

// ─── downloadElnReport (#26) ────────────────────────────────────────────────

const DownloadElnReportSchema = z.object({
  experimentId: z.string().min(1),
  format: z.enum(['PDF', 'MARKDOWN', 'JSON', 'ISA_TAB']).default('MARKDOWN'),
});

type DownloadElnReportInput = z.infer<typeof DownloadElnReportSchema>;

export interface DownloadElnReportResponse {
  format: 'PDF' | 'MARKDOWN' | 'JSON' | 'ISA_TAB';
  content: string;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  storageUrl: string;
}

/**
 * Streams or downloads generated immutable ELN PDF/Markdown/JSON/ISA-Tab report artifacts.
 *
 * Module 7 (#26): `downloadElnReport` → `{ experimentId, format }` → `DownloadElnReportResponse`
 */
export const downloadElnReport = createServerFn({ method: 'GET' })
  .validator((data: unknown) => DownloadElnReportSchema.parse(data))
  .handler(async ({ data }: { data: DownloadElnReportInput }): Promise<DownloadElnReportResponse> => {
    if (data.format === 'JSON' || data.format === 'ISA_TAB') {
      const compiled = await compileStandardizedExport(data.experimentId, data.format);
      const ext = data.format === 'JSON' ? 'json' : 'txt';
      const mimeType = data.format === 'JSON' ? 'application/json' : 'text/tab-separated-values; charset=utf-8';
      const filename = `koch_export_${data.experimentId}_${Date.now()}.${ext}`;
      return {
        format: data.format,
        content: compiled.content,
        mimeType,
        filename,
        sizeBytes: Buffer.byteLength(compiled.content, 'utf8'),
        storageUrl: compiled.storageUrl,
      };
    }

    const compiled = await compileElnDocument(data.experimentId, data.format);
    const ext = data.format === 'PDF' ? 'pdf' : 'md';
    const mimeType = data.format === 'PDF' ? 'application/pdf' : 'text/markdown; charset=utf-8';
    const filename = `koch_eln_${data.experimentId}_${Date.now()}.${ext}`;

    return {
      format: data.format,
      content: compiled.content,
      mimeType,
      filename,
      sizeBytes: Buffer.byteLength(compiled.content, data.format === 'PDF' ? 'base64' : 'utf8'),
      storageUrl: compiled.storageUrl,
    };
  });


// ─── exportStandardized ───────────────────────────────────────────────────────

const ExportStandardizedSchema = z.object({
  experimentId: z.string().min(1),
  format: z.enum(['ISA_TAB', 'JSON']),
});

type ExportStandardizedInput = z.infer<typeof ExportStandardizedSchema>;

/**
 * Compiles an ISA-Tab or LIMS-compliant JSON export from the experiment history,
 * then persists the export metadata as an ElnReport row.
 *
 * PRD §7: `exportStandardized` → `{ experimentId, format }` → `ElnReport`
 * PRD §5.3 Standardized export: ISA-Tab and JSON for LIMS integration
 *           and repository archiving.
 */
export const exportStandardized = createServerFn({ method: 'POST' })
  .validator((data: unknown) => ExportStandardizedSchema.parse(data))
  .handler(async ({ data }: { data: ExportStandardizedInput }) => {
    // 1. Compile export content via the export service
    const compiled = await compileStandardizedExport(
      data.experimentId,
      data.format,
    );

    // 2. Map UI-facing format string to Prisma enum
    const dbFormat =
      data.format === 'ISA_TAB' ? ReportFormat.ISA_TAB : ReportFormat.JSON;

    // 3. Persist report/export metadata
    const report = await saveElnReport({
      experimentId: data.experimentId,
      format: dbFormat,
      storageUrl: compiled.storageUrl,
    });

    return report;
  });
