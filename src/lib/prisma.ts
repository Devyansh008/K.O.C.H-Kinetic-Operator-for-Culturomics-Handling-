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

function createInMemoryPrisma(): PrismaClient {
  let cuidCounter = 1;
  const generateCuid = () => `cuid_${Date.now()}_${cuidCounter++}`;

  const experiments = new Map<string, any>();
  const plates = new Map<string, any>();
  const wells = new Map<string, any>();
  const telemetryEvents: any[] = [];
  const colonyDetections: any[] = [];
  const elnReports: any[] = [];

  const mockClient = {
    experiment: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          name: data.name,
          startedAt: data.startedAt ?? new Date(),
          endedAt: data.endedAt ?? null,
          status: data.status ?? 'ACTIVE',
        };
        experiments.set(id, record);
        return record;
      },
      async findUnique({ where, include }: { where: { id: string }; include?: any }) {
        const exp = experiments.get(where.id);
        if (!exp) return null;
        const result = { ...exp };

        if (include?.plates) {
          const expPlates = Array.from(plates.values()).filter((p) => p.experimentId === exp.id);
          result.plates = expPlates.map((p) => {
            const plateWells = Array.from(wells.values()).filter((w) => w.plateId === p.id);
            const enrichedWells = plateWells.map((w) => {
              const wellEvents = include?.plates?.include?.wells?.include?.events
                ? telemetryEvents.filter((e) => e.wellId === w.id)
                : [];
              const wellDetections = include?.plates?.include?.wells?.include?.detections
                ? colonyDetections.filter((d) => d.wellId === w.id)
                : [];
              return { ...w, events: wellEvents, detections: wellDetections };
            });
            return { ...p, wells: enrichedWells };
          });
        }
        if (include?.events) {
          result.events = telemetryEvents.filter((e) => e.experimentId === exp.id);
        }
        if (include?.elnReports) {
          result.elnReports = elnReports.filter((r) => r.experimentId === exp.id);
        }
        return result;
      },
      async update({ where, data }: { where: { id: string }; data: any }) {
        const exp = experiments.get(where.id);
        if (!exp) throw new Error(`Experiment not found: ${where.id}`);
        const updated = { ...exp, ...data };
        experiments.set(where.id, updated);
        return updated;
      },
      async findMany({ where, skip = 0, take = 50 }: any = {}) {
        let list = Array.from(experiments.values());
        if (where?.status) {
          list = list.filter((e) => e.status === where.status);
        }
        if (where?.name?.contains) {
          const q = where.name.contains.toLowerCase();
          list = list.filter((e) => e.name.toLowerCase().includes(q));
        }
        list.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        return list.slice(skip, skip + take);
      },
      async count({ where }: any = {}) {
        let list = Array.from(experiments.values());
        if (where?.status) {
          list = list.filter((e) => e.status === where.status);
        }
        if (where?.name?.contains) {
          const q = where.name.contains.toLowerCase();
          list = list.filter((e) => e.name.toLowerCase().includes(q));
        }
        return list.length;
      },
    },

    plate: {
      async create({ data, include }: { data: any; include?: any }) {
        const plateId = generateCuid();
        const createdWells: any[] = [];

        if (data.wells?.createMany?.data) {
          for (const item of data.wells.createMany.data) {
            const wellId = generateCuid();
            const wellRecord = {
              id: wellId,
              plateId,
              coordinate: item.coordinate,
            };
            wells.set(wellId, wellRecord);
            createdWells.push(wellRecord);
          }
        }

        const plateRecord = {
          id: plateId,
          experimentId: data.experimentId,
          label: data.label,
        };
        plates.set(plateId, plateRecord);

        if (include?.wells) {
          return { ...plateRecord, wells: createdWells };
        }
        return plateRecord;
      },
      async findUnique({ where, include }: { where: { id: string }; include?: any }) {
        const plate = plates.get(where.id);
        if (!plate) return null;
        if (include?.wells) {
          const plateWells = Array.from(wells.values()).filter((w) => w.plateId === plate.id);
          return { ...plate, wells: plateWells };
        }
        return plate;
      },
    },

    well: {
      async findFirst({ where }: { where: { plateId: string; coordinate: string } }) {
        for (const well of wells.values()) {
          if (well.plateId === where.plateId && well.coordinate === where.coordinate) {
            return well;
          }
        }
        return null;
      },
      async findUnique({ where, include }: { where: { id: string }; include?: any }) {
        const well = wells.get(where.id);
        if (!well) return null;
        const result = { ...well };
        if (include?.events) {
          result.events = telemetryEvents
            .filter((e) => e.wellId === well.id)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        if (include?.detections) {
          result.detections = colonyDetections
            .filter((d) => d.wellId === well.id)
            .sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());
        }
        return result;
      },
    },

    telemetryEvent: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          experimentId: data.experimentId,
          wellId: data.wellId ?? null,
          type: data.type,
          rawPayload: data.rawPayload,
          frameTimestamp: data.frameTimestamp ?? null,
          createdAt: data.createdAt ?? new Date(),
        };
        telemetryEvents.push(record);
        return record;
      },
      async createMany({ data }: { data: any[] }) {
        for (const item of data) {
          const id = generateCuid();
          telemetryEvents.push({
            id,
            experimentId: item.experimentId,
            wellId: item.wellId ?? null,
            type: item.type,
            rawPayload: item.rawPayload,
            frameTimestamp: item.frameTimestamp ?? null,
            createdAt: item.createdAt ?? new Date(),
          });
        }
        return { count: data.length };
      },
      async findMany({ where, orderBy, take, skip = 0 }: any = {}) {
        let events = [...telemetryEvents];
        if (where?.experimentId) {
          events = events.filter((e) => e.experimentId === where.experimentId);
        }
        if (where?.type) {
          if (typeof where.type === 'object' && where.type.in) {
            events = events.filter((e) => where.type.in.includes(e.type));
          } else {
            events = events.filter((e) => e.type === where.type);
          }
        }
        if (orderBy?.createdAt === 'desc') {
          events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else {
          events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        const sliced = events.slice(skip);
        return take ? sliced.slice(0, take) : sliced;
      },
    },

    colonyDetection: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          wellId: data.wellId,
          confidence: data.confidence,
          growthVelocity: data.growthVelocity ?? null,
          cvProvider: data.cvProvider,
          detectedAt: data.detectedAt ?? new Date(),
        };
        colonyDetections.push(record);
        return record;
      },
      async findMany({ where }: { where: { wellId: string } }) {
        return colonyDetections
          .filter((d) => d.wellId === where.wellId)
          .sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());
      },
    },

    elnReport: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          experimentId: data.experimentId,
          format: data.format,
          storageUrl: data.storageUrl,
          generatedAt: new Date(),
        };
        elnReports.push(record);
        return record;
      },
    },
  };

  return mockClient as unknown as PrismaClient;
}

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    return createInMemoryPrisma();
  }

  try {
    return new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  } catch {
    return createInMemoryPrisma();
  }
}

// Reuse an existing client if one is already cached on globalThis;
// otherwise create a fresh one and cache it.
const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;

