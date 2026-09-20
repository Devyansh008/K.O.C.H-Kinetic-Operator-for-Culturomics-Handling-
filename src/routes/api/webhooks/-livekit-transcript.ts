import { createAPIFileRoute } from '@tanstack/react-start/api';
import { handleVoicePipelineWebhook } from '../../../server/webhooks/voice-pipeline';

export const Route = createAPIFileRoute('/api/webhooks/livekit-transcript')({
  POST: async ({ request }) => {
    const rawBody = Buffer.from(await request.arrayBuffer());
    let body = {};
    try {
      body = JSON.parse(rawBody.toString('utf-8'));
    } catch {}

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const result = await handleVoicePipelineWebhook({
      rawBody,
      body,
      headers,
    });

    return new Response(JSON.stringify(result.json), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
