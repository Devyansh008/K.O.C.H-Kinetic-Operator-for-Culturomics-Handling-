import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValue: z.ZodType<Prisma.JsonValue> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.lazy(() => z.array(JsonValue)),
  z.lazy(() => z.record(JsonValue)),
]);

export type JsonValueType = z.infer<typeof JsonValue>;

export const NullableJsonValue = z
  .union([JsonValue, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValue: z.ZodType<Prisma.InputJsonValue> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.lazy(() => z.array(InputJsonValue.nullable())),
  z.lazy(() => z.record(InputJsonValue.nullable())),
]);

export type InputJsonValueType = z.infer<typeof InputJsonValue>;


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const ExperimentScalarFieldEnumSchema = z.enum(['id','name','startedAt','endedAt','status']);

export const PlateScalarFieldEnumSchema = z.enum(['id','experimentId','label']);

export const WellScalarFieldEnumSchema = z.enum(['id','plateId','coordinate']);

export const TelemetryEventScalarFieldEnumSchema = z.enum(['id','experimentId','wellId','type','rawPayload','frameTimestamp','createdAt']);

export const ColonyDetectionScalarFieldEnumSchema = z.enum(['id','wellId','detectedAt','confidence','growthVelocity','cvProvider']);

export const ElnReportScalarFieldEnumSchema = z.enum(['id','experimentId','format','storageUrl','generatedAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const JsonNullValueInputSchema = z.enum(['JsonNull',]);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]);

export const ExperimentStatusSchema = z.enum(['ACTIVE','COMPLETED','ABORTED','ARCHIVED']);

export type ExperimentStatusType = `${z.infer<typeof ExperimentStatusSchema>}`

export const EventTypeSchema = z.enum(['VOICE_UTTERANCE','INTENT','FRAME_MARK','STATE_CHANGE']);

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
})

export type Well = z.infer<typeof WellSchema>

/////////////////////////////////////////
// TELEMETRY EVENT SCHEMA
/////////////////////////////////////////

export const TelemetryEventSchema = z.object({
  type: EventTypeSchema,
  id: z.string().cuid(),
  experimentId: z.string(),
  wellId: z.string().nullable(),
  rawPayload: InputJsonValue,
  frameTimestamp: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
})

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>

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
