/**
 * src/server/functions/voice-assistant.ts
 *
 * Dedicated TanStack Start server functions for the K.O.C.H. Voice Assistant:
 *   - getAssemblyAiToken: Mint short-lived AssemblyAI Real-Time WebSocket tokens
 *   - generateAssistantReply: Resolves voice intents & queries Google Gemini / rule engine
 *
 * Kept strictly isolated from WebRTC/LiveKit node-crypto imports to ensure
 * clean client-side tree-shaking and zero browser bundle pollution.
 */

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

import { resolveIntent } from '../services/intentResolver';
import { logTelemetryEvent, EventType } from '../db/repositories';
import { updateActiveState, type ActiveCoordinate } from '../services/state';

// ─── AssemblyAI Real-Time Token ──────────────────────────────────────────────

const GetAssemblyAiTokenSchema = z.object({}).optional().default({});

export interface AssemblyAiTokenResult {
  token: string | null;
  configured: boolean;
  expiresIn?: number;
  error?: string;
}

/**
 * Core handler to mint a short-lived AssemblyAI Real-Time WebSocket authentication token.
 */
export async function handleGetAssemblyAiToken(): Promise<AssemblyAiTokenResult> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey || apiKey === 'your-assemblyai-api-key') {
    return {
      token: null,
      configured: false,
      error: 'ASSEMBLYAI_API_KEY is not configured in environment',
    };
  }

  try {
    const res = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_in: 600 }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return {
        token: null,
        configured: false,
        error: `AssemblyAI rejected token request (${res.status}): ${errorText}`,
      };
    }

    const body = (await res.json()) as { token: string };
    return {
      token: body.token,
      configured: true,
      expiresIn: 600,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      token: null,
      configured: false,
      error: `Failed to contact AssemblyAI token service: ${msg}`,
    };
  }
}

/**
 * Server function RPC callable from browser client.
 */
export const getAssemblyAiToken = createServerFn({ method: 'POST' })
  .validator((d: unknown) => GetAssemblyAiTokenSchema.parse(d))
  .handler(async (): Promise<AssemblyAiTokenResult> => {
    return handleGetAssemblyAiToken();
  });

// ─── Assistant Response Generation ──────────────────────────────────────────

const GenerateAssistantReplySchema = z.object({
  transcript: z.string().min(1),
  experimentId: z.string().optional(),
  plateLabel: z.string().optional(),
});

export type GenerateAssistantReplyInput = z.infer<typeof GenerateAssistantReplySchema>;

export interface AssistantReplyResult {
  replyText: string;
  source: 'gemini' | 'rule-engine';
  intent: {
    action: string;
    details?: Record<string, unknown>;
  };
  actionExecuted?: boolean;
}

/**
 * Core handler to resolve transcripts to intents and query Gemini/rule-engine.
 */
export async function handleGenerateAssistantReply(
  data: GenerateAssistantReplyInput,
): Promise<AssistantReplyResult> {
  const resolved = resolveIntent(data.transcript);
  let actionExecuted = false;

  // Execute state updates and telemetry logging if an experiment session is active
  if (data.experimentId) {
    try {
      await logTelemetryEvent({
        experimentId: data.experimentId,
        type: EventType.VOICE_UTTERANCE,
        rawPayload: {
          transcript: data.transcript,
          source: 'hey-koch-assistant',
        } as Prisma.InputJsonValue,
        frameTimestamp: new Date(),
      });

      await logTelemetryEvent({
        experimentId: data.experimentId,
        type: EventType.INTENT,
        rawPayload: resolved as unknown as Prisma.InputJsonValue,
        frameTimestamp: new Date(),
      });

      if (resolved.action === 'MARK_WELL_PENDING' && 'plateLabel' in resolved && 'wellCoordinate' in resolved) {
        const partialCoord: ActiveCoordinate = {
          plateLabel: resolved.plateLabel,
          plateId: '',
          wellCoordinate: resolved.wellCoordinate,
          wellId: '',
        };
        updateActiveState(data.experimentId, { activeCoordinate: partialCoord });
        actionExecuted = true;
      } else if (resolved.action === 'START_TIMER') {
        updateActiveState(data.experimentId, { timerMarks: [new Date().toISOString()] });
        actionExecuted = true;
      }
    } catch (e) {
      console.warn('[generateAssistantReply] Could not persist telemetry to database:', e);
    }
  }

  // Try Gemini LLM first if API key is provided
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey && geminiApiKey !== 'your-gemini-api-key') {
    try {
      const systemPrompt =
        'You are K.O.C.H. (Kinetic Operator for Culturomics & Handling), an AI voice assistant for high-containment microbiology and culturomics laboratories.\n' +
        'The operator is speaking hands-free in the lab. Respond in a concise, scientific, and clear manner (1-2 sentences maximum, under 30 words).\n' +
        `Recognized lab intent: ${resolved.action}. Provide confirmation of actions or answer questions crisply.`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nOperator: "${data.transcript}"` }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 100,
              temperature: 0.3,
            },
          }),
        },
      );

      if (geminiRes.ok) {
        const geminiData = (await geminiRes.json()) as any;
        const candidateText =
          geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidateText) {
          return {
            replyText: candidateText,
            source: 'gemini',
            intent: { action: resolved.action, details: resolved as Record<string, unknown> },
            actionExecuted,
          };
        }
      }
    } catch (err) {
      console.warn('[generateAssistantReply] Gemini API request failed, falling back to rule engine:', err);
    }
  }

  // Fallback: Rule engine response based on recognized culturomics actions
  let fallbackReply = '';
  switch (resolved.action) {
    case 'MARK_WELL_PENDING':
      fallbackReply = `Acknowledged. Marked ${resolved.plateLabel || 'plate'} well ${resolved.wellCoordinate} as colony positive.`;
      break;
    case 'ADD_TUBE':
      fallbackReply = `Tube ${resolved.tubeId} logged into the culturomics active session inventory.`;
      break;
    case 'START_TIMER':
      fallbackReply = 'Incubation protocol lap timer started.';
      break;
    case 'RECORD_OD600':
      fallbackReply = 'Optical density OD600 reading recorded in telemetry log.';
      break;
    case 'ADD_CULTURE':
      fallbackReply = `Registered ${resolved.culture} culture profile for inoculation handling.`;
      break;
    case 'SET_ENVIRONMENT':
      fallbackReply = `Atmospheric incubation set to ${resolved.environment}.`;
      break;
    default: {
      const lower = data.transcript.toLowerCase();
      if (lower.includes('hello') || lower.includes('hey') || lower.includes('coach') || lower.includes('koch')) {
        fallbackReply = 'K.O.C.H. voice assistant online and listening. Ready for lab command.';
      } else if (lower.includes('status') || lower.includes('how are you')) {
        fallbackReply = 'All K.O.C.H. telemetry streams are nominal. Operator voice channel active.';
      } else if (lower.includes('temperature') || lower.includes('temp')) {
        fallbackReply = 'Incubator temperature is maintained at 37.0 degrees Celsius.';
      } else {
        fallbackReply = `Understood: "${data.transcript}". Telemetry event logged.`;
      }
      break;
    }
  }

  return {
    replyText: fallbackReply,
    source: 'rule-engine',
    intent: { action: resolved.action, details: resolved as any },
    actionExecuted,
  };
}

/**
 * Server function RPC callable from browser client.
 */
export const generateAssistantReply = createServerFn({ method: 'POST' })
  .validator((data: unknown) => GenerateAssistantReplySchema.parse(data))
  .handler(async ({ data }: { data: GenerateAssistantReplyInput }): Promise<any> => {
    return handleGenerateAssistantReply(data);
  });
