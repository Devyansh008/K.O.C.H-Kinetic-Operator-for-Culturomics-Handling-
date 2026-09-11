/**
 * src/lib/prisma.ts
 *
 * Globally-cached PrismaClient singleton for Project K.O.C.H.
 *
 * Why globalThis caching?
 * - TanStack Start runs on Nitro, which can hot-reload modules during
 *   development, creating multiple PrismaClient instances and exhausting
 *   the connection pool against Turso / Supabase.
 * - In production / serverless environments the process is long-lived, but
 *   edge cold-starts would still spin up a fresh module scope without this.
 * - Attaching to `globalThis` (which survives module hot-reloads in Node)
 *   ensures exactly one PrismaClient per Node.js process.
 *
 * Reference:
 *   https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */

import { PrismaClient } from '@prisma/client';

// Augment globalThis so TypeScript knows about our cached instance.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

// Reuse an existing client if one is already cached on globalThis;
// otherwise create a fresh one and cache it.
const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  // Cache only in non-production so each production cold-start is clean.
  // Production processes are not hot-reloaded, so caching is unnecessary
  // and may mask stale connection issues during blue/green deploys.
  globalThis.__prisma = prisma;
}

export default prisma;
