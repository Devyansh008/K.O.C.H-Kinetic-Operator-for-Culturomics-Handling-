/**
 * src/routes/api/eln/download.ts
 *
 * API route: GET /api/eln/download?experimentId=...&format=PDF|MARKDOWN
 *
 * Direct HTTP streaming download endpoint for compiled ELN artifacts.
 */

import { compileElnDocument, type ElnFormat } from '../../../server/services/eln';

export async function handleDownloadElnReport(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const experimentId = url.searchParams.get('experimentId');
  const format = (url.searchParams.get('format') ?? 'MARKDOWN').toUpperCase() as ElnFormat;

  if (!experimentId) {
    return new Response(JSON.stringify({ error: 'Missing experimentId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const compiled = await compileElnDocument(experimentId, format);
    const filename = `koch_eln_${experimentId}.${format === 'PDF' ? 'pdf' : 'md'}`;

    if (format === 'PDF') {
      const buffer = Buffer.from(compiled.content, 'base64');
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(buffer.length),
        },
      });
    }

    return new Response(compiled.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Report compilation failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
