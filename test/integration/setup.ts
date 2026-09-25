import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  telemetryEvents.length = 0;
});
// In-memory stores for mocks
const telemetryEvents: any[] = [];

// Test secrets for webhook validation
process.env.LIVEKIT_API_SECRET = 'test-secret';
process.env.KOCH_API_KEY_SECRET = 'test-secret';

const mockExperiments: any = {};
const mockPlates: any = {};
const mockWells: any = {};

const mockPrisma = {
  experiment: {
    create: vi.fn().mockImplementation(async (args) => {
      const exp = {
        id: `cuid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: args?.data?.name || 'Mock',
        status: 'ACTIVE',
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockExperiments[exp.id] = exp;
      return exp;
    }),
    findUniqueOrThrow: vi.fn().mockImplementation(async (args) => {
      const id = args?.where?.id || 'cuid_1234567890abcdef';
      const base = mockExperiments[id] || { id, name: 'Mock', status: 'COMPLETED' };
      return {
        ...base,
        plates: [
          {
            id: 'plate-1',
            label: 'Plate 1',
            wells: Array.from({ length: 24 }).map((_, i) => ({
              id: `mock-well-${i}`,
              coordinate: `C${i + 1}`,
              events: [],
              detections: [{
                id: 'mock-detection-1',
                colonyCount: 9,
                confidence: 0.8,
                cvProvider: 'mock-cv',
                detectedAt: new Date(),
                growthVelocity: 0.05,
              }],
            })),
          },
        ],
        events: telemetryEvents,
        voiceLogs: [],
        elnReports: [
          { id: 'report-1', format: 'MARKDOWN', storageUrl: 'mock.md', generatedAt: new Date(), createdAt: new Date() },
          { id: 'report-2', format: 'JSON', storageUrl: 'mock.json', generatedAt: new Date(), createdAt: new Date() }
        ],
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
    findUnique: vi.fn().mockImplementation(async (args) => {
      const id = args?.where?.id || 'cuid_1234567890abcdef';
      const base = mockExperiments[id] || { id, name: 'Mock', status: 'COMPLETED' };
      return {
        ...base,
        plates: [
          {
            id: 'plate-1',
            label: 'Plate 1',
            wells: Array.from({ length: 24 }).map((_, i) => ({
              id: `mock-well-${i}`,
              coordinate: `C${i + 1}`,
              events: [],
              detections: [{
                id: 'mock-detection-1',
                colonyCount: 9,
                confidence: 0.8,
                cvProvider: 'mock-cv',
                detectedAt: new Date(),
                growthVelocity: 0.05,
              }],
            })),
          },
        ],
        events: telemetryEvents,
        voiceLogs: [],
        elnReports: [
          { id: 'report-1', format: 'MARKDOWN', storageUrl: 'mock.md', generatedAt: new Date(), createdAt: new Date() },
          { id: 'report-2', format: 'JSON', storageUrl: 'mock.json', generatedAt: new Date(), createdAt: new Date() }
        ],
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),
    update: vi.fn().mockImplementation(async (args) => {
      const id = args?.where?.id || 'cuid_1234567890abcdef';
      const status = args?.data?.status || 'ACTIVE';
      if (mockExperiments[id]) {
        mockExperiments[id].status = status;
      }
      return {
        id,
        status,
        updatedAt: new Date(),
      };
    }),
    findMany: vi.fn().mockImplementation(async (args) => {
      let results = Object.values(mockExperiments);
      if (args?.where?.status) {
        results = results.filter((e: any) => e.status === args.where.status);
      }
      return results;
    }),
    count: vi.fn().mockImplementation(async () => Object.values(mockExperiments).length),
  },
  plate: {
    create: vi.fn().mockImplementation(async (args) => {
      const wells = Array.from({ length: 24 }).map((_, i) => ({
        id: `mock-well-${i}`,
        coordinate: `C${i + 1}`,
        events: [],
        detections: [],
      }));
      return { id: 'mock-plate-id', label: args?.data?.label || 'Plate 1', wells };
    }),
    findUnique: vi.fn().mockImplementation(async () => {
      const wells = Array.from({ length: 24 }).map((_, i) => ({
        id: `mock-well-${i}`,
        coordinate: `C${i + 1}`,
        events: [],
        detections: [],
      }));
      return { id: 'mock-plate-id', wells };
    }),
  },
  well: {
    findFirst: vi.fn().mockImplementation(async (args) => ({ id: 'mock-well-id', coordinate: args?.where?.coordinate || 'C3', plateId: args?.where?.plateId })),
    findUnique: vi.fn().mockImplementation(async (args) => ({ id: args?.where?.id || 'mock-well-id', coordinate: 'C3', events: [{ id: 'mock-event-x', type: 'STATE_CHANGE' }], detections: [] })),
  },
  telemetryEvent: {
    create: vi.fn().mockImplementation(async (args) => {
      const event = { id: `mock-event-${telemetryEvents.length + 1}`, createdAt: new Date(), ...args?.data };
      telemetryEvents.push(event);
      return event;
    }),
    createMany: vi.fn().mockImplementation(async (args) => {
      const dataArray = Array.isArray(args?.data) ? args.data : (args?.data ? [args.data] : []);
      for (const d of dataArray) {
        telemetryEvents.push({ id: `mock-event-${telemetryEvents.length + 1}`, createdAt: new Date(), ...d });
      }
      return { count: dataArray.length || 2 };
    }),
    findMany: vi.fn().mockImplementation(async () => telemetryEvents),
    update: vi.fn().mockImplementation(async () => { throw new Error('append-only guarantees violated'); }),
    delete: vi.fn().mockImplementation(async () => { throw new Error('append-only guarantees violated'); }),
  },
  voiceIntentLog: {
    create: vi.fn().mockImplementation(async (args) => ({
      id: 'mock-log-id',
      createdAt: new Date(),
      ...args?.data,
    })),
    findMany: vi.fn().mockImplementation(async () => [
      { id: 'log1', status: 'RETRIED', createdAt: new Date() },
      { id: 'log2', status: 'PROCESSED', createdAt: new Date() },
    ]),
    updateMany: vi.fn().mockImplementation(async () => ({ count: 1 })),
    update: vi.fn().mockImplementation(async () => { throw new Error('append-only guarantees violated'); }),
    delete: vi.fn().mockImplementation(async () => { throw new Error('append-only guarantees violated'); }),
  },
  elnReport: {
    create: vi.fn().mockImplementation(async (args) => ({
      id: 'mock-report-id',
      storageUrl: 'mock.md',
      createdAt: new Date(),
      ...args?.data,
    })),
  },
  colonyDetection: {
    create: vi.fn().mockImplementation(async (args) => ({ id: 'mock-detection-id', ...args?.data })),
    findMany: vi.fn().mockImplementation(async () => [{
      id: 'mock-detection-1',
      colonyCount: 9,
      confidence: 0.8,
      cvProvider: 'mock-cv',
    }]),
  },
};

vi.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
  db: mockPrisma,
}));

// Also mock the alternative import path used by repositories
vi.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
  db: mockPrisma,
}));

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    createServerFn: (options?: any) => {
      let _validator: any;
      let _handler: any;
      const builder = {
        validator: (v: any) => {
          _validator = v;
          return builder;
        },
        handler: (h: any) => {
          _handler = h;
          const fn = async (ctx: any) => {
            let data = ctx.data;
            if (_validator) {
              if (typeof _validator === 'function') {
                data = await _validator(data);
              } else if (_validator.parse) {
                data = await _validator.parse(data);
              }
            }
            return _handler({ data });
          };
          fn.method = options?.method || 'POST';
          fn.__executeServer = async (opts: any) => {

            try {
              const result = await fn({ data: opts.data });

              return result;
            } catch (error) {
              console.error('Mock __executeServer caught error', error);
              return { error };
            }
          };
          return fn;
        },
      };
      return builder;
    },
  };
});
