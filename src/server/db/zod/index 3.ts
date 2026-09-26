import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.NullTypes.DbNull;
  if (v === 'JsonNull') return Prisma.NullTypes.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.string(), z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.any() }),
    z.record(z.string(), z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const ExperimentScalarFieldEnumSchema = z.enum(['id','name','startedAt','endedAt','status']);

export const PlateScalarFieldEnumSchema = z.enum(['id','experimentId','label','format']);

export const WellScalarFieldEnumSchema = z.enum(['id','plateId','coordinate','status','media','opticalDensity','contents','notes']);

export const WellStateScalarFieldEnumSchema = z.enum(['id','wellId','coordinate','plateId','status','media','opticalDensity','notes','updatedAt']);

export const TelemetryEventScalarFieldEnumSchema = z.enum(['id','experimentId','wellId','type','rawPayload','frameTimestamp','createdAt']);

export const VoiceIntentLogScalarFieldEnumSchema = z.enum(['id','experimentId','transcript','intent','confidence','status','createdAt']);

export const ColonyDetectionScalarFieldEnumSchema = z.enum(['id','wellId','detectedAt','confidence','growthVelocity','cvProvider']);

export const ElnReportScalarFieldEnumSchema = z.enum(['id','experimentId','format','storageUrl','generatedAt']);

export const SystemMetricScalarFieldEnumSchema = z.enum(['id','serverStatus','heapUsedMb','heapTotalMb','rssMb','uptimeSeconds','capturedAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

// @ts-ignore
export const JsonNullValueInputSchema: z.ZodType<Prisma.JsonNullValueInput> = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

// @ts-ignore
export const JsonNullValueFilterSchema: z.ZodType<Prisma.JsonNullValueFilter> = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const ExperimentStatusSchema = z.enum(['ACTIVE','COMPLETED','ABORTED','ARCHIVED']);

export type ExperimentStatusType = `${z.infer<typeof ExperimentStatusSchema>}`

export const PlateFormatSchema = z.enum(['WELL_24','WELL_48','WELL_96','WELL_384']);

export type PlateFormatType = `${z.infer<typeof PlateFormatSchema>}`

export const EventTypeSchema = z.enum(['VOICE_UTTERANCE','INTENT','VOICE_INTENT','FRAME_MARK','WELL_UPDATE','STATE_CHANGE','COLONY_DETECTION','SYSTEM_METRIC']);

export type EventTypeType = `${z.infer<typeof EventTypeSchema>}`

export const ReportFormatSchema = z.enum(['PDF','MARKDOWN','ISA_TAB','JSON']);

export type ReportFormatType = `${z.infer<typeof ReportFormatSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// EXPERIMENT SCHEMA
/////////////////////////////////////////

export const ExperimentSchema = z.object({
  status: ExperimentStatusSchema,
  id: z.string().cuid(),
  name: z.string(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().nullable(),
})

export type Experiment = z.infer<typeof ExperimentSchema>

/////////////////////////////////////////
// PLATE SCHEMA
/////////////////////////////////////////

export const PlateSchema = z.object({
  format: PlateFormatSchema,
  id: z.string().cuid(),
  experimentId: z.string(),
  label: z.string(),
})

export type Plate = z.infer<typeof PlateSchema>

/////////////////////////////////////////
// WELL SCHEMA
/////////////////////////////////////////

export const WellSchema = z.object({
  id: z.string().cuid(),
  plateId: z.string(),
  coordinate: z.string(),
  status: z.string(),
  media: z.string().nullable(),
  opticalDensity: z.number().nullable(),
  contents: z.string().nullable(),
  notes: z.string().nullable(),
})

export type Well = z.infer<typeof WellSchema>

/////////////////////////////////////////
// WELL STATE SCHEMA
/////////////////////////////////////////

export const WellStateSchema = z.object({
  id: z.string().cuid(),
  wellId: z.string(),
  coordinate: z.string(),
  plateId: z.string(),
  status: z.string(),
  media: z.string().nullable(),
  opticalDensity: z.number().nullable(),
  notes: z.string().nullable(),
  updatedAt: z.coerce.date(),
})

export type WellState = z.infer<typeof WellStateSchema>

/////////////////////////////////////////
// TELEMETRY EVENT SCHEMA
/////////////////////////////////////////

export const TelemetryEventSchema = z.object({
  type: EventTypeSchema,
  id: z.string().cuid(),
  experimentId: z.string(),
  wellId: z.string().nullable(),
  rawPayload: JsonValueSchema,
  frameTimestamp: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
})

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>

/////////////////////////////////////////
// VOICE INTENT LOG SCHEMA
/////////////////////////////////////////

export const VoiceIntentLogSchema = z.object({
  id: z.string().cuid(),
  experimentId: z.string(),
  transcript: z.string(),
  intent: JsonValueSchema,
  confidence: z.number(),
  status: z.string(),
  createdAt: z.coerce.date(),
})

export type VoiceIntentLog = z.infer<typeof VoiceIntentLogSchema>

/////////////////////////////////////////
// COLONY DETECTION SCHEMA
/////////////////////////////////////////

export const ColonyDetectionSchema = z.object({
  id: z.string().cuid(),
  wellId: z.string(),
  detectedAt: z.coerce.date(),
  confidence: z.number(),
  growthVelocity: z.number().nullable(),
  cvProvider: z.string(),
})

export type ColonyDetection = z.infer<typeof ColonyDetectionSchema>

/////////////////////////////////////////
// ELN REPORT SCHEMA
/////////////////////////////////////////

export const ElnReportSchema = z.object({
  format: ReportFormatSchema,
  id: z.string().cuid(),
  experimentId: z.string(),
  storageUrl: z.string(),
  generatedAt: z.coerce.date(),
})

export type ElnReport = z.infer<typeof ElnReportSchema>

/////////////////////////////////////////
// SYSTEM METRIC SCHEMA
/////////////////////////////////////////

export const SystemMetricSchema = z.object({
  id: z.string().cuid(),
  serverStatus: z.string(),
  heapUsedMb: z.number(),
  heapTotalMb: z.number(),
  rssMb: z.number(),
  uptimeSeconds: z.number(),
  capturedAt: z.coerce.date(),
})

export type SystemMetric = z.infer<typeof SystemMetricSchema>
