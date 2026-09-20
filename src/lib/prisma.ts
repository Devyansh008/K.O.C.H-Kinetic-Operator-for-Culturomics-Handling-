/**
 * src/lib/prisma.ts
 *
 * Globally-cached PrismaClient singleton for Project K.O.C.H.
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
  const wellStates = new Map<string, any>();
  const telemetryEvents: any[] = [];
  const voiceIntentLogs: any[] = [];
  const colonyDetections: any[] = [];
  const elnReports: any[] = [];
  const systemMetrics: any[] = [];

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
        if (include?.voiceLogs) {
          result.voiceLogs = voiceIntentLogs.filter((v) => v.experimentId === exp.id);
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
        const id = generateCuid();
        const record = {
          id,
          experimentId: data.experimentId,
          label: data.label,
          format: data.format ?? 'WELL_96',
        };
        plates.set(id, record);

        if (data.wells?.createMany?.data) {
          const createdWells: any[] = [];
          for (const w of data.wells.createMany.data) {
            const wellId = generateCuid();
            const wellRecord = {
              id: wellId,
              plateId: id,
              coordinate: w.coordinate,
              status: w.status ?? 'UNINOCULATED',
              media: w.media ?? null,
              opticalDensity: w.opticalDensity ?? null,
              contents: w.contents ?? null,
              notes: w.notes ?? null,
            };
            wells.set(wellId, wellRecord);
            createdWells.push(wellRecord);
          }
          if (include?.wells) {
            return { ...record, wells: createdWells };
          }
        }
        return record;
      },
      async findUnique({ where, include }: { where: { id: string }; include?: any }) {
        const plate = plates.get(where.id);
        if (!plate) return null;
        if (include?.wells) {
          const plateWells = Array.from(wells.values()).filter((w) => w.plateId === plate.id);
          return { ...plate, wells: plateWells };
        }
        return { ...plate };
      },
      async findMany({ where }: any = {}) {
        let list = Array.from(plates.values());
        if (where?.experimentId) {
          list = list.filter((p) => p.experimentId === where.experimentId);
        }
        return list;
      },
    },

    well: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          plateId: data.plateId,
          coordinate: data.coordinate,
          status: data.status ?? 'UNINOCULATED',
          media: data.media ?? null,
          opticalDensity: data.opticalDensity ?? null,
          contents: data.contents ?? null,
          notes: data.notes ?? null,
        };
        wells.set(id, record);
        return record;
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
      async findFirst({ where }: { where: { plateId?: string; coordinate?: string } }) {
        for (const w of wells.values()) {
          if (
            (!where.plateId || w.plateId === where.plateId) &&
            (!where.coordinate || w.coordinate === where.coordinate)
          ) {
            return { ...w };
          }
        }
        return null;
      },
      async update({ where, data }: { where: { id: string }; data: any }) {
        const well = wells.get(where.id);
        if (!well) throw new Error(`Well not found: ${where.id}`);
        const updated = { ...well, ...data };
        wells.set(where.id, updated);
        return updated;
      },
      async findMany({ where }: any = {}) {
        let list = Array.from(wells.values());
        if (where?.plateId) {
          list = list.filter((w) => w.plateId === where.plateId);
        }
        return list;
      },
    },

    wellState: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          wellId: data.wellId,
          coordinate: data.coordinate,
          plateId: data.plateId,
          status: data.status ?? 'UNINOCULATED',
          media: data.media ?? null,
          opticalDensity: data.opticalDensity ?? null,
          notes: data.notes ?? null,
          updatedAt: new Date(),
        };
        wellStates.set(record.wellId, record);
        return record;
      },
      async findUnique({ where }: { where: { wellId: string } }) {
        return wellStates.get(where.wellId) ?? null;
      },
      async upsert({ where, update, create }: any) {
        const existing = wellStates.get(where.wellId);
        if (existing) {
          const updated = { ...existing, ...update, updatedAt: new Date() };
          wellStates.set(where.wellId, updated);
          return updated;
        }
        const created = {
          id: generateCuid(),
          ...create,
          updatedAt: new Date(),
        };
        wellStates.set(where.wellId, created);
        return created;
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
        if (where?.wellId) {
          events = events.filter((e) => e.wellId === where.wellId);
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
      async count({ where }: any = {}) {
        let events = [...telemetryEvents];
        if (where?.experimentId) {
          events = events.filter((e) => e.experimentId === where.experimentId);
        }
        if (where?.wellId) {
          events = events.filter((e) => e.wellId === where.wellId);
        }
        return events.length;
      },
      async update() {
        throw new Error('TelemetryEvent is strictly append-only. Direct updates are prohibited.');
      },
      async delete() {
        throw new Error('TelemetryEvent is strictly append-only. Direct deletes are prohibited.');
      },
    },

    voiceIntentLog: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          experimentId: data.experimentId,
          transcript: data.transcript,
          intent: data.intent,
          confidence: data.confidence ?? 1.0,
          status: data.status ?? 'PROCESSED',
          createdAt: data.createdAt ?? new Date(),
        };
        voiceIntentLogs.push(record);
        return record;
      },
      async findMany({ where, take, orderBy }: any = {}) {
        let logs = [...voiceIntentLogs];
        if (where?.experimentId) {
          logs = logs.filter((l) => l.experimentId === where.experimentId);
        }
        if (where?.status) {
          logs = logs.filter((l) => l.status === where.status);
        }
        if (orderBy?.createdAt === 'desc') {
          logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else {
          logs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        return take ? logs.slice(0, take) : logs;
      },
      async count({ where }: any = {}) {
        let logs = [...voiceIntentLogs];
        if (where?.experimentId) {
          logs = logs.filter((l) => l.experimentId === where.experimentId);
        }
        return logs.length;
      },
      async update() {
        throw new Error('VoiceIntentLog is strictly append-only. Direct updates are prohibited.');
      },
      async delete() {
        throw new Error('VoiceIntentLog is strictly append-only. Direct deletes are prohibited.');
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
      async findMany({ where }: { where?: { wellId?: string } } = {}) {
        let list = [...colonyDetections];
        if (where?.wellId) {
          list = list.filter((d) => d.wellId === where.wellId);
        }
        return list.sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime());
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
      async findMany({ where }: any = {}) {
        let list = [...elnReports];
        if (where?.experimentId) {
          list = list.filter((r) => r.experimentId === where.experimentId);
        }
        return list;
      },
    },

    systemMetric: {
      async create({ data }: { data: any }) {
        const id = generateCuid();
        const record = {
          id,
          serverStatus: data.serverStatus ?? 'HEALTHY',
          heapUsedMb: data.heapUsedMb,
          heapTotalMb: data.heapTotalMb,
          rssMb: data.rssMb,
          uptimeSeconds: data.uptimeSeconds,
          capturedAt: data.capturedAt ?? new Date(),
        };
        systemMetrics.push(record);
        return record;
      },
      async findMany({ take, orderBy }: any = {}) {
        let list = [...systemMetrics];
        if (orderBy?.capturedAt === 'desc') {
          list.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
        }
        return take ? list.slice(0, take) : list;
      },
    },
  };

  return mockClient as unknown as PrismaClient;
}

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
    console.warn("Using In-Memory Prisma Client because DATABASE_URL is missing or not a Postgres URL.");
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

export { prisma, prisma as db };
export default prisma;
