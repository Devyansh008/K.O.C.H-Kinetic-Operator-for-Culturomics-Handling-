import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  telemetryEvents.length = 0;
});
// In-memory stores for mocks
const telemetryEvents: any[] = [];

// Test secrets for webhook validation
process.env.LIVEKIT_API_SECRET = 'test-secret';
process.env.KOCH_API_KEY_SECRET = 'test-secret';

const mockPrisma = {
  experiment: {
    create: vi.fn().mockImplementation(async (args) => ({
      id: 'cuid_1234567890abcdef',
      name: args?.data?.name || 'Mock',
      status: 'ACTIVE',
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findUniqueOrThrow: vi.fn().mockImplementation(async () => ({
      id: 'cuid_1234567890abcdef',
      status: 'COMPLETED',
      plates: [
        {
          id: 'plate-1',
          label: 'Plate 1',
          wells: [{
            id: 'well-C3',
            coordinate: 'C3',
            events: [],
            detections: [],
          }],
        },
      ],
      events: telemetryEvents,
      voiceLogs: [],
      elnReports: [],
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findUnique: vi.fn().mockImplementation(async () => ({
      id: 'cuid_1234567890abcdef',
      status: 'COMPLETED',
      plates: [
        {
          id: 'plate-1',
          label: 'Plate 1',
          wells: [{
            id: 'well-C3',
            coordinate: 'C3',
            events: [],
            detections: [],
          }],
        },
      ],
      events: telemetryEvents,
      voiceLogs: [],
      elnReports: [],
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: vi.fn().mockImplementation(async (args) => ({
      id: 'cuid_1234567890abcdef',
      status: args?.data?.status || 'ACTIVE',
      updatedAt: new Date(),
    })),
    findMany: vi.fn().mockImplementation(async () => []),
    count: vi.fn().mockImplementation(async () => 0),
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
    findUnique: vi.fn().mockImplementation(async () => ({ id: 'mock-plate-id', wells: [] })),
  },
  well: {
    findFirst: vi.fn().mockImplementation(async () => ({ id: 'mock-well-id' })),
    findUnique: vi.fn().mockImplementation(async () => ({ id: 'mock-well-id', events: [], detections: [] })),
  },
  telemetryEvent: {
    create: vi.fn().mockImplementation(async (args) => {
      const event = { id: `mock-event-${telemetryEvents.length + 1}`, createdAt: new Date(), ...args?.data };
      telemetryEvents.push(event);
      return event;
    }),
    createMany: vi.fn().mockImplementation(async () => ({ count: 1 })),
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
    findMany: vi.fn().mockImplementation(async () => []),
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
            console.log('Mock __executeServer called with opts', opts);
            try {
              const res = await fn({ data: opts.data });
              console.log('Mock __executeServer result', res);
              return { result: res, error: undefined };
            } catch (error) {
              console.error('Mock __executeServer caught error', error);
              return { result: undefined, error };
            }
          };
          return fn;
        },
      };
      return builder;
    },
  };
});
