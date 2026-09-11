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

export const ExperimentStatusSchema = z.enum(['ACTIVE','COMPLETED','ABORTED']);

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

/////////////////////////////////////////
// SELECT & INCLUDE
/////////////////////////////////////////

// EXPERIMENT
//------------------------------------------------------

export const ExperimentIncludeSchema: z.ZodType<Prisma.ExperimentInclude> = z.object({
  plates: z.union([z.boolean(),z.lazy(() => PlateFindManyArgsSchema)]).optional(),
  events: z.union([z.boolean(),z.lazy(() => TelemetryEventFindManyArgsSchema)]).optional(),
  elnReports: z.union([z.boolean(),z.lazy(() => ElnReportFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ExperimentCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const ExperimentArgsSchema: z.ZodType<Prisma.ExperimentArgs> = z.object({
  select: z.lazy(() => ExperimentSelectSchema).optional(),
  include: z.lazy(() => ExperimentIncludeSchema).optional(),
}).strict();

export const ExperimentCountOutputTypeArgsSchema: z.ZodType<Prisma.ExperimentCountOutputTypeArgs> = z.object({
  select: z.lazy(() => ExperimentCountOutputTypeSelectSchema).nullish(),
}).strict();

export const ExperimentCountOutputTypeSelectSchema: z.ZodType<Prisma.ExperimentCountOutputTypeSelect> = z.object({
  plates: z.boolean().optional(),
  events: z.boolean().optional(),
  elnReports: z.boolean().optional(),
}).strict();

export const ExperimentSelectSchema: z.ZodType<Prisma.ExperimentSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  startedAt: z.boolean().optional(),
  endedAt: z.boolean().optional(),
  status: z.boolean().optional(),
  plates: z.union([z.boolean(),z.lazy(() => PlateFindManyArgsSchema)]).optional(),
  events: z.union([z.boolean(),z.lazy(() => TelemetryEventFindManyArgsSchema)]).optional(),
  elnReports: z.union([z.boolean(),z.lazy(() => ElnReportFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ExperimentCountOutputTypeArgsSchema)]).optional(),
}).strict()

// PLATE
//------------------------------------------------------

export const PlateIncludeSchema: z.ZodType<Prisma.PlateInclude> = z.object({
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
  wells: z.union([z.boolean(),z.lazy(() => WellFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => PlateCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const PlateArgsSchema: z.ZodType<Prisma.PlateArgs> = z.object({
  select: z.lazy(() => PlateSelectSchema).optional(),
  include: z.lazy(() => PlateIncludeSchema).optional(),
}).strict();

export const PlateCountOutputTypeArgsSchema: z.ZodType<Prisma.PlateCountOutputTypeArgs> = z.object({
  select: z.lazy(() => PlateCountOutputTypeSelectSchema).nullish(),
}).strict();

export const PlateCountOutputTypeSelectSchema: z.ZodType<Prisma.PlateCountOutputTypeSelect> = z.object({
  wells: z.boolean().optional(),
}).strict();

export const PlateSelectSchema: z.ZodType<Prisma.PlateSelect> = z.object({
  id: z.boolean().optional(),
  experimentId: z.boolean().optional(),
  label: z.boolean().optional(),
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
  wells: z.union([z.boolean(),z.lazy(() => WellFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => PlateCountOutputTypeArgsSchema)]).optional(),
}).strict()

// WELL
//------------------------------------------------------

export const WellIncludeSchema: z.ZodType<Prisma.WellInclude> = z.object({
  plate: z.union([z.boolean(),z.lazy(() => PlateArgsSchema)]).optional(),
  events: z.union([z.boolean(),z.lazy(() => TelemetryEventFindManyArgsSchema)]).optional(),
  detections: z.union([z.boolean(),z.lazy(() => ColonyDetectionFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => WellCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const WellArgsSchema: z.ZodType<Prisma.WellArgs> = z.object({
  select: z.lazy(() => WellSelectSchema).optional(),
  include: z.lazy(() => WellIncludeSchema).optional(),
}).strict();

export const WellCountOutputTypeArgsSchema: z.ZodType<Prisma.WellCountOutputTypeArgs> = z.object({
  select: z.lazy(() => WellCountOutputTypeSelectSchema).nullish(),
}).strict();

export const WellCountOutputTypeSelectSchema: z.ZodType<Prisma.WellCountOutputTypeSelect> = z.object({
  events: z.boolean().optional(),
  detections: z.boolean().optional(),
}).strict();

export const WellSelectSchema: z.ZodType<Prisma.WellSelect> = z.object({
  id: z.boolean().optional(),
  plateId: z.boolean().optional(),
  coordinate: z.boolean().optional(),
  plate: z.union([z.boolean(),z.lazy(() => PlateArgsSchema)]).optional(),
  events: z.union([z.boolean(),z.lazy(() => TelemetryEventFindManyArgsSchema)]).optional(),
  detections: z.union([z.boolean(),z.lazy(() => ColonyDetectionFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => WellCountOutputTypeArgsSchema)]).optional(),
}).strict()

// TELEMETRY EVENT
//------------------------------------------------------

export const TelemetryEventIncludeSchema: z.ZodType<Prisma.TelemetryEventInclude> = z.object({
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

export const TelemetryEventArgsSchema: z.ZodType<Prisma.TelemetryEventArgs> = z.object({
  select: z.lazy(() => TelemetryEventSelectSchema).optional(),
  include: z.lazy(() => TelemetryEventIncludeSchema).optional(),
}).strict();

export const TelemetryEventSelectSchema: z.ZodType<Prisma.TelemetryEventSelect> = z.object({
  id: z.boolean().optional(),
  experimentId: z.boolean().optional(),
  wellId: z.boolean().optional(),
  type: z.boolean().optional(),
  rawPayload: z.boolean().optional(),
  frameTimestamp: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

// COLONY DETECTION
//------------------------------------------------------

export const ColonyDetectionIncludeSchema: z.ZodType<Prisma.ColonyDetectionInclude> = z.object({
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

export const ColonyDetectionArgsSchema: z.ZodType<Prisma.ColonyDetectionArgs> = z.object({
  select: z.lazy(() => ColonyDetectionSelectSchema).optional(),
  include: z.lazy(() => ColonyDetectionIncludeSchema).optional(),
}).strict();

export const ColonyDetectionSelectSchema: z.ZodType<Prisma.ColonyDetectionSelect> = z.object({
  id: z.boolean().optional(),
  wellId: z.boolean().optional(),
  detectedAt: z.boolean().optional(),
  confidence: z.boolean().optional(),
  growthVelocity: z.boolean().optional(),
  cvProvider: z.boolean().optional(),
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

// ELN REPORT
//------------------------------------------------------

export const ElnReportIncludeSchema: z.ZodType<Prisma.ElnReportInclude> = z.object({
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
}).strict()

export const ElnReportArgsSchema: z.ZodType<Prisma.ElnReportArgs> = z.object({
  select: z.lazy(() => ElnReportSelectSchema).optional(),
  include: z.lazy(() => ElnReportIncludeSchema).optional(),
}).strict();

export const ElnReportSelectSchema: z.ZodType<Prisma.ElnReportSelect> = z.object({
  id: z.boolean().optional(),
  experimentId: z.boolean().optional(),
  format: z.boolean().optional(),
  storageUrl: z.boolean().optional(),
  generatedAt: z.boolean().optional(),
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
}).strict()

// CREATE MANY EXPERIMENT AND RETURN OUTPUT TYPE
//------------------------------------------------------

export const CreateManyExperimentAndReturnOutputTypeSelectSchema: z.ZodType<Prisma.CreateManyExperimentAndReturnOutputTypeSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  startedAt: z.boolean().optional(),
  endedAt: z.boolean().optional(),
  status: z.boolean().optional(),
}).strict()

// CREATE MANY PLATE AND RETURN OUTPUT TYPE
//------------------------------------------------------

export const CreateManyPlateAndReturnOutputTypeIncludeSchema: z.ZodType<Prisma.CreateManyPlateAndReturnOutputTypeInclude> = z.object({
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
}).strict()

export const CreateManyPlateAndReturnOutputTypeArgsSchema: z.ZodType<Prisma.CreateManyPlateAndReturnOutputTypeArgs> = z.object({
  select: z.lazy(() => CreateManyPlateAndReturnOutputTypeSelectSchema).optional(),
  include: z.lazy(() => CreateManyPlateAndReturnOutputTypeIncludeSchema).optional(),
}).strict();

export const CreateManyPlateAndReturnOutputTypeSelectSchema: z.ZodType<Prisma.CreateManyPlateAndReturnOutputTypeSelect> = z.object({
  id: z.boolean().optional(),
  experimentId: z.boolean().optional(),
  label: z.boolean().optional(),
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
}).strict()

// CREATE MANY WELL AND RETURN OUTPUT TYPE
//------------------------------------------------------

export const CreateManyWellAndReturnOutputTypeIncludeSchema: z.ZodType<Prisma.CreateManyWellAndReturnOutputTypeInclude> = z.object({
  plate: z.union([z.boolean(),z.lazy(() => PlateArgsSchema)]).optional(),
}).strict()

export const CreateManyWellAndReturnOutputTypeArgsSchema: z.ZodType<Prisma.CreateManyWellAndReturnOutputTypeArgs> = z.object({
  select: z.lazy(() => CreateManyWellAndReturnOutputTypeSelectSchema).optional(),
  include: z.lazy(() => CreateManyWellAndReturnOutputTypeIncludeSchema).optional(),
}).strict();

export const CreateManyWellAndReturnOutputTypeSelectSchema: z.ZodType<Prisma.CreateManyWellAndReturnOutputTypeSelect> = z.object({
  id: z.boolean().optional(),
  plateId: z.boolean().optional(),
  coordinate: z.boolean().optional(),
  plate: z.union([z.boolean(),z.lazy(() => PlateArgsSchema)]).optional(),
}).strict()

// CREATE MANY TELEMETRY EVENT AND RETURN OUTPUT TYPE
//------------------------------------------------------

export const CreateManyTelemetryEventAndReturnOutputTypeIncludeSchema: z.ZodType<Prisma.CreateManyTelemetryEventAndReturnOutputTypeInclude> = z.object({
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

export const CreateManyTelemetryEventAndReturnOutputTypeArgsSchema: z.ZodType<Prisma.CreateManyTelemetryEventAndReturnOutputTypeArgs> = z.object({
  select: z.lazy(() => CreateManyTelemetryEventAndReturnOutputTypeSelectSchema).optional(),
  include: z.lazy(() => CreateManyTelemetryEventAndReturnOutputTypeIncludeSchema).optional(),
}).strict();

export const CreateManyTelemetryEventAndReturnOutputTypeSelectSchema: z.ZodType<Prisma.CreateManyTelemetryEventAndReturnOutputTypeSelect> = z.object({
  id: z.boolean().optional(),
  experimentId: z.boolean().optional(),
  wellId: z.boolean().optional(),
  type: z.boolean().optional(),
  rawPayload: z.boolean().optional(),
  frameTimestamp: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

// CREATE MANY COLONY DETECTION AND RETURN OUTPUT TYPE
//------------------------------------------------------

export const CreateManyColonyDetectionAndReturnOutputTypeIncludeSchema: z.ZodType<Prisma.CreateManyColonyDetectionAndReturnOutputTypeInclude> = z.object({
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

export const CreateManyColonyDetectionAndReturnOutputTypeArgsSchema: z.ZodType<Prisma.CreateManyColonyDetectionAndReturnOutputTypeArgs> = z.object({
  select: z.lazy(() => CreateManyColonyDetectionAndReturnOutputTypeSelectSchema).optional(),
  include: z.lazy(() => CreateManyColonyDetectionAndReturnOutputTypeIncludeSchema).optional(),
}).strict();

export const CreateManyColonyDetectionAndReturnOutputTypeSelectSchema: z.ZodType<Prisma.CreateManyColonyDetectionAndReturnOutputTypeSelect> = z.object({
  id: z.boolean().optional(),
  wellId: z.boolean().optional(),
  detectedAt: z.boolean().optional(),
  confidence: z.boolean().optional(),
  growthVelocity: z.boolean().optional(),
  cvProvider: z.boolean().optional(),
  well: z.union([z.boolean(),z.lazy(() => WellArgsSchema)]).optional(),
}).strict()

// CREATE MANY ELN REPORT AND RETURN OUTPUT TYPE
//------------------------------------------------------

export const CreateManyElnReportAndReturnOutputTypeIncludeSchema: z.ZodType<Prisma.CreateManyElnReportAndReturnOutputTypeInclude> = z.object({
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
}).strict()

export const CreateManyElnReportAndReturnOutputTypeArgsSchema: z.ZodType<Prisma.CreateManyElnReportAndReturnOutputTypeArgs> = z.object({
  select: z.lazy(() => CreateManyElnReportAndReturnOutputTypeSelectSchema).optional(),
  include: z.lazy(() => CreateManyElnReportAndReturnOutputTypeIncludeSchema).optional(),
}).strict();

export const CreateManyElnReportAndReturnOutputTypeSelectSchema: z.ZodType<Prisma.CreateManyElnReportAndReturnOutputTypeSelect> = z.object({
  id: z.boolean().optional(),
  experimentId: z.boolean().optional(),
  format: z.boolean().optional(),
  storageUrl: z.boolean().optional(),
  generatedAt: z.boolean().optional(),
  experiment: z.union([z.boolean(),z.lazy(() => ExperimentArgsSchema)]).optional(),
}).strict()


/////////////////////////////////////////
// INPUT TYPES
/////////////////////////////////////////

export const ExperimentWhereInputSchema: z.ZodType<Prisma.ExperimentWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ExperimentWhereInputSchema),z.lazy(() => ExperimentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExperimentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExperimentWhereInputSchema),z.lazy(() => ExperimentWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  startedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  endedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  status: z.union([ z.lazy(() => EnumExperimentStatusFilterSchema),z.lazy(() => ExperimentStatusSchema) ]).optional(),
  plates: z.lazy(() => PlateListRelationFilterSchema).optional(),
  events: z.lazy(() => TelemetryEventListRelationFilterSchema).optional(),
  elnReports: z.lazy(() => ElnReportListRelationFilterSchema).optional()
}).strict();

export const ExperimentOrderByWithRelationInputSchema: z.ZodType<Prisma.ExperimentOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  endedAt: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  plates: z.lazy(() => PlateOrderByRelationAggregateInputSchema).optional(),
  events: z.lazy(() => TelemetryEventOrderByRelationAggregateInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportOrderByRelationAggregateInputSchema).optional()
}).strict();

export const ExperimentWhereUniqueInputSchema: z.ZodType<Prisma.ExperimentWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => ExperimentWhereInputSchema),z.lazy(() => ExperimentWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExperimentWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExperimentWhereInputSchema),z.lazy(() => ExperimentWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  startedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  endedAt: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  status: z.union([ z.lazy(() => EnumExperimentStatusFilterSchema),z.lazy(() => ExperimentStatusSchema) ]).optional(),
  plates: z.lazy(() => PlateListRelationFilterSchema).optional(),
  events: z.lazy(() => TelemetryEventListRelationFilterSchema).optional(),
  elnReports: z.lazy(() => ElnReportListRelationFilterSchema).optional()
}).strict());

export const ExperimentOrderByWithAggregationInputSchema: z.ZodType<Prisma.ExperimentOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  endedAt: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  status: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ExperimentCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ExperimentMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ExperimentMinOrderByAggregateInputSchema).optional()
}).strict();

export const ExperimentScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ExperimentScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ExperimentScalarWhereWithAggregatesInputSchema),z.lazy(() => ExperimentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ExperimentScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ExperimentScalarWhereWithAggregatesInputSchema),z.lazy(() => ExperimentScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  startedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  endedAt: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  status: z.union([ z.lazy(() => EnumExperimentStatusWithAggregatesFilterSchema),z.lazy(() => ExperimentStatusSchema) ]).optional(),
}).strict();

export const PlateWhereInputSchema: z.ZodType<Prisma.PlateWhereInput> = z.object({
  AND: z.union([ z.lazy(() => PlateWhereInputSchema),z.lazy(() => PlateWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PlateWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PlateWhereInputSchema),z.lazy(() => PlateWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  label: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experiment: z.union([ z.lazy(() => ExperimentRelationFilterSchema),z.lazy(() => ExperimentWhereInputSchema) ]).optional(),
  wells: z.lazy(() => WellListRelationFilterSchema).optional()
}).strict();

export const PlateOrderByWithRelationInputSchema: z.ZodType<Prisma.PlateOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  label: z.lazy(() => SortOrderSchema).optional(),
  experiment: z.lazy(() => ExperimentOrderByWithRelationInputSchema).optional(),
  wells: z.lazy(() => WellOrderByRelationAggregateInputSchema).optional()
}).strict();

export const PlateWhereUniqueInputSchema: z.ZodType<Prisma.PlateWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => PlateWhereInputSchema),z.lazy(() => PlateWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PlateWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PlateWhereInputSchema),z.lazy(() => PlateWhereInputSchema).array() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  label: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experiment: z.union([ z.lazy(() => ExperimentRelationFilterSchema),z.lazy(() => ExperimentWhereInputSchema) ]).optional(),
  wells: z.lazy(() => WellListRelationFilterSchema).optional()
}).strict());

export const PlateOrderByWithAggregationInputSchema: z.ZodType<Prisma.PlateOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  label: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => PlateCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => PlateMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => PlateMinOrderByAggregateInputSchema).optional()
}).strict();

export const PlateScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.PlateScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => PlateScalarWhereWithAggregatesInputSchema),z.lazy(() => PlateScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => PlateScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PlateScalarWhereWithAggregatesInputSchema),z.lazy(() => PlateScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  label: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const WellWhereInputSchema: z.ZodType<Prisma.WellWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WellWhereInputSchema),z.lazy(() => WellWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WellWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WellWhereInputSchema),z.lazy(() => WellWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  plateId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  coordinate: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  plate: z.union([ z.lazy(() => PlateRelationFilterSchema),z.lazy(() => PlateWhereInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventListRelationFilterSchema).optional(),
  detections: z.lazy(() => ColonyDetectionListRelationFilterSchema).optional()
}).strict();

export const WellOrderByWithRelationInputSchema: z.ZodType<Prisma.WellOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  plateId: z.lazy(() => SortOrderSchema).optional(),
  coordinate: z.lazy(() => SortOrderSchema).optional(),
  plate: z.lazy(() => PlateOrderByWithRelationInputSchema).optional(),
  events: z.lazy(() => TelemetryEventOrderByRelationAggregateInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionOrderByRelationAggregateInputSchema).optional()
}).strict();

export const WellWhereUniqueInputSchema: z.ZodType<Prisma.WellWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => WellWhereInputSchema),z.lazy(() => WellWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WellWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WellWhereInputSchema),z.lazy(() => WellWhereInputSchema).array() ]).optional(),
  plateId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  coordinate: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  plate: z.union([ z.lazy(() => PlateRelationFilterSchema),z.lazy(() => PlateWhereInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventListRelationFilterSchema).optional(),
  detections: z.lazy(() => ColonyDetectionListRelationFilterSchema).optional()
}).strict());

export const WellOrderByWithAggregationInputSchema: z.ZodType<Prisma.WellOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  plateId: z.lazy(() => SortOrderSchema).optional(),
  coordinate: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => WellCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => WellMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => WellMinOrderByAggregateInputSchema).optional()
}).strict();

export const WellScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.WellScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => WellScalarWhereWithAggregatesInputSchema),z.lazy(() => WellScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => WellScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WellScalarWhereWithAggregatesInputSchema),z.lazy(() => WellScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  plateId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  coordinate: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const TelemetryEventWhereInputSchema: z.ZodType<Prisma.TelemetryEventWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TelemetryEventWhereInputSchema),z.lazy(() => TelemetryEventWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TelemetryEventWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TelemetryEventWhereInputSchema),z.lazy(() => TelemetryEventWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  wellId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  type: z.union([ z.lazy(() => EnumEventTypeFilterSchema),z.lazy(() => EventTypeSchema) ]).optional(),
  rawPayload: z.lazy(() => JsonFilterSchema).optional(),
  frameTimestamp: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  experiment: z.union([ z.lazy(() => ExperimentRelationFilterSchema),z.lazy(() => ExperimentWhereInputSchema) ]).optional(),
  well: z.union([ z.lazy(() => WellNullableRelationFilterSchema),z.lazy(() => WellWhereInputSchema) ]).optional().nullable(),
}).strict();

export const TelemetryEventOrderByWithRelationInputSchema: z.ZodType<Prisma.TelemetryEventOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  rawPayload: z.lazy(() => SortOrderSchema).optional(),
  frameTimestamp: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  experiment: z.lazy(() => ExperimentOrderByWithRelationInputSchema).optional(),
  well: z.lazy(() => WellOrderByWithRelationInputSchema).optional()
}).strict();

export const TelemetryEventWhereUniqueInputSchema: z.ZodType<Prisma.TelemetryEventWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => TelemetryEventWhereInputSchema),z.lazy(() => TelemetryEventWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TelemetryEventWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TelemetryEventWhereInputSchema),z.lazy(() => TelemetryEventWhereInputSchema).array() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  wellId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  type: z.union([ z.lazy(() => EnumEventTypeFilterSchema),z.lazy(() => EventTypeSchema) ]).optional(),
  rawPayload: z.lazy(() => JsonFilterSchema).optional(),
  frameTimestamp: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  experiment: z.union([ z.lazy(() => ExperimentRelationFilterSchema),z.lazy(() => ExperimentWhereInputSchema) ]).optional(),
  well: z.union([ z.lazy(() => WellNullableRelationFilterSchema),z.lazy(() => WellWhereInputSchema) ]).optional().nullable(),
}).strict());

export const TelemetryEventOrderByWithAggregationInputSchema: z.ZodType<Prisma.TelemetryEventOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  rawPayload: z.lazy(() => SortOrderSchema).optional(),
  frameTimestamp: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => TelemetryEventCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => TelemetryEventMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => TelemetryEventMinOrderByAggregateInputSchema).optional()
}).strict();

export const TelemetryEventScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.TelemetryEventScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => TelemetryEventScalarWhereWithAggregatesInputSchema),z.lazy(() => TelemetryEventScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => TelemetryEventScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TelemetryEventScalarWhereWithAggregatesInputSchema),z.lazy(() => TelemetryEventScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  wellId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  type: z.union([ z.lazy(() => EnumEventTypeWithAggregatesFilterSchema),z.lazy(() => EventTypeSchema) ]).optional(),
  rawPayload: z.lazy(() => JsonWithAggregatesFilterSchema).optional(),
  frameTimestamp: z.union([ z.lazy(() => DateTimeNullableWithAggregatesFilterSchema),z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const ColonyDetectionWhereInputSchema: z.ZodType<Prisma.ColonyDetectionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ColonyDetectionWhereInputSchema),z.lazy(() => ColonyDetectionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ColonyDetectionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ColonyDetectionWhereInputSchema),z.lazy(() => ColonyDetectionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  wellId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  detectedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  confidence: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  growthVelocity: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  cvProvider: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  well: z.union([ z.lazy(() => WellRelationFilterSchema),z.lazy(() => WellWhereInputSchema) ]).optional(),
}).strict();

export const ColonyDetectionOrderByWithRelationInputSchema: z.ZodType<Prisma.ColonyDetectionOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  detectedAt: z.lazy(() => SortOrderSchema).optional(),
  confidence: z.lazy(() => SortOrderSchema).optional(),
  growthVelocity: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  cvProvider: z.lazy(() => SortOrderSchema).optional(),
  well: z.lazy(() => WellOrderByWithRelationInputSchema).optional()
}).strict();

export const ColonyDetectionWhereUniqueInputSchema: z.ZodType<Prisma.ColonyDetectionWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => ColonyDetectionWhereInputSchema),z.lazy(() => ColonyDetectionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ColonyDetectionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ColonyDetectionWhereInputSchema),z.lazy(() => ColonyDetectionWhereInputSchema).array() ]).optional(),
  wellId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  detectedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  confidence: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  growthVelocity: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  cvProvider: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  well: z.union([ z.lazy(() => WellRelationFilterSchema),z.lazy(() => WellWhereInputSchema) ]).optional(),
}).strict());

export const ColonyDetectionOrderByWithAggregationInputSchema: z.ZodType<Prisma.ColonyDetectionOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  detectedAt: z.lazy(() => SortOrderSchema).optional(),
  confidence: z.lazy(() => SortOrderSchema).optional(),
  growthVelocity: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  cvProvider: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ColonyDetectionCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => ColonyDetectionAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ColonyDetectionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ColonyDetectionMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => ColonyDetectionSumOrderByAggregateInputSchema).optional()
}).strict();

export const ColonyDetectionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ColonyDetectionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ColonyDetectionScalarWhereWithAggregatesInputSchema),z.lazy(() => ColonyDetectionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ColonyDetectionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ColonyDetectionScalarWhereWithAggregatesInputSchema),z.lazy(() => ColonyDetectionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  wellId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  detectedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  confidence: z.union([ z.lazy(() => FloatWithAggregatesFilterSchema),z.number() ]).optional(),
  growthVelocity: z.union([ z.lazy(() => FloatNullableWithAggregatesFilterSchema),z.number() ]).optional().nullable(),
  cvProvider: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
}).strict();

export const ElnReportWhereInputSchema: z.ZodType<Prisma.ElnReportWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ElnReportWhereInputSchema),z.lazy(() => ElnReportWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ElnReportWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ElnReportWhereInputSchema),z.lazy(() => ElnReportWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  format: z.union([ z.lazy(() => EnumReportFormatFilterSchema),z.lazy(() => ReportFormatSchema) ]).optional(),
  storageUrl: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  generatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  experiment: z.union([ z.lazy(() => ExperimentRelationFilterSchema),z.lazy(() => ExperimentWhereInputSchema) ]).optional(),
}).strict();

export const ElnReportOrderByWithRelationInputSchema: z.ZodType<Prisma.ElnReportOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  format: z.lazy(() => SortOrderSchema).optional(),
  storageUrl: z.lazy(() => SortOrderSchema).optional(),
  generatedAt: z.lazy(() => SortOrderSchema).optional(),
  experiment: z.lazy(() => ExperimentOrderByWithRelationInputSchema).optional()
}).strict();

export const ElnReportWhereUniqueInputSchema: z.ZodType<Prisma.ElnReportWhereUniqueInput> = z.object({
  id: z.string().cuid()
})
.and(z.object({
  id: z.string().cuid().optional(),
  AND: z.union([ z.lazy(() => ElnReportWhereInputSchema),z.lazy(() => ElnReportWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ElnReportWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ElnReportWhereInputSchema),z.lazy(() => ElnReportWhereInputSchema).array() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  format: z.union([ z.lazy(() => EnumReportFormatFilterSchema),z.lazy(() => ReportFormatSchema) ]).optional(),
  storageUrl: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  generatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  experiment: z.union([ z.lazy(() => ExperimentRelationFilterSchema),z.lazy(() => ExperimentWhereInputSchema) ]).optional(),
}).strict());

export const ElnReportOrderByWithAggregationInputSchema: z.ZodType<Prisma.ElnReportOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  format: z.lazy(() => SortOrderSchema).optional(),
  storageUrl: z.lazy(() => SortOrderSchema).optional(),
  generatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ElnReportCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ElnReportMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ElnReportMinOrderByAggregateInputSchema).optional()
}).strict();

export const ElnReportScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ElnReportScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ElnReportScalarWhereWithAggregatesInputSchema),z.lazy(() => ElnReportScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ElnReportScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ElnReportScalarWhereWithAggregatesInputSchema),z.lazy(() => ElnReportScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  format: z.union([ z.lazy(() => EnumReportFormatWithAggregatesFilterSchema),z.lazy(() => ReportFormatSchema) ]).optional(),
  storageUrl: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  generatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const ExperimentCreateInputSchema: z.ZodType<Prisma.ExperimentCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  plates: z.lazy(() => PlateCreateNestedManyWithoutExperimentInputSchema).optional(),
  events: z.lazy(() => TelemetryEventCreateNestedManyWithoutExperimentInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentUncheckedCreateInputSchema: z.ZodType<Prisma.ExperimentUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  plates: z.lazy(() => PlateUncheckedCreateNestedManyWithoutExperimentInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUncheckedCreateNestedManyWithoutExperimentInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUncheckedCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentUpdateInputSchema: z.ZodType<Prisma.ExperimentUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  plates: z.lazy(() => PlateUpdateManyWithoutExperimentNestedInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUpdateManyWithoutExperimentNestedInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const ExperimentUncheckedUpdateInputSchema: z.ZodType<Prisma.ExperimentUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  plates: z.lazy(() => PlateUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const ExperimentCreateManyInputSchema: z.ZodType<Prisma.ExperimentCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional()
}).strict();

export const ExperimentUpdateManyMutationInputSchema: z.ZodType<Prisma.ExperimentUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ExperimentUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ExperimentUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PlateCreateInputSchema: z.ZodType<Prisma.PlateCreateInput> = z.object({
  id: z.string().cuid().optional(),
  label: z.string(),
  experiment: z.lazy(() => ExperimentCreateNestedOneWithoutPlatesInputSchema),
  wells: z.lazy(() => WellCreateNestedManyWithoutPlateInputSchema).optional()
}).strict();

export const PlateUncheckedCreateInputSchema: z.ZodType<Prisma.PlateUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  label: z.string(),
  wells: z.lazy(() => WellUncheckedCreateNestedManyWithoutPlateInputSchema).optional()
}).strict();

export const PlateUpdateInputSchema: z.ZodType<Prisma.PlateUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experiment: z.lazy(() => ExperimentUpdateOneRequiredWithoutPlatesNestedInputSchema).optional(),
  wells: z.lazy(() => WellUpdateManyWithoutPlateNestedInputSchema).optional()
}).strict();

export const PlateUncheckedUpdateInputSchema: z.ZodType<Prisma.PlateUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wells: z.lazy(() => WellUncheckedUpdateManyWithoutPlateNestedInputSchema).optional()
}).strict();

export const PlateCreateManyInputSchema: z.ZodType<Prisma.PlateCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  label: z.string()
}).strict();

export const PlateUpdateManyMutationInputSchema: z.ZodType<Prisma.PlateUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const PlateUncheckedUpdateManyInputSchema: z.ZodType<Prisma.PlateUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WellCreateInputSchema: z.ZodType<Prisma.WellCreateInput> = z.object({
  id: z.string().cuid().optional(),
  coordinate: z.string(),
  plate: z.lazy(() => PlateCreateNestedOneWithoutWellsInputSchema),
  events: z.lazy(() => TelemetryEventCreateNestedManyWithoutWellInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellUncheckedCreateInputSchema: z.ZodType<Prisma.WellUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  plateId: z.string(),
  coordinate: z.string(),
  events: z.lazy(() => TelemetryEventUncheckedCreateNestedManyWithoutWellInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionUncheckedCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellUpdateInputSchema: z.ZodType<Prisma.WellUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  plate: z.lazy(() => PlateUpdateOneRequiredWithoutWellsNestedInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUpdateManyWithoutWellNestedInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const WellUncheckedUpdateInputSchema: z.ZodType<Prisma.WellUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  plateId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutWellNestedInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionUncheckedUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const WellCreateManyInputSchema: z.ZodType<Prisma.WellCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  plateId: z.string(),
  coordinate: z.string()
}).strict();

export const WellUpdateManyMutationInputSchema: z.ZodType<Prisma.WellUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WellUncheckedUpdateManyInputSchema: z.ZodType<Prisma.WellUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  plateId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventCreateInputSchema: z.ZodType<Prisma.TelemetryEventCreateInput> = z.object({
  id: z.string().cuid().optional(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  experiment: z.lazy(() => ExperimentCreateNestedOneWithoutEventsInputSchema),
  well: z.lazy(() => WellCreateNestedOneWithoutEventsInputSchema).optional()
}).strict();

export const TelemetryEventUncheckedCreateInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  wellId: z.string().optional().nullable(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();

export const TelemetryEventUpdateInputSchema: z.ZodType<Prisma.TelemetryEventUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  experiment: z.lazy(() => ExperimentUpdateOneRequiredWithoutEventsNestedInputSchema).optional(),
  well: z.lazy(() => WellUpdateOneWithoutEventsNestedInputSchema).optional()
}).strict();

export const TelemetryEventUncheckedUpdateInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wellId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventCreateManyInputSchema: z.ZodType<Prisma.TelemetryEventCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  wellId: z.string().optional().nullable(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();

export const TelemetryEventUpdateManyMutationInputSchema: z.ZodType<Prisma.TelemetryEventUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventUncheckedUpdateManyInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wellId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ColonyDetectionCreateInputSchema: z.ZodType<Prisma.ColonyDetectionCreateInput> = z.object({
  id: z.string().cuid().optional(),
  detectedAt: z.coerce.date().optional(),
  confidence: z.number(),
  growthVelocity: z.number().optional().nullable(),
  cvProvider: z.string(),
  well: z.lazy(() => WellCreateNestedOneWithoutDetectionsInputSchema)
}).strict();

export const ColonyDetectionUncheckedCreateInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  wellId: z.string(),
  detectedAt: z.coerce.date().optional(),
  confidence: z.number(),
  growthVelocity: z.number().optional().nullable(),
  cvProvider: z.string()
}).strict();

export const ColonyDetectionUpdateInputSchema: z.ZodType<Prisma.ColonyDetectionUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detectedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  confidence: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  growthVelocity: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cvProvider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  well: z.lazy(() => WellUpdateOneRequiredWithoutDetectionsNestedInputSchema).optional()
}).strict();

export const ColonyDetectionUncheckedUpdateInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wellId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detectedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  confidence: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  growthVelocity: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cvProvider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ColonyDetectionCreateManyInputSchema: z.ZodType<Prisma.ColonyDetectionCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  wellId: z.string(),
  detectedAt: z.coerce.date().optional(),
  confidence: z.number(),
  growthVelocity: z.number().optional().nullable(),
  cvProvider: z.string()
}).strict();

export const ColonyDetectionUpdateManyMutationInputSchema: z.ZodType<Prisma.ColonyDetectionUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detectedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  confidence: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  growthVelocity: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cvProvider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ColonyDetectionUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wellId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detectedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  confidence: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  growthVelocity: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cvProvider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ElnReportCreateInputSchema: z.ZodType<Prisma.ElnReportCreateInput> = z.object({
  id: z.string().cuid().optional(),
  format: z.lazy(() => ReportFormatSchema),
  storageUrl: z.string(),
  generatedAt: z.coerce.date().optional(),
  experiment: z.lazy(() => ExperimentCreateNestedOneWithoutElnReportsInputSchema)
}).strict();

export const ElnReportUncheckedCreateInputSchema: z.ZodType<Prisma.ElnReportUncheckedCreateInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  format: z.lazy(() => ReportFormatSchema),
  storageUrl: z.string(),
  generatedAt: z.coerce.date().optional()
}).strict();

export const ElnReportUpdateInputSchema: z.ZodType<Prisma.ElnReportUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  format: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => EnumReportFormatFieldUpdateOperationsInputSchema) ]).optional(),
  storageUrl: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  generatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  experiment: z.lazy(() => ExperimentUpdateOneRequiredWithoutElnReportsNestedInputSchema).optional()
}).strict();

export const ElnReportUncheckedUpdateInputSchema: z.ZodType<Prisma.ElnReportUncheckedUpdateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  format: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => EnumReportFormatFieldUpdateOperationsInputSchema) ]).optional(),
  storageUrl: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  generatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ElnReportCreateManyInputSchema: z.ZodType<Prisma.ElnReportCreateManyInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  format: z.lazy(() => ReportFormatSchema),
  storageUrl: z.string(),
  generatedAt: z.coerce.date().optional()
}).strict();

export const ElnReportUpdateManyMutationInputSchema: z.ZodType<Prisma.ElnReportUpdateManyMutationInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  format: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => EnumReportFormatFieldUpdateOperationsInputSchema) ]).optional(),
  storageUrl: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  generatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ElnReportUncheckedUpdateManyInputSchema: z.ZodType<Prisma.ElnReportUncheckedUpdateManyInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  format: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => EnumReportFormatFieldUpdateOperationsInputSchema) ]).optional(),
  storageUrl: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  generatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const StringFilterSchema: z.ZodType<Prisma.StringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const DateTimeFilterSchema: z.ZodType<Prisma.DateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const DateTimeNullableFilterSchema: z.ZodType<Prisma.DateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumExperimentStatusFilterSchema: z.ZodType<Prisma.EnumExperimentStatusFilter> = z.object({
  equals: z.lazy(() => ExperimentStatusSchema).optional(),
  in: z.lazy(() => ExperimentStatusSchema).array().optional(),
  notIn: z.lazy(() => ExperimentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => NestedEnumExperimentStatusFilterSchema) ]).optional(),
}).strict();

export const PlateListRelationFilterSchema: z.ZodType<Prisma.PlateListRelationFilter> = z.object({
  every: z.lazy(() => PlateWhereInputSchema).optional(),
  some: z.lazy(() => PlateWhereInputSchema).optional(),
  none: z.lazy(() => PlateWhereInputSchema).optional()
}).strict();

export const TelemetryEventListRelationFilterSchema: z.ZodType<Prisma.TelemetryEventListRelationFilter> = z.object({
  every: z.lazy(() => TelemetryEventWhereInputSchema).optional(),
  some: z.lazy(() => TelemetryEventWhereInputSchema).optional(),
  none: z.lazy(() => TelemetryEventWhereInputSchema).optional()
}).strict();

export const ElnReportListRelationFilterSchema: z.ZodType<Prisma.ElnReportListRelationFilter> = z.object({
  every: z.lazy(() => ElnReportWhereInputSchema).optional(),
  some: z.lazy(() => ElnReportWhereInputSchema).optional(),
  none: z.lazy(() => ElnReportWhereInputSchema).optional()
}).strict();

export const SortOrderInputSchema: z.ZodType<Prisma.SortOrderInput> = z.object({
  sort: z.lazy(() => SortOrderSchema),
  nulls: z.lazy(() => NullsOrderSchema).optional()
}).strict();

export const PlateOrderByRelationAggregateInputSchema: z.ZodType<Prisma.PlateOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TelemetryEventOrderByRelationAggregateInputSchema: z.ZodType<Prisma.TelemetryEventOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ElnReportOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ElnReportOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExperimentCountOrderByAggregateInputSchema: z.ZodType<Prisma.ExperimentCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  endedAt: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExperimentMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ExperimentMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  endedAt: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ExperimentMinOrderByAggregateInputSchema: z.ZodType<Prisma.ExperimentMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  startedAt: z.lazy(() => SortOrderSchema).optional(),
  endedAt: z.lazy(() => SortOrderSchema).optional(),
  status: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StringWithAggregatesFilterSchema: z.ZodType<Prisma.StringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const DateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const DateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.DateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const EnumExperimentStatusWithAggregatesFilterSchema: z.ZodType<Prisma.EnumExperimentStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ExperimentStatusSchema).optional(),
  in: z.lazy(() => ExperimentStatusSchema).array().optional(),
  notIn: z.lazy(() => ExperimentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => NestedEnumExperimentStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumExperimentStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumExperimentStatusFilterSchema).optional()
}).strict();

export const ExperimentRelationFilterSchema: z.ZodType<Prisma.ExperimentRelationFilter> = z.object({
  is: z.lazy(() => ExperimentWhereInputSchema).optional(),
  isNot: z.lazy(() => ExperimentWhereInputSchema).optional()
}).strict();

export const WellListRelationFilterSchema: z.ZodType<Prisma.WellListRelationFilter> = z.object({
  every: z.lazy(() => WellWhereInputSchema).optional(),
  some: z.lazy(() => WellWhereInputSchema).optional(),
  none: z.lazy(() => WellWhereInputSchema).optional()
}).strict();

export const WellOrderByRelationAggregateInputSchema: z.ZodType<Prisma.WellOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PlateCountOrderByAggregateInputSchema: z.ZodType<Prisma.PlateCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  label: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PlateMaxOrderByAggregateInputSchema: z.ZodType<Prisma.PlateMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  label: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PlateMinOrderByAggregateInputSchema: z.ZodType<Prisma.PlateMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  label: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const PlateRelationFilterSchema: z.ZodType<Prisma.PlateRelationFilter> = z.object({
  is: z.lazy(() => PlateWhereInputSchema).optional(),
  isNot: z.lazy(() => PlateWhereInputSchema).optional()
}).strict();

export const ColonyDetectionListRelationFilterSchema: z.ZodType<Prisma.ColonyDetectionListRelationFilter> = z.object({
  every: z.lazy(() => ColonyDetectionWhereInputSchema).optional(),
  some: z.lazy(() => ColonyDetectionWhereInputSchema).optional(),
  none: z.lazy(() => ColonyDetectionWhereInputSchema).optional()
}).strict();

export const ColonyDetectionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ColonyDetectionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WellCountOrderByAggregateInputSchema: z.ZodType<Prisma.WellCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  plateId: z.lazy(() => SortOrderSchema).optional(),
  coordinate: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WellMaxOrderByAggregateInputSchema: z.ZodType<Prisma.WellMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  plateId: z.lazy(() => SortOrderSchema).optional(),
  coordinate: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const WellMinOrderByAggregateInputSchema: z.ZodType<Prisma.WellMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  plateId: z.lazy(() => SortOrderSchema).optional(),
  coordinate: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StringNullableFilterSchema: z.ZodType<Prisma.StringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const EnumEventTypeFilterSchema: z.ZodType<Prisma.EnumEventTypeFilter> = z.object({
  equals: z.lazy(() => EventTypeSchema).optional(),
  in: z.lazy(() => EventTypeSchema).array().optional(),
  notIn: z.lazy(() => EventTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => NestedEnumEventTypeFilterSchema) ]).optional(),
}).strict();

export const JsonFilterSchema: z.ZodType<Prisma.JsonFilter> = z.object({
  equals: InputJsonValue.optional(),
  path: z.string().array().optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_contains: InputJsonValue.optional().nullable(),
  array_starts_with: InputJsonValue.optional().nullable(),
  array_ends_with: InputJsonValue.optional().nullable(),
  lt: InputJsonValue.optional(),
  lte: InputJsonValue.optional(),
  gt: InputJsonValue.optional(),
  gte: InputJsonValue.optional(),
  not: InputJsonValue.optional()
}).strict();

export const WellNullableRelationFilterSchema: z.ZodType<Prisma.WellNullableRelationFilter> = z.object({
  is: z.lazy(() => WellWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => WellWhereInputSchema).optional().nullable()
}).strict();

export const TelemetryEventCountOrderByAggregateInputSchema: z.ZodType<Prisma.TelemetryEventCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  rawPayload: z.lazy(() => SortOrderSchema).optional(),
  frameTimestamp: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TelemetryEventMaxOrderByAggregateInputSchema: z.ZodType<Prisma.TelemetryEventMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  frameTimestamp: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const TelemetryEventMinOrderByAggregateInputSchema: z.ZodType<Prisma.TelemetryEventMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  type: z.lazy(() => SortOrderSchema).optional(),
  frameTimestamp: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const StringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.StringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  mode: z.lazy(() => QueryModeSchema).optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
}).strict();

export const EnumEventTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumEventTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => EventTypeSchema).optional(),
  in: z.lazy(() => EventTypeSchema).array().optional(),
  notIn: z.lazy(() => EventTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => NestedEnumEventTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumEventTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumEventTypeFilterSchema).optional()
}).strict();

export const JsonWithAggregatesFilterSchema: z.ZodType<Prisma.JsonWithAggregatesFilter> = z.object({
  equals: InputJsonValue.optional(),
  path: z.string().array().optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_contains: InputJsonValue.optional().nullable(),
  array_starts_with: InputJsonValue.optional().nullable(),
  array_ends_with: InputJsonValue.optional().nullable(),
  lt: InputJsonValue.optional(),
  lte: InputJsonValue.optional(),
  gt: InputJsonValue.optional(),
  gte: InputJsonValue.optional(),
  not: InputJsonValue.optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedJsonFilterSchema).optional(),
  _max: z.lazy(() => NestedJsonFilterSchema).optional()
}).strict();

export const FloatFilterSchema: z.ZodType<Prisma.FloatFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
}).strict();

export const FloatNullableFilterSchema: z.ZodType<Prisma.FloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const WellRelationFilterSchema: z.ZodType<Prisma.WellRelationFilter> = z.object({
  is: z.lazy(() => WellWhereInputSchema).optional(),
  isNot: z.lazy(() => WellWhereInputSchema).optional()
}).strict();

export const ColonyDetectionCountOrderByAggregateInputSchema: z.ZodType<Prisma.ColonyDetectionCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  detectedAt: z.lazy(() => SortOrderSchema).optional(),
  confidence: z.lazy(() => SortOrderSchema).optional(),
  growthVelocity: z.lazy(() => SortOrderSchema).optional(),
  cvProvider: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ColonyDetectionAvgOrderByAggregateInputSchema: z.ZodType<Prisma.ColonyDetectionAvgOrderByAggregateInput> = z.object({
  confidence: z.lazy(() => SortOrderSchema).optional(),
  growthVelocity: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ColonyDetectionMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ColonyDetectionMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  detectedAt: z.lazy(() => SortOrderSchema).optional(),
  confidence: z.lazy(() => SortOrderSchema).optional(),
  growthVelocity: z.lazy(() => SortOrderSchema).optional(),
  cvProvider: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ColonyDetectionMinOrderByAggregateInputSchema: z.ZodType<Prisma.ColonyDetectionMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  wellId: z.lazy(() => SortOrderSchema).optional(),
  detectedAt: z.lazy(() => SortOrderSchema).optional(),
  confidence: z.lazy(() => SortOrderSchema).optional(),
  growthVelocity: z.lazy(() => SortOrderSchema).optional(),
  cvProvider: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ColonyDetectionSumOrderByAggregateInputSchema: z.ZodType<Prisma.ColonyDetectionSumOrderByAggregateInput> = z.object({
  confidence: z.lazy(() => SortOrderSchema).optional(),
  growthVelocity: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const FloatWithAggregatesFilterSchema: z.ZodType<Prisma.FloatWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatFilterSchema).optional()
}).strict();

export const FloatNullableWithAggregatesFilterSchema: z.ZodType<Prisma.FloatNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatNullableFilterSchema).optional()
}).strict();

export const EnumReportFormatFilterSchema: z.ZodType<Prisma.EnumReportFormatFilter> = z.object({
  equals: z.lazy(() => ReportFormatSchema).optional(),
  in: z.lazy(() => ReportFormatSchema).array().optional(),
  notIn: z.lazy(() => ReportFormatSchema).array().optional(),
  not: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => NestedEnumReportFormatFilterSchema) ]).optional(),
}).strict();

export const ElnReportCountOrderByAggregateInputSchema: z.ZodType<Prisma.ElnReportCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  format: z.lazy(() => SortOrderSchema).optional(),
  storageUrl: z.lazy(() => SortOrderSchema).optional(),
  generatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ElnReportMaxOrderByAggregateInputSchema: z.ZodType<Prisma.ElnReportMaxOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  format: z.lazy(() => SortOrderSchema).optional(),
  storageUrl: z.lazy(() => SortOrderSchema).optional(),
  generatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const ElnReportMinOrderByAggregateInputSchema: z.ZodType<Prisma.ElnReportMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  experimentId: z.lazy(() => SortOrderSchema).optional(),
  format: z.lazy(() => SortOrderSchema).optional(),
  storageUrl: z.lazy(() => SortOrderSchema).optional(),
  generatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export const EnumReportFormatWithAggregatesFilterSchema: z.ZodType<Prisma.EnumReportFormatWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ReportFormatSchema).optional(),
  in: z.lazy(() => ReportFormatSchema).array().optional(),
  notIn: z.lazy(() => ReportFormatSchema).array().optional(),
  not: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => NestedEnumReportFormatWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumReportFormatFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumReportFormatFilterSchema).optional()
}).strict();

export const PlateCreateNestedManyWithoutExperimentInputSchema: z.ZodType<Prisma.PlateCreateNestedManyWithoutExperimentInput> = z.object({
  create: z.union([ z.lazy(() => PlateCreateWithoutExperimentInputSchema),z.lazy(() => PlateCreateWithoutExperimentInputSchema).array(),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PlateCreateManyExperimentInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TelemetryEventCreateNestedManyWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventCreateNestedManyWithoutExperimentInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyExperimentInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ElnReportCreateNestedManyWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportCreateNestedManyWithoutExperimentInput> = z.object({
  create: z.union([ z.lazy(() => ElnReportCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateWithoutExperimentInputSchema).array(),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ElnReportCreateManyExperimentInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const PlateUncheckedCreateNestedManyWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUncheckedCreateNestedManyWithoutExperimentInput> = z.object({
  create: z.union([ z.lazy(() => PlateCreateWithoutExperimentInputSchema),z.lazy(() => PlateCreateWithoutExperimentInputSchema).array(),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PlateCreateManyExperimentInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TelemetryEventUncheckedCreateNestedManyWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedCreateNestedManyWithoutExperimentInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyExperimentInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ElnReportUncheckedCreateNestedManyWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUncheckedCreateNestedManyWithoutExperimentInput> = z.object({
  create: z.union([ z.lazy(() => ElnReportCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateWithoutExperimentInputSchema).array(),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ElnReportCreateManyExperimentInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const StringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.StringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional()
}).strict();

export const DateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.DateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional()
}).strict();

export const NullableDateTimeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableDateTimeFieldUpdateOperationsInput> = z.object({
  set: z.coerce.date().optional().nullable()
}).strict();

export const EnumExperimentStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumExperimentStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ExperimentStatusSchema).optional()
}).strict();

export const PlateUpdateManyWithoutExperimentNestedInputSchema: z.ZodType<Prisma.PlateUpdateManyWithoutExperimentNestedInput> = z.object({
  create: z.union([ z.lazy(() => PlateCreateWithoutExperimentInputSchema),z.lazy(() => PlateCreateWithoutExperimentInputSchema).array(),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PlateUpsertWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => PlateUpsertWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PlateCreateManyExperimentInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PlateUpdateWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => PlateUpdateWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PlateUpdateManyWithWhereWithoutExperimentInputSchema),z.lazy(() => PlateUpdateManyWithWhereWithoutExperimentInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PlateScalarWhereInputSchema),z.lazy(() => PlateScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TelemetryEventUpdateManyWithoutExperimentNestedInputSchema: z.ZodType<Prisma.TelemetryEventUpdateManyWithoutExperimentNestedInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyExperimentInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutExperimentInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TelemetryEventScalarWhereInputSchema),z.lazy(() => TelemetryEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ElnReportUpdateManyWithoutExperimentNestedInputSchema: z.ZodType<Prisma.ElnReportUpdateManyWithoutExperimentNestedInput> = z.object({
  create: z.union([ z.lazy(() => ElnReportCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateWithoutExperimentInputSchema).array(),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ElnReportUpsertWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => ElnReportUpsertWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ElnReportCreateManyExperimentInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ElnReportUpdateWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => ElnReportUpdateWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ElnReportUpdateManyWithWhereWithoutExperimentInputSchema),z.lazy(() => ElnReportUpdateManyWithWhereWithoutExperimentInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ElnReportScalarWhereInputSchema),z.lazy(() => ElnReportScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const PlateUncheckedUpdateManyWithoutExperimentNestedInputSchema: z.ZodType<Prisma.PlateUncheckedUpdateManyWithoutExperimentNestedInput> = z.object({
  create: z.union([ z.lazy(() => PlateCreateWithoutExperimentInputSchema),z.lazy(() => PlateCreateWithoutExperimentInputSchema).array(),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => PlateCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => PlateUpsertWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => PlateUpsertWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => PlateCreateManyExperimentInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => PlateWhereUniqueInputSchema),z.lazy(() => PlateWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => PlateUpdateWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => PlateUpdateWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => PlateUpdateManyWithWhereWithoutExperimentInputSchema),z.lazy(() => PlateUpdateManyWithWhereWithoutExperimentInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => PlateScalarWhereInputSchema),z.lazy(() => PlateScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TelemetryEventUncheckedUpdateManyWithoutExperimentNestedInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateManyWithoutExperimentNestedInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyExperimentInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutExperimentInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TelemetryEventScalarWhereInputSchema),z.lazy(() => TelemetryEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ElnReportUncheckedUpdateManyWithoutExperimentNestedInputSchema: z.ZodType<Prisma.ElnReportUncheckedUpdateManyWithoutExperimentNestedInput> = z.object({
  create: z.union([ z.lazy(() => ElnReportCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateWithoutExperimentInputSchema).array(),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema),z.lazy(() => ElnReportCreateOrConnectWithoutExperimentInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ElnReportUpsertWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => ElnReportUpsertWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ElnReportCreateManyExperimentInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ElnReportWhereUniqueInputSchema),z.lazy(() => ElnReportWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ElnReportUpdateWithWhereUniqueWithoutExperimentInputSchema),z.lazy(() => ElnReportUpdateWithWhereUniqueWithoutExperimentInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ElnReportUpdateManyWithWhereWithoutExperimentInputSchema),z.lazy(() => ElnReportUpdateManyWithWhereWithoutExperimentInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ElnReportScalarWhereInputSchema),z.lazy(() => ElnReportScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExperimentCreateNestedOneWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentCreateNestedOneWithoutPlatesInput> = z.object({
  create: z.union([ z.lazy(() => ExperimentCreateWithoutPlatesInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutPlatesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExperimentCreateOrConnectWithoutPlatesInputSchema).optional(),
  connect: z.lazy(() => ExperimentWhereUniqueInputSchema).optional()
}).strict();

export const WellCreateNestedManyWithoutPlateInputSchema: z.ZodType<Prisma.WellCreateNestedManyWithoutPlateInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutPlateInputSchema),z.lazy(() => WellCreateWithoutPlateInputSchema).array(),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema),z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WellCreateManyPlateInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const WellUncheckedCreateNestedManyWithoutPlateInputSchema: z.ZodType<Prisma.WellUncheckedCreateNestedManyWithoutPlateInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutPlateInputSchema),z.lazy(() => WellCreateWithoutPlateInputSchema).array(),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema),z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WellCreateManyPlateInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ExperimentUpdateOneRequiredWithoutPlatesNestedInputSchema: z.ZodType<Prisma.ExperimentUpdateOneRequiredWithoutPlatesNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExperimentCreateWithoutPlatesInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutPlatesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExperimentCreateOrConnectWithoutPlatesInputSchema).optional(),
  upsert: z.lazy(() => ExperimentUpsertWithoutPlatesInputSchema).optional(),
  connect: z.lazy(() => ExperimentWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ExperimentUpdateToOneWithWhereWithoutPlatesInputSchema),z.lazy(() => ExperimentUpdateWithoutPlatesInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutPlatesInputSchema) ]).optional(),
}).strict();

export const WellUpdateManyWithoutPlateNestedInputSchema: z.ZodType<Prisma.WellUpdateManyWithoutPlateNestedInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutPlateInputSchema),z.lazy(() => WellCreateWithoutPlateInputSchema).array(),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema),z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WellUpsertWithWhereUniqueWithoutPlateInputSchema),z.lazy(() => WellUpsertWithWhereUniqueWithoutPlateInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WellCreateManyPlateInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WellUpdateWithWhereUniqueWithoutPlateInputSchema),z.lazy(() => WellUpdateWithWhereUniqueWithoutPlateInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WellUpdateManyWithWhereWithoutPlateInputSchema),z.lazy(() => WellUpdateManyWithWhereWithoutPlateInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WellScalarWhereInputSchema),z.lazy(() => WellScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const WellUncheckedUpdateManyWithoutPlateNestedInputSchema: z.ZodType<Prisma.WellUncheckedUpdateManyWithoutPlateNestedInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutPlateInputSchema),z.lazy(() => WellCreateWithoutPlateInputSchema).array(),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema),z.lazy(() => WellCreateOrConnectWithoutPlateInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => WellUpsertWithWhereUniqueWithoutPlateInputSchema),z.lazy(() => WellUpsertWithWhereUniqueWithoutPlateInputSchema).array() ]).optional(),
  createMany: z.lazy(() => WellCreateManyPlateInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => WellWhereUniqueInputSchema),z.lazy(() => WellWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => WellUpdateWithWhereUniqueWithoutPlateInputSchema),z.lazy(() => WellUpdateWithWhereUniqueWithoutPlateInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => WellUpdateManyWithWhereWithoutPlateInputSchema),z.lazy(() => WellUpdateManyWithWhereWithoutPlateInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => WellScalarWhereInputSchema),z.lazy(() => WellScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const PlateCreateNestedOneWithoutWellsInputSchema: z.ZodType<Prisma.PlateCreateNestedOneWithoutWellsInput> = z.object({
  create: z.union([ z.lazy(() => PlateCreateWithoutWellsInputSchema),z.lazy(() => PlateUncheckedCreateWithoutWellsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => PlateCreateOrConnectWithoutWellsInputSchema).optional(),
  connect: z.lazy(() => PlateWhereUniqueInputSchema).optional()
}).strict();

export const TelemetryEventCreateNestedManyWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventCreateNestedManyWithoutWellInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateWithoutWellInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyWellInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ColonyDetectionCreateNestedManyWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionCreateNestedManyWithoutWellInput> = z.object({
  create: z.union([ z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema).array(),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ColonyDetectionCreateManyWellInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const TelemetryEventUncheckedCreateNestedManyWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedCreateNestedManyWithoutWellInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateWithoutWellInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyWellInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const ColonyDetectionUncheckedCreateNestedManyWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedCreateNestedManyWithoutWellInput> = z.object({
  create: z.union([ z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema).array(),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ColonyDetectionCreateManyWellInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export const PlateUpdateOneRequiredWithoutWellsNestedInputSchema: z.ZodType<Prisma.PlateUpdateOneRequiredWithoutWellsNestedInput> = z.object({
  create: z.union([ z.lazy(() => PlateCreateWithoutWellsInputSchema),z.lazy(() => PlateUncheckedCreateWithoutWellsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => PlateCreateOrConnectWithoutWellsInputSchema).optional(),
  upsert: z.lazy(() => PlateUpsertWithoutWellsInputSchema).optional(),
  connect: z.lazy(() => PlateWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => PlateUpdateToOneWithWhereWithoutWellsInputSchema),z.lazy(() => PlateUpdateWithoutWellsInputSchema),z.lazy(() => PlateUncheckedUpdateWithoutWellsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventUpdateManyWithoutWellNestedInputSchema: z.ZodType<Prisma.TelemetryEventUpdateManyWithoutWellNestedInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateWithoutWellInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutWellInputSchema),z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyWellInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutWellInputSchema),z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutWellInputSchema),z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutWellInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TelemetryEventScalarWhereInputSchema),z.lazy(() => TelemetryEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ColonyDetectionUpdateManyWithoutWellNestedInputSchema: z.ZodType<Prisma.ColonyDetectionUpdateManyWithoutWellNestedInput> = z.object({
  create: z.union([ z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema).array(),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ColonyDetectionUpsertWithWhereUniqueWithoutWellInputSchema),z.lazy(() => ColonyDetectionUpsertWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ColonyDetectionCreateManyWellInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ColonyDetectionUpdateWithWhereUniqueWithoutWellInputSchema),z.lazy(() => ColonyDetectionUpdateWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ColonyDetectionUpdateManyWithWhereWithoutWellInputSchema),z.lazy(() => ColonyDetectionUpdateManyWithWhereWithoutWellInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ColonyDetectionScalarWhereInputSchema),z.lazy(() => ColonyDetectionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const TelemetryEventUncheckedUpdateManyWithoutWellNestedInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateManyWithoutWellNestedInput> = z.object({
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateWithoutWellInputSchema).array(),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema),z.lazy(() => TelemetryEventCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutWellInputSchema),z.lazy(() => TelemetryEventUpsertWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => TelemetryEventCreateManyWellInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => TelemetryEventWhereUniqueInputSchema),z.lazy(() => TelemetryEventWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutWellInputSchema),z.lazy(() => TelemetryEventUpdateWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutWellInputSchema),z.lazy(() => TelemetryEventUpdateManyWithWhereWithoutWellInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => TelemetryEventScalarWhereInputSchema),z.lazy(() => TelemetryEventScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ColonyDetectionUncheckedUpdateManyWithoutWellNestedInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedUpdateManyWithoutWellNestedInput> = z.object({
  create: z.union([ z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema).array(),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema),z.lazy(() => ColonyDetectionCreateOrConnectWithoutWellInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ColonyDetectionUpsertWithWhereUniqueWithoutWellInputSchema),z.lazy(() => ColonyDetectionUpsertWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ColonyDetectionCreateManyWellInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ColonyDetectionWhereUniqueInputSchema),z.lazy(() => ColonyDetectionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ColonyDetectionUpdateWithWhereUniqueWithoutWellInputSchema),z.lazy(() => ColonyDetectionUpdateWithWhereUniqueWithoutWellInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ColonyDetectionUpdateManyWithWhereWithoutWellInputSchema),z.lazy(() => ColonyDetectionUpdateManyWithWhereWithoutWellInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ColonyDetectionScalarWhereInputSchema),z.lazy(() => ColonyDetectionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export const ExperimentCreateNestedOneWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentCreateNestedOneWithoutEventsInput> = z.object({
  create: z.union([ z.lazy(() => ExperimentCreateWithoutEventsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExperimentCreateOrConnectWithoutEventsInputSchema).optional(),
  connect: z.lazy(() => ExperimentWhereUniqueInputSchema).optional()
}).strict();

export const WellCreateNestedOneWithoutEventsInputSchema: z.ZodType<Prisma.WellCreateNestedOneWithoutEventsInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutEventsInputSchema),z.lazy(() => WellUncheckedCreateWithoutEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WellCreateOrConnectWithoutEventsInputSchema).optional(),
  connect: z.lazy(() => WellWhereUniqueInputSchema).optional()
}).strict();

export const EnumEventTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumEventTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => EventTypeSchema).optional()
}).strict();

export const ExperimentUpdateOneRequiredWithoutEventsNestedInputSchema: z.ZodType<Prisma.ExperimentUpdateOneRequiredWithoutEventsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExperimentCreateWithoutEventsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExperimentCreateOrConnectWithoutEventsInputSchema).optional(),
  upsert: z.lazy(() => ExperimentUpsertWithoutEventsInputSchema).optional(),
  connect: z.lazy(() => ExperimentWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ExperimentUpdateToOneWithWhereWithoutEventsInputSchema),z.lazy(() => ExperimentUpdateWithoutEventsInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutEventsInputSchema) ]).optional(),
}).strict();

export const WellUpdateOneWithoutEventsNestedInputSchema: z.ZodType<Prisma.WellUpdateOneWithoutEventsNestedInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutEventsInputSchema),z.lazy(() => WellUncheckedCreateWithoutEventsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WellCreateOrConnectWithoutEventsInputSchema).optional(),
  upsert: z.lazy(() => WellUpsertWithoutEventsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => WellWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => WellWhereInputSchema) ]).optional(),
  connect: z.lazy(() => WellWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WellUpdateToOneWithWhereWithoutEventsInputSchema),z.lazy(() => WellUpdateWithoutEventsInputSchema),z.lazy(() => WellUncheckedUpdateWithoutEventsInputSchema) ]).optional(),
}).strict();

export const NullableStringFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableStringFieldUpdateOperationsInput> = z.object({
  set: z.string().optional().nullable()
}).strict();

export const WellCreateNestedOneWithoutDetectionsInputSchema: z.ZodType<Prisma.WellCreateNestedOneWithoutDetectionsInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutDetectionsInputSchema),z.lazy(() => WellUncheckedCreateWithoutDetectionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WellCreateOrConnectWithoutDetectionsInputSchema).optional(),
  connect: z.lazy(() => WellWhereUniqueInputSchema).optional()
}).strict();

export const FloatFieldUpdateOperationsInputSchema: z.ZodType<Prisma.FloatFieldUpdateOperationsInput> = z.object({
  set: z.number().optional(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const NullableFloatFieldUpdateOperationsInputSchema: z.ZodType<Prisma.NullableFloatFieldUpdateOperationsInput> = z.object({
  set: z.number().optional().nullable(),
  increment: z.number().optional(),
  decrement: z.number().optional(),
  multiply: z.number().optional(),
  divide: z.number().optional()
}).strict();

export const WellUpdateOneRequiredWithoutDetectionsNestedInputSchema: z.ZodType<Prisma.WellUpdateOneRequiredWithoutDetectionsNestedInput> = z.object({
  create: z.union([ z.lazy(() => WellCreateWithoutDetectionsInputSchema),z.lazy(() => WellUncheckedCreateWithoutDetectionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => WellCreateOrConnectWithoutDetectionsInputSchema).optional(),
  upsert: z.lazy(() => WellUpsertWithoutDetectionsInputSchema).optional(),
  connect: z.lazy(() => WellWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => WellUpdateToOneWithWhereWithoutDetectionsInputSchema),z.lazy(() => WellUpdateWithoutDetectionsInputSchema),z.lazy(() => WellUncheckedUpdateWithoutDetectionsInputSchema) ]).optional(),
}).strict();

export const ExperimentCreateNestedOneWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentCreateNestedOneWithoutElnReportsInput> = z.object({
  create: z.union([ z.lazy(() => ExperimentCreateWithoutElnReportsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutElnReportsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExperimentCreateOrConnectWithoutElnReportsInputSchema).optional(),
  connect: z.lazy(() => ExperimentWhereUniqueInputSchema).optional()
}).strict();

export const EnumReportFormatFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumReportFormatFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ReportFormatSchema).optional()
}).strict();

export const ExperimentUpdateOneRequiredWithoutElnReportsNestedInputSchema: z.ZodType<Prisma.ExperimentUpdateOneRequiredWithoutElnReportsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ExperimentCreateWithoutElnReportsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutElnReportsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ExperimentCreateOrConnectWithoutElnReportsInputSchema).optional(),
  upsert: z.lazy(() => ExperimentUpsertWithoutElnReportsInputSchema).optional(),
  connect: z.lazy(() => ExperimentWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ExperimentUpdateToOneWithWhereWithoutElnReportsInputSchema),z.lazy(() => ExperimentUpdateWithoutElnReportsInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutElnReportsInputSchema) ]).optional(),
}).strict();

export const NestedStringFilterSchema: z.ZodType<Prisma.NestedStringFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringFilterSchema) ]).optional(),
}).strict();

export const NestedDateTimeFilterSchema: z.ZodType<Prisma.NestedDateTimeFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeFilterSchema) ]).optional(),
}).strict();

export const NestedDateTimeNullableFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumExperimentStatusFilterSchema: z.ZodType<Prisma.NestedEnumExperimentStatusFilter> = z.object({
  equals: z.lazy(() => ExperimentStatusSchema).optional(),
  in: z.lazy(() => ExperimentStatusSchema).array().optional(),
  notIn: z.lazy(() => ExperimentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => NestedEnumExperimentStatusFilterSchema) ]).optional(),
}).strict();

export const NestedStringWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringWithAggregatesFilter> = z.object({
  equals: z.string().optional(),
  in: z.string().array().optional(),
  notIn: z.string().array().optional(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedStringFilterSchema).optional(),
  _max: z.lazy(() => NestedStringFilterSchema).optional()
}).strict();

export const NestedIntFilterSchema: z.ZodType<Prisma.NestedIntFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntFilterSchema) ]).optional(),
}).strict();

export const NestedDateTimeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional(),
  in: z.coerce.date().array().optional(),
  notIn: z.coerce.date().array().optional(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeFilterSchema).optional()
}).strict();

export const NestedDateTimeNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedDateTimeNullableWithAggregatesFilter> = z.object({
  equals: z.coerce.date().optional().nullable(),
  in: z.coerce.date().array().optional().nullable(),
  notIn: z.coerce.date().array().optional().nullable(),
  lt: z.coerce.date().optional(),
  lte: z.coerce.date().optional(),
  gt: z.coerce.date().optional(),
  gte: z.coerce.date().optional(),
  not: z.union([ z.coerce.date(),z.lazy(() => NestedDateTimeNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedDateTimeNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedDateTimeNullableFilterSchema).optional()
}).strict();

export const NestedIntNullableFilterSchema: z.ZodType<Prisma.NestedIntNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedIntNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumExperimentStatusWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumExperimentStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ExperimentStatusSchema).optional(),
  in: z.lazy(() => ExperimentStatusSchema).array().optional(),
  notIn: z.lazy(() => ExperimentStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => NestedEnumExperimentStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumExperimentStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumExperimentStatusFilterSchema).optional()
}).strict();

export const NestedStringNullableFilterSchema: z.ZodType<Prisma.NestedStringNullableFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedEnumEventTypeFilterSchema: z.ZodType<Prisma.NestedEnumEventTypeFilter> = z.object({
  equals: z.lazy(() => EventTypeSchema).optional(),
  in: z.lazy(() => EventTypeSchema).array().optional(),
  notIn: z.lazy(() => EventTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => NestedEnumEventTypeFilterSchema) ]).optional(),
}).strict();

export const NestedStringNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedStringNullableWithAggregatesFilter> = z.object({
  equals: z.string().optional().nullable(),
  in: z.string().array().optional().nullable(),
  notIn: z.string().array().optional().nullable(),
  lt: z.string().optional(),
  lte: z.string().optional(),
  gt: z.string().optional(),
  gte: z.string().optional(),
  contains: z.string().optional(),
  startsWith: z.string().optional(),
  endsWith: z.string().optional(),
  not: z.union([ z.string(),z.lazy(() => NestedStringNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedStringNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedStringNullableFilterSchema).optional()
}).strict();

export const NestedEnumEventTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumEventTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => EventTypeSchema).optional(),
  in: z.lazy(() => EventTypeSchema).array().optional(),
  notIn: z.lazy(() => EventTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => NestedEnumEventTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumEventTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumEventTypeFilterSchema).optional()
}).strict();

export const NestedJsonFilterSchema: z.ZodType<Prisma.NestedJsonFilter> = z.object({
  equals: InputJsonValue.optional(),
  path: z.string().array().optional(),
  string_contains: z.string().optional(),
  string_starts_with: z.string().optional(),
  string_ends_with: z.string().optional(),
  array_contains: InputJsonValue.optional().nullable(),
  array_starts_with: InputJsonValue.optional().nullable(),
  array_ends_with: InputJsonValue.optional().nullable(),
  lt: InputJsonValue.optional(),
  lte: InputJsonValue.optional(),
  gt: InputJsonValue.optional(),
  gte: InputJsonValue.optional(),
  not: InputJsonValue.optional()
}).strict();

export const NestedFloatFilterSchema: z.ZodType<Prisma.NestedFloatFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatFilterSchema) ]).optional(),
}).strict();

export const NestedFloatNullableFilterSchema: z.ZodType<Prisma.NestedFloatNullableFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableFilterSchema) ]).optional().nullable(),
}).strict();

export const NestedFloatWithAggregatesFilterSchema: z.ZodType<Prisma.NestedFloatWithAggregatesFilter> = z.object({
  equals: z.number().optional(),
  in: z.number().array().optional(),
  notIn: z.number().array().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatFilterSchema).optional()
}).strict();

export const NestedFloatNullableWithAggregatesFilterSchema: z.ZodType<Prisma.NestedFloatNullableWithAggregatesFilter> = z.object({
  equals: z.number().optional().nullable(),
  in: z.number().array().optional().nullable(),
  notIn: z.number().array().optional().nullable(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  not: z.union([ z.number(),z.lazy(() => NestedFloatNullableWithAggregatesFilterSchema) ]).optional().nullable(),
  _count: z.lazy(() => NestedIntNullableFilterSchema).optional(),
  _avg: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _sum: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _min: z.lazy(() => NestedFloatNullableFilterSchema).optional(),
  _max: z.lazy(() => NestedFloatNullableFilterSchema).optional()
}).strict();

export const NestedEnumReportFormatFilterSchema: z.ZodType<Prisma.NestedEnumReportFormatFilter> = z.object({
  equals: z.lazy(() => ReportFormatSchema).optional(),
  in: z.lazy(() => ReportFormatSchema).array().optional(),
  notIn: z.lazy(() => ReportFormatSchema).array().optional(),
  not: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => NestedEnumReportFormatFilterSchema) ]).optional(),
}).strict();

export const NestedEnumReportFormatWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumReportFormatWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ReportFormatSchema).optional(),
  in: z.lazy(() => ReportFormatSchema).array().optional(),
  notIn: z.lazy(() => ReportFormatSchema).array().optional(),
  not: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => NestedEnumReportFormatWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumReportFormatFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumReportFormatFilterSchema).optional()
}).strict();

export const PlateCreateWithoutExperimentInputSchema: z.ZodType<Prisma.PlateCreateWithoutExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  label: z.string(),
  wells: z.lazy(() => WellCreateNestedManyWithoutPlateInputSchema).optional()
}).strict();

export const PlateUncheckedCreateWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUncheckedCreateWithoutExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  label: z.string(),
  wells: z.lazy(() => WellUncheckedCreateNestedManyWithoutPlateInputSchema).optional()
}).strict();

export const PlateCreateOrConnectWithoutExperimentInputSchema: z.ZodType<Prisma.PlateCreateOrConnectWithoutExperimentInput> = z.object({
  where: z.lazy(() => PlateWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => PlateCreateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema) ]),
}).strict();

export const PlateCreateManyExperimentInputEnvelopeSchema: z.ZodType<Prisma.PlateCreateManyExperimentInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => PlateCreateManyExperimentInputSchema),z.lazy(() => PlateCreateManyExperimentInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const TelemetryEventCreateWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventCreateWithoutExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  well: z.lazy(() => WellCreateNestedOneWithoutEventsInputSchema).optional()
}).strict();

export const TelemetryEventUncheckedCreateWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedCreateWithoutExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  wellId: z.string().optional().nullable(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();

export const TelemetryEventCreateOrConnectWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventCreateOrConnectWithoutExperimentInput> = z.object({
  where: z.lazy(() => TelemetryEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema) ]),
}).strict();

export const TelemetryEventCreateManyExperimentInputEnvelopeSchema: z.ZodType<Prisma.TelemetryEventCreateManyExperimentInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => TelemetryEventCreateManyExperimentInputSchema),z.lazy(() => TelemetryEventCreateManyExperimentInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ElnReportCreateWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportCreateWithoutExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  format: z.lazy(() => ReportFormatSchema),
  storageUrl: z.string(),
  generatedAt: z.coerce.date().optional()
}).strict();

export const ElnReportUncheckedCreateWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUncheckedCreateWithoutExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  format: z.lazy(() => ReportFormatSchema),
  storageUrl: z.string(),
  generatedAt: z.coerce.date().optional()
}).strict();

export const ElnReportCreateOrConnectWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportCreateOrConnectWithoutExperimentInput> = z.object({
  where: z.lazy(() => ElnReportWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ElnReportCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema) ]),
}).strict();

export const ElnReportCreateManyExperimentInputEnvelopeSchema: z.ZodType<Prisma.ElnReportCreateManyExperimentInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ElnReportCreateManyExperimentInputSchema),z.lazy(() => ElnReportCreateManyExperimentInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const PlateUpsertWithWhereUniqueWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUpsertWithWhereUniqueWithoutExperimentInput> = z.object({
  where: z.lazy(() => PlateWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => PlateUpdateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedUpdateWithoutExperimentInputSchema) ]),
  create: z.union([ z.lazy(() => PlateCreateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedCreateWithoutExperimentInputSchema) ]),
}).strict();

export const PlateUpdateWithWhereUniqueWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUpdateWithWhereUniqueWithoutExperimentInput> = z.object({
  where: z.lazy(() => PlateWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => PlateUpdateWithoutExperimentInputSchema),z.lazy(() => PlateUncheckedUpdateWithoutExperimentInputSchema) ]),
}).strict();

export const PlateUpdateManyWithWhereWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUpdateManyWithWhereWithoutExperimentInput> = z.object({
  where: z.lazy(() => PlateScalarWhereInputSchema),
  data: z.union([ z.lazy(() => PlateUpdateManyMutationInputSchema),z.lazy(() => PlateUncheckedUpdateManyWithoutExperimentInputSchema) ]),
}).strict();

export const PlateScalarWhereInputSchema: z.ZodType<Prisma.PlateScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => PlateScalarWhereInputSchema),z.lazy(() => PlateScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => PlateScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => PlateScalarWhereInputSchema),z.lazy(() => PlateScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  label: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const TelemetryEventUpsertWithWhereUniqueWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUpsertWithWhereUniqueWithoutExperimentInput> = z.object({
  where: z.lazy(() => TelemetryEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => TelemetryEventUpdateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedUpdateWithoutExperimentInputSchema) ]),
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutExperimentInputSchema) ]),
}).strict();

export const TelemetryEventUpdateWithWhereUniqueWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUpdateWithWhereUniqueWithoutExperimentInput> = z.object({
  where: z.lazy(() => TelemetryEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => TelemetryEventUpdateWithoutExperimentInputSchema),z.lazy(() => TelemetryEventUncheckedUpdateWithoutExperimentInputSchema) ]),
}).strict();

export const TelemetryEventUpdateManyWithWhereWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUpdateManyWithWhereWithoutExperimentInput> = z.object({
  where: z.lazy(() => TelemetryEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => TelemetryEventUpdateManyMutationInputSchema),z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutExperimentInputSchema) ]),
}).strict();

export const TelemetryEventScalarWhereInputSchema: z.ZodType<Prisma.TelemetryEventScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => TelemetryEventScalarWhereInputSchema),z.lazy(() => TelemetryEventScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => TelemetryEventScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => TelemetryEventScalarWhereInputSchema),z.lazy(() => TelemetryEventScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  wellId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  type: z.union([ z.lazy(() => EnumEventTypeFilterSchema),z.lazy(() => EventTypeSchema) ]).optional(),
  rawPayload: z.lazy(() => JsonFilterSchema).optional(),
  frameTimestamp: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const ElnReportUpsertWithWhereUniqueWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUpsertWithWhereUniqueWithoutExperimentInput> = z.object({
  where: z.lazy(() => ElnReportWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ElnReportUpdateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedUpdateWithoutExperimentInputSchema) ]),
  create: z.union([ z.lazy(() => ElnReportCreateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedCreateWithoutExperimentInputSchema) ]),
}).strict();

export const ElnReportUpdateWithWhereUniqueWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUpdateWithWhereUniqueWithoutExperimentInput> = z.object({
  where: z.lazy(() => ElnReportWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ElnReportUpdateWithoutExperimentInputSchema),z.lazy(() => ElnReportUncheckedUpdateWithoutExperimentInputSchema) ]),
}).strict();

export const ElnReportUpdateManyWithWhereWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUpdateManyWithWhereWithoutExperimentInput> = z.object({
  where: z.lazy(() => ElnReportScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ElnReportUpdateManyMutationInputSchema),z.lazy(() => ElnReportUncheckedUpdateManyWithoutExperimentInputSchema) ]),
}).strict();

export const ElnReportScalarWhereInputSchema: z.ZodType<Prisma.ElnReportScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ElnReportScalarWhereInputSchema),z.lazy(() => ElnReportScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ElnReportScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ElnReportScalarWhereInputSchema),z.lazy(() => ElnReportScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  experimentId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  format: z.union([ z.lazy(() => EnumReportFormatFilterSchema),z.lazy(() => ReportFormatSchema) ]).optional(),
  storageUrl: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  generatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export const ExperimentCreateWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentCreateWithoutPlatesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  events: z.lazy(() => TelemetryEventCreateNestedManyWithoutExperimentInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentUncheckedCreateWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentUncheckedCreateWithoutPlatesInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  events: z.lazy(() => TelemetryEventUncheckedCreateNestedManyWithoutExperimentInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUncheckedCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentCreateOrConnectWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentCreateOrConnectWithoutPlatesInput> = z.object({
  where: z.lazy(() => ExperimentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExperimentCreateWithoutPlatesInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutPlatesInputSchema) ]),
}).strict();

export const WellCreateWithoutPlateInputSchema: z.ZodType<Prisma.WellCreateWithoutPlateInput> = z.object({
  id: z.string().cuid().optional(),
  coordinate: z.string(),
  events: z.lazy(() => TelemetryEventCreateNestedManyWithoutWellInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellUncheckedCreateWithoutPlateInputSchema: z.ZodType<Prisma.WellUncheckedCreateWithoutPlateInput> = z.object({
  id: z.string().cuid().optional(),
  coordinate: z.string(),
  events: z.lazy(() => TelemetryEventUncheckedCreateNestedManyWithoutWellInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionUncheckedCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellCreateOrConnectWithoutPlateInputSchema: z.ZodType<Prisma.WellCreateOrConnectWithoutPlateInput> = z.object({
  where: z.lazy(() => WellWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WellCreateWithoutPlateInputSchema),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema) ]),
}).strict();

export const WellCreateManyPlateInputEnvelopeSchema: z.ZodType<Prisma.WellCreateManyPlateInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => WellCreateManyPlateInputSchema),z.lazy(() => WellCreateManyPlateInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ExperimentUpsertWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentUpsertWithoutPlatesInput> = z.object({
  update: z.union([ z.lazy(() => ExperimentUpdateWithoutPlatesInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutPlatesInputSchema) ]),
  create: z.union([ z.lazy(() => ExperimentCreateWithoutPlatesInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutPlatesInputSchema) ]),
  where: z.lazy(() => ExperimentWhereInputSchema).optional()
}).strict();

export const ExperimentUpdateToOneWithWhereWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentUpdateToOneWithWhereWithoutPlatesInput> = z.object({
  where: z.lazy(() => ExperimentWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ExperimentUpdateWithoutPlatesInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutPlatesInputSchema) ]),
}).strict();

export const ExperimentUpdateWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentUpdateWithoutPlatesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventUpdateManyWithoutExperimentNestedInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const ExperimentUncheckedUpdateWithoutPlatesInputSchema: z.ZodType<Prisma.ExperimentUncheckedUpdateWithoutPlatesInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const WellUpsertWithWhereUniqueWithoutPlateInputSchema: z.ZodType<Prisma.WellUpsertWithWhereUniqueWithoutPlateInput> = z.object({
  where: z.lazy(() => WellWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => WellUpdateWithoutPlateInputSchema),z.lazy(() => WellUncheckedUpdateWithoutPlateInputSchema) ]),
  create: z.union([ z.lazy(() => WellCreateWithoutPlateInputSchema),z.lazy(() => WellUncheckedCreateWithoutPlateInputSchema) ]),
}).strict();

export const WellUpdateWithWhereUniqueWithoutPlateInputSchema: z.ZodType<Prisma.WellUpdateWithWhereUniqueWithoutPlateInput> = z.object({
  where: z.lazy(() => WellWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => WellUpdateWithoutPlateInputSchema),z.lazy(() => WellUncheckedUpdateWithoutPlateInputSchema) ]),
}).strict();

export const WellUpdateManyWithWhereWithoutPlateInputSchema: z.ZodType<Prisma.WellUpdateManyWithWhereWithoutPlateInput> = z.object({
  where: z.lazy(() => WellScalarWhereInputSchema),
  data: z.union([ z.lazy(() => WellUpdateManyMutationInputSchema),z.lazy(() => WellUncheckedUpdateManyWithoutPlateInputSchema) ]),
}).strict();

export const WellScalarWhereInputSchema: z.ZodType<Prisma.WellScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => WellScalarWhereInputSchema),z.lazy(() => WellScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => WellScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => WellScalarWhereInputSchema),z.lazy(() => WellScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  plateId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  coordinate: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const PlateCreateWithoutWellsInputSchema: z.ZodType<Prisma.PlateCreateWithoutWellsInput> = z.object({
  id: z.string().cuid().optional(),
  label: z.string(),
  experiment: z.lazy(() => ExperimentCreateNestedOneWithoutPlatesInputSchema)
}).strict();

export const PlateUncheckedCreateWithoutWellsInputSchema: z.ZodType<Prisma.PlateUncheckedCreateWithoutWellsInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  label: z.string()
}).strict();

export const PlateCreateOrConnectWithoutWellsInputSchema: z.ZodType<Prisma.PlateCreateOrConnectWithoutWellsInput> = z.object({
  where: z.lazy(() => PlateWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => PlateCreateWithoutWellsInputSchema),z.lazy(() => PlateUncheckedCreateWithoutWellsInputSchema) ]),
}).strict();

export const TelemetryEventCreateWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventCreateWithoutWellInput> = z.object({
  id: z.string().cuid().optional(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  experiment: z.lazy(() => ExperimentCreateNestedOneWithoutEventsInputSchema)
}).strict();

export const TelemetryEventUncheckedCreateWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedCreateWithoutWellInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();

export const TelemetryEventCreateOrConnectWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventCreateOrConnectWithoutWellInput> = z.object({
  where: z.lazy(() => TelemetryEventWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema) ]),
}).strict();

export const TelemetryEventCreateManyWellInputEnvelopeSchema: z.ZodType<Prisma.TelemetryEventCreateManyWellInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => TelemetryEventCreateManyWellInputSchema),z.lazy(() => TelemetryEventCreateManyWellInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const ColonyDetectionCreateWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionCreateWithoutWellInput> = z.object({
  id: z.string().cuid().optional(),
  detectedAt: z.coerce.date().optional(),
  confidence: z.number(),
  growthVelocity: z.number().optional().nullable(),
  cvProvider: z.string()
}).strict();

export const ColonyDetectionUncheckedCreateWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedCreateWithoutWellInput> = z.object({
  id: z.string().cuid().optional(),
  detectedAt: z.coerce.date().optional(),
  confidence: z.number(),
  growthVelocity: z.number().optional().nullable(),
  cvProvider: z.string()
}).strict();

export const ColonyDetectionCreateOrConnectWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionCreateOrConnectWithoutWellInput> = z.object({
  where: z.lazy(() => ColonyDetectionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema) ]),
}).strict();

export const ColonyDetectionCreateManyWellInputEnvelopeSchema: z.ZodType<Prisma.ColonyDetectionCreateManyWellInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ColonyDetectionCreateManyWellInputSchema),z.lazy(() => ColonyDetectionCreateManyWellInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export const PlateUpsertWithoutWellsInputSchema: z.ZodType<Prisma.PlateUpsertWithoutWellsInput> = z.object({
  update: z.union([ z.lazy(() => PlateUpdateWithoutWellsInputSchema),z.lazy(() => PlateUncheckedUpdateWithoutWellsInputSchema) ]),
  create: z.union([ z.lazy(() => PlateCreateWithoutWellsInputSchema),z.lazy(() => PlateUncheckedCreateWithoutWellsInputSchema) ]),
  where: z.lazy(() => PlateWhereInputSchema).optional()
}).strict();

export const PlateUpdateToOneWithWhereWithoutWellsInputSchema: z.ZodType<Prisma.PlateUpdateToOneWithWhereWithoutWellsInput> = z.object({
  where: z.lazy(() => PlateWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => PlateUpdateWithoutWellsInputSchema),z.lazy(() => PlateUncheckedUpdateWithoutWellsInputSchema) ]),
}).strict();

export const PlateUpdateWithoutWellsInputSchema: z.ZodType<Prisma.PlateUpdateWithoutWellsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experiment: z.lazy(() => ExperimentUpdateOneRequiredWithoutPlatesNestedInputSchema).optional()
}).strict();

export const PlateUncheckedUpdateWithoutWellsInputSchema: z.ZodType<Prisma.PlateUncheckedUpdateWithoutWellsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventUpsertWithWhereUniqueWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUpsertWithWhereUniqueWithoutWellInput> = z.object({
  where: z.lazy(() => TelemetryEventWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => TelemetryEventUpdateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedUpdateWithoutWellInputSchema) ]),
  create: z.union([ z.lazy(() => TelemetryEventCreateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedCreateWithoutWellInputSchema) ]),
}).strict();

export const TelemetryEventUpdateWithWhereUniqueWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUpdateWithWhereUniqueWithoutWellInput> = z.object({
  where: z.lazy(() => TelemetryEventWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => TelemetryEventUpdateWithoutWellInputSchema),z.lazy(() => TelemetryEventUncheckedUpdateWithoutWellInputSchema) ]),
}).strict();

export const TelemetryEventUpdateManyWithWhereWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUpdateManyWithWhereWithoutWellInput> = z.object({
  where: z.lazy(() => TelemetryEventScalarWhereInputSchema),
  data: z.union([ z.lazy(() => TelemetryEventUpdateManyMutationInputSchema),z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutWellInputSchema) ]),
}).strict();

export const ColonyDetectionUpsertWithWhereUniqueWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUpsertWithWhereUniqueWithoutWellInput> = z.object({
  where: z.lazy(() => ColonyDetectionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ColonyDetectionUpdateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedUpdateWithoutWellInputSchema) ]),
  create: z.union([ z.lazy(() => ColonyDetectionCreateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedCreateWithoutWellInputSchema) ]),
}).strict();

export const ColonyDetectionUpdateWithWhereUniqueWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUpdateWithWhereUniqueWithoutWellInput> = z.object({
  where: z.lazy(() => ColonyDetectionWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ColonyDetectionUpdateWithoutWellInputSchema),z.lazy(() => ColonyDetectionUncheckedUpdateWithoutWellInputSchema) ]),
}).strict();

export const ColonyDetectionUpdateManyWithWhereWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUpdateManyWithWhereWithoutWellInput> = z.object({
  where: z.lazy(() => ColonyDetectionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ColonyDetectionUpdateManyMutationInputSchema),z.lazy(() => ColonyDetectionUncheckedUpdateManyWithoutWellInputSchema) ]),
}).strict();

export const ColonyDetectionScalarWhereInputSchema: z.ZodType<Prisma.ColonyDetectionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ColonyDetectionScalarWhereInputSchema),z.lazy(() => ColonyDetectionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ColonyDetectionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ColonyDetectionScalarWhereInputSchema),z.lazy(() => ColonyDetectionScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  wellId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  detectedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  confidence: z.union([ z.lazy(() => FloatFilterSchema),z.number() ]).optional(),
  growthVelocity: z.union([ z.lazy(() => FloatNullableFilterSchema),z.number() ]).optional().nullable(),
  cvProvider: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
}).strict();

export const ExperimentCreateWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentCreateWithoutEventsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  plates: z.lazy(() => PlateCreateNestedManyWithoutExperimentInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentUncheckedCreateWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentUncheckedCreateWithoutEventsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  plates: z.lazy(() => PlateUncheckedCreateNestedManyWithoutExperimentInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUncheckedCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentCreateOrConnectWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentCreateOrConnectWithoutEventsInput> = z.object({
  where: z.lazy(() => ExperimentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExperimentCreateWithoutEventsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutEventsInputSchema) ]),
}).strict();

export const WellCreateWithoutEventsInputSchema: z.ZodType<Prisma.WellCreateWithoutEventsInput> = z.object({
  id: z.string().cuid().optional(),
  coordinate: z.string(),
  plate: z.lazy(() => PlateCreateNestedOneWithoutWellsInputSchema),
  detections: z.lazy(() => ColonyDetectionCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellUncheckedCreateWithoutEventsInputSchema: z.ZodType<Prisma.WellUncheckedCreateWithoutEventsInput> = z.object({
  id: z.string().cuid().optional(),
  plateId: z.string(),
  coordinate: z.string(),
  detections: z.lazy(() => ColonyDetectionUncheckedCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellCreateOrConnectWithoutEventsInputSchema: z.ZodType<Prisma.WellCreateOrConnectWithoutEventsInput> = z.object({
  where: z.lazy(() => WellWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WellCreateWithoutEventsInputSchema),z.lazy(() => WellUncheckedCreateWithoutEventsInputSchema) ]),
}).strict();

export const ExperimentUpsertWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentUpsertWithoutEventsInput> = z.object({
  update: z.union([ z.lazy(() => ExperimentUpdateWithoutEventsInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutEventsInputSchema) ]),
  create: z.union([ z.lazy(() => ExperimentCreateWithoutEventsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutEventsInputSchema) ]),
  where: z.lazy(() => ExperimentWhereInputSchema).optional()
}).strict();

export const ExperimentUpdateToOneWithWhereWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentUpdateToOneWithWhereWithoutEventsInput> = z.object({
  where: z.lazy(() => ExperimentWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ExperimentUpdateWithoutEventsInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutEventsInputSchema) ]),
}).strict();

export const ExperimentUpdateWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentUpdateWithoutEventsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  plates: z.lazy(() => PlateUpdateManyWithoutExperimentNestedInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const ExperimentUncheckedUpdateWithoutEventsInputSchema: z.ZodType<Prisma.ExperimentUncheckedUpdateWithoutEventsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  plates: z.lazy(() => PlateUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional(),
  elnReports: z.lazy(() => ElnReportUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const WellUpsertWithoutEventsInputSchema: z.ZodType<Prisma.WellUpsertWithoutEventsInput> = z.object({
  update: z.union([ z.lazy(() => WellUpdateWithoutEventsInputSchema),z.lazy(() => WellUncheckedUpdateWithoutEventsInputSchema) ]),
  create: z.union([ z.lazy(() => WellCreateWithoutEventsInputSchema),z.lazy(() => WellUncheckedCreateWithoutEventsInputSchema) ]),
  where: z.lazy(() => WellWhereInputSchema).optional()
}).strict();

export const WellUpdateToOneWithWhereWithoutEventsInputSchema: z.ZodType<Prisma.WellUpdateToOneWithWhereWithoutEventsInput> = z.object({
  where: z.lazy(() => WellWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => WellUpdateWithoutEventsInputSchema),z.lazy(() => WellUncheckedUpdateWithoutEventsInputSchema) ]),
}).strict();

export const WellUpdateWithoutEventsInputSchema: z.ZodType<Prisma.WellUpdateWithoutEventsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  plate: z.lazy(() => PlateUpdateOneRequiredWithoutWellsNestedInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const WellUncheckedUpdateWithoutEventsInputSchema: z.ZodType<Prisma.WellUncheckedUpdateWithoutEventsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  plateId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detections: z.lazy(() => ColonyDetectionUncheckedUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const WellCreateWithoutDetectionsInputSchema: z.ZodType<Prisma.WellCreateWithoutDetectionsInput> = z.object({
  id: z.string().cuid().optional(),
  coordinate: z.string(),
  plate: z.lazy(() => PlateCreateNestedOneWithoutWellsInputSchema),
  events: z.lazy(() => TelemetryEventCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellUncheckedCreateWithoutDetectionsInputSchema: z.ZodType<Prisma.WellUncheckedCreateWithoutDetectionsInput> = z.object({
  id: z.string().cuid().optional(),
  plateId: z.string(),
  coordinate: z.string(),
  events: z.lazy(() => TelemetryEventUncheckedCreateNestedManyWithoutWellInputSchema).optional()
}).strict();

export const WellCreateOrConnectWithoutDetectionsInputSchema: z.ZodType<Prisma.WellCreateOrConnectWithoutDetectionsInput> = z.object({
  where: z.lazy(() => WellWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => WellCreateWithoutDetectionsInputSchema),z.lazy(() => WellUncheckedCreateWithoutDetectionsInputSchema) ]),
}).strict();

export const WellUpsertWithoutDetectionsInputSchema: z.ZodType<Prisma.WellUpsertWithoutDetectionsInput> = z.object({
  update: z.union([ z.lazy(() => WellUpdateWithoutDetectionsInputSchema),z.lazy(() => WellUncheckedUpdateWithoutDetectionsInputSchema) ]),
  create: z.union([ z.lazy(() => WellCreateWithoutDetectionsInputSchema),z.lazy(() => WellUncheckedCreateWithoutDetectionsInputSchema) ]),
  where: z.lazy(() => WellWhereInputSchema).optional()
}).strict();

export const WellUpdateToOneWithWhereWithoutDetectionsInputSchema: z.ZodType<Prisma.WellUpdateToOneWithWhereWithoutDetectionsInput> = z.object({
  where: z.lazy(() => WellWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => WellUpdateWithoutDetectionsInputSchema),z.lazy(() => WellUncheckedUpdateWithoutDetectionsInputSchema) ]),
}).strict();

export const WellUpdateWithoutDetectionsInputSchema: z.ZodType<Prisma.WellUpdateWithoutDetectionsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  plate: z.lazy(() => PlateUpdateOneRequiredWithoutWellsNestedInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const WellUncheckedUpdateWithoutDetectionsInputSchema: z.ZodType<Prisma.WellUncheckedUpdateWithoutDetectionsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  plateId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const ExperimentCreateWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentCreateWithoutElnReportsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  plates: z.lazy(() => PlateCreateNestedManyWithoutExperimentInputSchema).optional(),
  events: z.lazy(() => TelemetryEventCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentUncheckedCreateWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentUncheckedCreateWithoutElnReportsInput> = z.object({
  id: z.string().cuid().optional(),
  name: z.string(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional().nullable(),
  status: z.lazy(() => ExperimentStatusSchema).optional(),
  plates: z.lazy(() => PlateUncheckedCreateNestedManyWithoutExperimentInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUncheckedCreateNestedManyWithoutExperimentInputSchema).optional()
}).strict();

export const ExperimentCreateOrConnectWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentCreateOrConnectWithoutElnReportsInput> = z.object({
  where: z.lazy(() => ExperimentWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ExperimentCreateWithoutElnReportsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutElnReportsInputSchema) ]),
}).strict();

export const ExperimentUpsertWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentUpsertWithoutElnReportsInput> = z.object({
  update: z.union([ z.lazy(() => ExperimentUpdateWithoutElnReportsInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutElnReportsInputSchema) ]),
  create: z.union([ z.lazy(() => ExperimentCreateWithoutElnReportsInputSchema),z.lazy(() => ExperimentUncheckedCreateWithoutElnReportsInputSchema) ]),
  where: z.lazy(() => ExperimentWhereInputSchema).optional()
}).strict();

export const ExperimentUpdateToOneWithWhereWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentUpdateToOneWithWhereWithoutElnReportsInput> = z.object({
  where: z.lazy(() => ExperimentWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ExperimentUpdateWithoutElnReportsInputSchema),z.lazy(() => ExperimentUncheckedUpdateWithoutElnReportsInputSchema) ]),
}).strict();

export const ExperimentUpdateWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentUpdateWithoutElnReportsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  plates: z.lazy(() => PlateUpdateManyWithoutExperimentNestedInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const ExperimentUncheckedUpdateWithoutElnReportsInputSchema: z.ZodType<Prisma.ExperimentUncheckedUpdateWithoutElnReportsInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  startedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  endedAt: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  status: z.union([ z.lazy(() => ExperimentStatusSchema),z.lazy(() => EnumExperimentStatusFieldUpdateOperationsInputSchema) ]).optional(),
  plates: z.lazy(() => PlateUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional(),
  events: z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutExperimentNestedInputSchema).optional()
}).strict();

export const PlateCreateManyExperimentInputSchema: z.ZodType<Prisma.PlateCreateManyExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  label: z.string()
}).strict();

export const TelemetryEventCreateManyExperimentInputSchema: z.ZodType<Prisma.TelemetryEventCreateManyExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  wellId: z.string().optional().nullable(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();

export const ElnReportCreateManyExperimentInputSchema: z.ZodType<Prisma.ElnReportCreateManyExperimentInput> = z.object({
  id: z.string().cuid().optional(),
  format: z.lazy(() => ReportFormatSchema),
  storageUrl: z.string(),
  generatedAt: z.coerce.date().optional()
}).strict();

export const PlateUpdateWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUpdateWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wells: z.lazy(() => WellUpdateManyWithoutPlateNestedInputSchema).optional()
}).strict();

export const PlateUncheckedUpdateWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUncheckedUpdateWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wells: z.lazy(() => WellUncheckedUpdateManyWithoutPlateNestedInputSchema).optional()
}).strict();

export const PlateUncheckedUpdateManyWithoutExperimentInputSchema: z.ZodType<Prisma.PlateUncheckedUpdateManyWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  label: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventUpdateWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUpdateWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  well: z.lazy(() => WellUpdateOneWithoutEventsNestedInputSchema).optional()
}).strict();

export const TelemetryEventUncheckedUpdateWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wellId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventUncheckedUpdateManyWithoutExperimentInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateManyWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  wellId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ElnReportUpdateWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUpdateWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  format: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => EnumReportFormatFieldUpdateOperationsInputSchema) ]).optional(),
  storageUrl: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  generatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ElnReportUncheckedUpdateWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUncheckedUpdateWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  format: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => EnumReportFormatFieldUpdateOperationsInputSchema) ]).optional(),
  storageUrl: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  generatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ElnReportUncheckedUpdateManyWithoutExperimentInputSchema: z.ZodType<Prisma.ElnReportUncheckedUpdateManyWithoutExperimentInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  format: z.union([ z.lazy(() => ReportFormatSchema),z.lazy(() => EnumReportFormatFieldUpdateOperationsInputSchema) ]).optional(),
  storageUrl: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  generatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const WellCreateManyPlateInputSchema: z.ZodType<Prisma.WellCreateManyPlateInput> = z.object({
  id: z.string().cuid().optional(),
  coordinate: z.string()
}).strict();

export const WellUpdateWithoutPlateInputSchema: z.ZodType<Prisma.WellUpdateWithoutPlateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventUpdateManyWithoutWellNestedInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const WellUncheckedUpdateWithoutPlateInputSchema: z.ZodType<Prisma.WellUncheckedUpdateWithoutPlateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  events: z.lazy(() => TelemetryEventUncheckedUpdateManyWithoutWellNestedInputSchema).optional(),
  detections: z.lazy(() => ColonyDetectionUncheckedUpdateManyWithoutWellNestedInputSchema).optional()
}).strict();

export const WellUncheckedUpdateManyWithoutPlateInputSchema: z.ZodType<Prisma.WellUncheckedUpdateManyWithoutPlateInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  coordinate: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventCreateManyWellInputSchema: z.ZodType<Prisma.TelemetryEventCreateManyWellInput> = z.object({
  id: z.string().cuid().optional(),
  experimentId: z.string(),
  type: z.lazy(() => EventTypeSchema),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]),
  frameTimestamp: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();

export const ColonyDetectionCreateManyWellInputSchema: z.ZodType<Prisma.ColonyDetectionCreateManyWellInput> = z.object({
  id: z.string().cuid().optional(),
  detectedAt: z.coerce.date().optional(),
  confidence: z.number(),
  growthVelocity: z.number().optional().nullable(),
  cvProvider: z.string()
}).strict();

export const TelemetryEventUpdateWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUpdateWithoutWellInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  experiment: z.lazy(() => ExperimentUpdateOneRequiredWithoutEventsNestedInputSchema).optional()
}).strict();

export const TelemetryEventUncheckedUpdateWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateWithoutWellInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const TelemetryEventUncheckedUpdateManyWithoutWellInputSchema: z.ZodType<Prisma.TelemetryEventUncheckedUpdateManyWithoutWellInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  experimentId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  type: z.union([ z.lazy(() => EventTypeSchema),z.lazy(() => EnumEventTypeFieldUpdateOperationsInputSchema) ]).optional(),
  rawPayload: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValue ]).optional(),
  frameTimestamp: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ColonyDetectionUpdateWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUpdateWithoutWellInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detectedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  confidence: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  growthVelocity: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cvProvider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ColonyDetectionUncheckedUpdateWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedUpdateWithoutWellInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detectedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  confidence: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  growthVelocity: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cvProvider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export const ColonyDetectionUncheckedUpdateManyWithoutWellInputSchema: z.ZodType<Prisma.ColonyDetectionUncheckedUpdateManyWithoutWellInput> = z.object({
  id: z.union([ z.string().cuid(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  detectedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  confidence: z.union([ z.number(),z.lazy(() => FloatFieldUpdateOperationsInputSchema) ]).optional(),
  growthVelocity: z.union([ z.number(),z.lazy(() => NullableFloatFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  cvProvider: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

/////////////////////////////////////////
// ARGS
/////////////////////////////////////////

export const ExperimentFindFirstArgsSchema: z.ZodType<Prisma.ExperimentFindFirstArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  where: ExperimentWhereInputSchema.optional(),
  orderBy: z.union([ ExperimentOrderByWithRelationInputSchema.array(),ExperimentOrderByWithRelationInputSchema ]).optional(),
  cursor: ExperimentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExperimentScalarFieldEnumSchema,ExperimentScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ExperimentFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ExperimentFindFirstOrThrowArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  where: ExperimentWhereInputSchema.optional(),
  orderBy: z.union([ ExperimentOrderByWithRelationInputSchema.array(),ExperimentOrderByWithRelationInputSchema ]).optional(),
  cursor: ExperimentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExperimentScalarFieldEnumSchema,ExperimentScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ExperimentFindManyArgsSchema: z.ZodType<Prisma.ExperimentFindManyArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  where: ExperimentWhereInputSchema.optional(),
  orderBy: z.union([ ExperimentOrderByWithRelationInputSchema.array(),ExperimentOrderByWithRelationInputSchema ]).optional(),
  cursor: ExperimentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ExperimentScalarFieldEnumSchema,ExperimentScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ExperimentAggregateArgsSchema: z.ZodType<Prisma.ExperimentAggregateArgs> = z.object({
  where: ExperimentWhereInputSchema.optional(),
  orderBy: z.union([ ExperimentOrderByWithRelationInputSchema.array(),ExperimentOrderByWithRelationInputSchema ]).optional(),
  cursor: ExperimentWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const ExperimentGroupByArgsSchema: z.ZodType<Prisma.ExperimentGroupByArgs> = z.object({
  where: ExperimentWhereInputSchema.optional(),
  orderBy: z.union([ ExperimentOrderByWithAggregationInputSchema.array(),ExperimentOrderByWithAggregationInputSchema ]).optional(),
  by: ExperimentScalarFieldEnumSchema.array(),
  having: ExperimentScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const ExperimentFindUniqueArgsSchema: z.ZodType<Prisma.ExperimentFindUniqueArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  where: ExperimentWhereUniqueInputSchema,
}).strict()

export const ExperimentFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ExperimentFindUniqueOrThrowArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  where: ExperimentWhereUniqueInputSchema,
}).strict()

export const PlateFindFirstArgsSchema: z.ZodType<Prisma.PlateFindFirstArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  where: PlateWhereInputSchema.optional(),
  orderBy: z.union([ PlateOrderByWithRelationInputSchema.array(),PlateOrderByWithRelationInputSchema ]).optional(),
  cursor: PlateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PlateScalarFieldEnumSchema,PlateScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const PlateFindFirstOrThrowArgsSchema: z.ZodType<Prisma.PlateFindFirstOrThrowArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  where: PlateWhereInputSchema.optional(),
  orderBy: z.union([ PlateOrderByWithRelationInputSchema.array(),PlateOrderByWithRelationInputSchema ]).optional(),
  cursor: PlateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PlateScalarFieldEnumSchema,PlateScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const PlateFindManyArgsSchema: z.ZodType<Prisma.PlateFindManyArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  where: PlateWhereInputSchema.optional(),
  orderBy: z.union([ PlateOrderByWithRelationInputSchema.array(),PlateOrderByWithRelationInputSchema ]).optional(),
  cursor: PlateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ PlateScalarFieldEnumSchema,PlateScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const PlateAggregateArgsSchema: z.ZodType<Prisma.PlateAggregateArgs> = z.object({
  where: PlateWhereInputSchema.optional(),
  orderBy: z.union([ PlateOrderByWithRelationInputSchema.array(),PlateOrderByWithRelationInputSchema ]).optional(),
  cursor: PlateWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const PlateGroupByArgsSchema: z.ZodType<Prisma.PlateGroupByArgs> = z.object({
  where: PlateWhereInputSchema.optional(),
  orderBy: z.union([ PlateOrderByWithAggregationInputSchema.array(),PlateOrderByWithAggregationInputSchema ]).optional(),
  by: PlateScalarFieldEnumSchema.array(),
  having: PlateScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const PlateFindUniqueArgsSchema: z.ZodType<Prisma.PlateFindUniqueArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  where: PlateWhereUniqueInputSchema,
}).strict()

export const PlateFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.PlateFindUniqueOrThrowArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  where: PlateWhereUniqueInputSchema,
}).strict()

export const WellFindFirstArgsSchema: z.ZodType<Prisma.WellFindFirstArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  where: WellWhereInputSchema.optional(),
  orderBy: z.union([ WellOrderByWithRelationInputSchema.array(),WellOrderByWithRelationInputSchema ]).optional(),
  cursor: WellWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WellScalarFieldEnumSchema,WellScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const WellFindFirstOrThrowArgsSchema: z.ZodType<Prisma.WellFindFirstOrThrowArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  where: WellWhereInputSchema.optional(),
  orderBy: z.union([ WellOrderByWithRelationInputSchema.array(),WellOrderByWithRelationInputSchema ]).optional(),
  cursor: WellWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WellScalarFieldEnumSchema,WellScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const WellFindManyArgsSchema: z.ZodType<Prisma.WellFindManyArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  where: WellWhereInputSchema.optional(),
  orderBy: z.union([ WellOrderByWithRelationInputSchema.array(),WellOrderByWithRelationInputSchema ]).optional(),
  cursor: WellWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ WellScalarFieldEnumSchema,WellScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const WellAggregateArgsSchema: z.ZodType<Prisma.WellAggregateArgs> = z.object({
  where: WellWhereInputSchema.optional(),
  orderBy: z.union([ WellOrderByWithRelationInputSchema.array(),WellOrderByWithRelationInputSchema ]).optional(),
  cursor: WellWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const WellGroupByArgsSchema: z.ZodType<Prisma.WellGroupByArgs> = z.object({
  where: WellWhereInputSchema.optional(),
  orderBy: z.union([ WellOrderByWithAggregationInputSchema.array(),WellOrderByWithAggregationInputSchema ]).optional(),
  by: WellScalarFieldEnumSchema.array(),
  having: WellScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const WellFindUniqueArgsSchema: z.ZodType<Prisma.WellFindUniqueArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  where: WellWhereUniqueInputSchema,
}).strict()

export const WellFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.WellFindUniqueOrThrowArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  where: WellWhereUniqueInputSchema,
}).strict()

export const TelemetryEventFindFirstArgsSchema: z.ZodType<Prisma.TelemetryEventFindFirstArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  where: TelemetryEventWhereInputSchema.optional(),
  orderBy: z.union([ TelemetryEventOrderByWithRelationInputSchema.array(),TelemetryEventOrderByWithRelationInputSchema ]).optional(),
  cursor: TelemetryEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TelemetryEventScalarFieldEnumSchema,TelemetryEventScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const TelemetryEventFindFirstOrThrowArgsSchema: z.ZodType<Prisma.TelemetryEventFindFirstOrThrowArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  where: TelemetryEventWhereInputSchema.optional(),
  orderBy: z.union([ TelemetryEventOrderByWithRelationInputSchema.array(),TelemetryEventOrderByWithRelationInputSchema ]).optional(),
  cursor: TelemetryEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TelemetryEventScalarFieldEnumSchema,TelemetryEventScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const TelemetryEventFindManyArgsSchema: z.ZodType<Prisma.TelemetryEventFindManyArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  where: TelemetryEventWhereInputSchema.optional(),
  orderBy: z.union([ TelemetryEventOrderByWithRelationInputSchema.array(),TelemetryEventOrderByWithRelationInputSchema ]).optional(),
  cursor: TelemetryEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ TelemetryEventScalarFieldEnumSchema,TelemetryEventScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const TelemetryEventAggregateArgsSchema: z.ZodType<Prisma.TelemetryEventAggregateArgs> = z.object({
  where: TelemetryEventWhereInputSchema.optional(),
  orderBy: z.union([ TelemetryEventOrderByWithRelationInputSchema.array(),TelemetryEventOrderByWithRelationInputSchema ]).optional(),
  cursor: TelemetryEventWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const TelemetryEventGroupByArgsSchema: z.ZodType<Prisma.TelemetryEventGroupByArgs> = z.object({
  where: TelemetryEventWhereInputSchema.optional(),
  orderBy: z.union([ TelemetryEventOrderByWithAggregationInputSchema.array(),TelemetryEventOrderByWithAggregationInputSchema ]).optional(),
  by: TelemetryEventScalarFieldEnumSchema.array(),
  having: TelemetryEventScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const TelemetryEventFindUniqueArgsSchema: z.ZodType<Prisma.TelemetryEventFindUniqueArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  where: TelemetryEventWhereUniqueInputSchema,
}).strict()

export const TelemetryEventFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.TelemetryEventFindUniqueOrThrowArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  where: TelemetryEventWhereUniqueInputSchema,
}).strict()

export const ColonyDetectionFindFirstArgsSchema: z.ZodType<Prisma.ColonyDetectionFindFirstArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  where: ColonyDetectionWhereInputSchema.optional(),
  orderBy: z.union([ ColonyDetectionOrderByWithRelationInputSchema.array(),ColonyDetectionOrderByWithRelationInputSchema ]).optional(),
  cursor: ColonyDetectionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ColonyDetectionScalarFieldEnumSchema,ColonyDetectionScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ColonyDetectionFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ColonyDetectionFindFirstOrThrowArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  where: ColonyDetectionWhereInputSchema.optional(),
  orderBy: z.union([ ColonyDetectionOrderByWithRelationInputSchema.array(),ColonyDetectionOrderByWithRelationInputSchema ]).optional(),
  cursor: ColonyDetectionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ColonyDetectionScalarFieldEnumSchema,ColonyDetectionScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ColonyDetectionFindManyArgsSchema: z.ZodType<Prisma.ColonyDetectionFindManyArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  where: ColonyDetectionWhereInputSchema.optional(),
  orderBy: z.union([ ColonyDetectionOrderByWithRelationInputSchema.array(),ColonyDetectionOrderByWithRelationInputSchema ]).optional(),
  cursor: ColonyDetectionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ColonyDetectionScalarFieldEnumSchema,ColonyDetectionScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ColonyDetectionAggregateArgsSchema: z.ZodType<Prisma.ColonyDetectionAggregateArgs> = z.object({
  where: ColonyDetectionWhereInputSchema.optional(),
  orderBy: z.union([ ColonyDetectionOrderByWithRelationInputSchema.array(),ColonyDetectionOrderByWithRelationInputSchema ]).optional(),
  cursor: ColonyDetectionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const ColonyDetectionGroupByArgsSchema: z.ZodType<Prisma.ColonyDetectionGroupByArgs> = z.object({
  where: ColonyDetectionWhereInputSchema.optional(),
  orderBy: z.union([ ColonyDetectionOrderByWithAggregationInputSchema.array(),ColonyDetectionOrderByWithAggregationInputSchema ]).optional(),
  by: ColonyDetectionScalarFieldEnumSchema.array(),
  having: ColonyDetectionScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const ColonyDetectionFindUniqueArgsSchema: z.ZodType<Prisma.ColonyDetectionFindUniqueArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  where: ColonyDetectionWhereUniqueInputSchema,
}).strict()

export const ColonyDetectionFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ColonyDetectionFindUniqueOrThrowArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  where: ColonyDetectionWhereUniqueInputSchema,
}).strict()

export const ElnReportFindFirstArgsSchema: z.ZodType<Prisma.ElnReportFindFirstArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  where: ElnReportWhereInputSchema.optional(),
  orderBy: z.union([ ElnReportOrderByWithRelationInputSchema.array(),ElnReportOrderByWithRelationInputSchema ]).optional(),
  cursor: ElnReportWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ElnReportScalarFieldEnumSchema,ElnReportScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ElnReportFindFirstOrThrowArgsSchema: z.ZodType<Prisma.ElnReportFindFirstOrThrowArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  where: ElnReportWhereInputSchema.optional(),
  orderBy: z.union([ ElnReportOrderByWithRelationInputSchema.array(),ElnReportOrderByWithRelationInputSchema ]).optional(),
  cursor: ElnReportWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ElnReportScalarFieldEnumSchema,ElnReportScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ElnReportFindManyArgsSchema: z.ZodType<Prisma.ElnReportFindManyArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  where: ElnReportWhereInputSchema.optional(),
  orderBy: z.union([ ElnReportOrderByWithRelationInputSchema.array(),ElnReportOrderByWithRelationInputSchema ]).optional(),
  cursor: ElnReportWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ElnReportScalarFieldEnumSchema,ElnReportScalarFieldEnumSchema.array() ]).optional(),
}).strict()

export const ElnReportAggregateArgsSchema: z.ZodType<Prisma.ElnReportAggregateArgs> = z.object({
  where: ElnReportWhereInputSchema.optional(),
  orderBy: z.union([ ElnReportOrderByWithRelationInputSchema.array(),ElnReportOrderByWithRelationInputSchema ]).optional(),
  cursor: ElnReportWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const ElnReportGroupByArgsSchema: z.ZodType<Prisma.ElnReportGroupByArgs> = z.object({
  where: ElnReportWhereInputSchema.optional(),
  orderBy: z.union([ ElnReportOrderByWithAggregationInputSchema.array(),ElnReportOrderByWithAggregationInputSchema ]).optional(),
  by: ElnReportScalarFieldEnumSchema.array(),
  having: ElnReportScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict()

export const ElnReportFindUniqueArgsSchema: z.ZodType<Prisma.ElnReportFindUniqueArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  where: ElnReportWhereUniqueInputSchema,
}).strict()

export const ElnReportFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.ElnReportFindUniqueOrThrowArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  where: ElnReportWhereUniqueInputSchema,
}).strict()

export const ExperimentCreateArgsSchema: z.ZodType<Prisma.ExperimentCreateArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  data: z.union([ ExperimentCreateInputSchema,ExperimentUncheckedCreateInputSchema ]),
}).strict()

export const ExperimentUpsertArgsSchema: z.ZodType<Prisma.ExperimentUpsertArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  where: ExperimentWhereUniqueInputSchema,
  create: z.union([ ExperimentCreateInputSchema,ExperimentUncheckedCreateInputSchema ]),
  update: z.union([ ExperimentUpdateInputSchema,ExperimentUncheckedUpdateInputSchema ]),
}).strict()

export const ExperimentCreateManyArgsSchema: z.ZodType<Prisma.ExperimentCreateManyArgs> = z.object({
  data: z.union([ ExperimentCreateManyInputSchema,ExperimentCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const ExperimentAndReturnCreateManyArgsSchema: z.ZodType<Prisma.ExperimentAndReturnCreateManyArgs> = z.object({
  data: z.union([ ExperimentCreateManyInputSchema,ExperimentCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const ExperimentDeleteArgsSchema: z.ZodType<Prisma.ExperimentDeleteArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  where: ExperimentWhereUniqueInputSchema,
}).strict()

export const ExperimentUpdateArgsSchema: z.ZodType<Prisma.ExperimentUpdateArgs> = z.object({
  select: ExperimentSelectSchema.optional(),
  include: ExperimentIncludeSchema.optional(),
  data: z.union([ ExperimentUpdateInputSchema,ExperimentUncheckedUpdateInputSchema ]),
  where: ExperimentWhereUniqueInputSchema,
}).strict()

export const ExperimentUpdateManyArgsSchema: z.ZodType<Prisma.ExperimentUpdateManyArgs> = z.object({
  data: z.union([ ExperimentUpdateManyMutationInputSchema,ExperimentUncheckedUpdateManyInputSchema ]),
  where: ExperimentWhereInputSchema.optional(),
}).strict()

export const ExperimentDeleteManyArgsSchema: z.ZodType<Prisma.ExperimentDeleteManyArgs> = z.object({
  where: ExperimentWhereInputSchema.optional(),
}).strict()

export const PlateCreateArgsSchema: z.ZodType<Prisma.PlateCreateArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  data: z.union([ PlateCreateInputSchema,PlateUncheckedCreateInputSchema ]),
}).strict()

export const PlateUpsertArgsSchema: z.ZodType<Prisma.PlateUpsertArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  where: PlateWhereUniqueInputSchema,
  create: z.union([ PlateCreateInputSchema,PlateUncheckedCreateInputSchema ]),
  update: z.union([ PlateUpdateInputSchema,PlateUncheckedUpdateInputSchema ]),
}).strict()

export const PlateCreateManyArgsSchema: z.ZodType<Prisma.PlateCreateManyArgs> = z.object({
  data: z.union([ PlateCreateManyInputSchema,PlateCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const PlateAndReturnCreateManyArgsSchema: z.ZodType<Prisma.PlateAndReturnCreateManyArgs> = z.object({
  data: z.union([ PlateCreateManyInputSchema,PlateCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const PlateDeleteArgsSchema: z.ZodType<Prisma.PlateDeleteArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  where: PlateWhereUniqueInputSchema,
}).strict()

export const PlateUpdateArgsSchema: z.ZodType<Prisma.PlateUpdateArgs> = z.object({
  select: PlateSelectSchema.optional(),
  include: PlateIncludeSchema.optional(),
  data: z.union([ PlateUpdateInputSchema,PlateUncheckedUpdateInputSchema ]),
  where: PlateWhereUniqueInputSchema,
}).strict()

export const PlateUpdateManyArgsSchema: z.ZodType<Prisma.PlateUpdateManyArgs> = z.object({
  data: z.union([ PlateUpdateManyMutationInputSchema,PlateUncheckedUpdateManyInputSchema ]),
  where: PlateWhereInputSchema.optional(),
}).strict()

export const PlateDeleteManyArgsSchema: z.ZodType<Prisma.PlateDeleteManyArgs> = z.object({
  where: PlateWhereInputSchema.optional(),
}).strict()

export const WellCreateArgsSchema: z.ZodType<Prisma.WellCreateArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  data: z.union([ WellCreateInputSchema,WellUncheckedCreateInputSchema ]),
}).strict()

export const WellUpsertArgsSchema: z.ZodType<Prisma.WellUpsertArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  where: WellWhereUniqueInputSchema,
  create: z.union([ WellCreateInputSchema,WellUncheckedCreateInputSchema ]),
  update: z.union([ WellUpdateInputSchema,WellUncheckedUpdateInputSchema ]),
}).strict()

export const WellCreateManyArgsSchema: z.ZodType<Prisma.WellCreateManyArgs> = z.object({
  data: z.union([ WellCreateManyInputSchema,WellCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const WellAndReturnCreateManyArgsSchema: z.ZodType<Prisma.WellAndReturnCreateManyArgs> = z.object({
  data: z.union([ WellCreateManyInputSchema,WellCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const WellDeleteArgsSchema: z.ZodType<Prisma.WellDeleteArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  where: WellWhereUniqueInputSchema,
}).strict()

export const WellUpdateArgsSchema: z.ZodType<Prisma.WellUpdateArgs> = z.object({
  select: WellSelectSchema.optional(),
  include: WellIncludeSchema.optional(),
  data: z.union([ WellUpdateInputSchema,WellUncheckedUpdateInputSchema ]),
  where: WellWhereUniqueInputSchema,
}).strict()

export const WellUpdateManyArgsSchema: z.ZodType<Prisma.WellUpdateManyArgs> = z.object({
  data: z.union([ WellUpdateManyMutationInputSchema,WellUncheckedUpdateManyInputSchema ]),
  where: WellWhereInputSchema.optional(),
}).strict()

export const WellDeleteManyArgsSchema: z.ZodType<Prisma.WellDeleteManyArgs> = z.object({
  where: WellWhereInputSchema.optional(),
}).strict()

export const TelemetryEventCreateArgsSchema: z.ZodType<Prisma.TelemetryEventCreateArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  data: z.union([ TelemetryEventCreateInputSchema,TelemetryEventUncheckedCreateInputSchema ]),
}).strict()

export const TelemetryEventUpsertArgsSchema: z.ZodType<Prisma.TelemetryEventUpsertArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  where: TelemetryEventWhereUniqueInputSchema,
  create: z.union([ TelemetryEventCreateInputSchema,TelemetryEventUncheckedCreateInputSchema ]),
  update: z.union([ TelemetryEventUpdateInputSchema,TelemetryEventUncheckedUpdateInputSchema ]),
}).strict()

export const TelemetryEventCreateManyArgsSchema: z.ZodType<Prisma.TelemetryEventCreateManyArgs> = z.object({
  data: z.union([ TelemetryEventCreateManyInputSchema,TelemetryEventCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const TelemetryEventAndReturnCreateManyArgsSchema: z.ZodType<Prisma.TelemetryEventAndReturnCreateManyArgs> = z.object({
  data: z.union([ TelemetryEventCreateManyInputSchema,TelemetryEventCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const TelemetryEventDeleteArgsSchema: z.ZodType<Prisma.TelemetryEventDeleteArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  where: TelemetryEventWhereUniqueInputSchema,
}).strict()

export const TelemetryEventUpdateArgsSchema: z.ZodType<Prisma.TelemetryEventUpdateArgs> = z.object({
  select: TelemetryEventSelectSchema.optional(),
  include: TelemetryEventIncludeSchema.optional(),
  data: z.union([ TelemetryEventUpdateInputSchema,TelemetryEventUncheckedUpdateInputSchema ]),
  where: TelemetryEventWhereUniqueInputSchema,
}).strict()

export const TelemetryEventUpdateManyArgsSchema: z.ZodType<Prisma.TelemetryEventUpdateManyArgs> = z.object({
  data: z.union([ TelemetryEventUpdateManyMutationInputSchema,TelemetryEventUncheckedUpdateManyInputSchema ]),
  where: TelemetryEventWhereInputSchema.optional(),
}).strict()

export const TelemetryEventDeleteManyArgsSchema: z.ZodType<Prisma.TelemetryEventDeleteManyArgs> = z.object({
  where: TelemetryEventWhereInputSchema.optional(),
}).strict()

export const ColonyDetectionCreateArgsSchema: z.ZodType<Prisma.ColonyDetectionCreateArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  data: z.union([ ColonyDetectionCreateInputSchema,ColonyDetectionUncheckedCreateInputSchema ]),
}).strict()

export const ColonyDetectionUpsertArgsSchema: z.ZodType<Prisma.ColonyDetectionUpsertArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  where: ColonyDetectionWhereUniqueInputSchema,
  create: z.union([ ColonyDetectionCreateInputSchema,ColonyDetectionUncheckedCreateInputSchema ]),
  update: z.union([ ColonyDetectionUpdateInputSchema,ColonyDetectionUncheckedUpdateInputSchema ]),
}).strict()

export const ColonyDetectionCreateManyArgsSchema: z.ZodType<Prisma.ColonyDetectionCreateManyArgs> = z.object({
  data: z.union([ ColonyDetectionCreateManyInputSchema,ColonyDetectionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const ColonyDetectionAndReturnCreateManyArgsSchema: z.ZodType<Prisma.ColonyDetectionAndReturnCreateManyArgs> = z.object({
  data: z.union([ ColonyDetectionCreateManyInputSchema,ColonyDetectionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const ColonyDetectionDeleteArgsSchema: z.ZodType<Prisma.ColonyDetectionDeleteArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  where: ColonyDetectionWhereUniqueInputSchema,
}).strict()

export const ColonyDetectionUpdateArgsSchema: z.ZodType<Prisma.ColonyDetectionUpdateArgs> = z.object({
  select: ColonyDetectionSelectSchema.optional(),
  include: ColonyDetectionIncludeSchema.optional(),
  data: z.union([ ColonyDetectionUpdateInputSchema,ColonyDetectionUncheckedUpdateInputSchema ]),
  where: ColonyDetectionWhereUniqueInputSchema,
}).strict()

export const ColonyDetectionUpdateManyArgsSchema: z.ZodType<Prisma.ColonyDetectionUpdateManyArgs> = z.object({
  data: z.union([ ColonyDetectionUpdateManyMutationInputSchema,ColonyDetectionUncheckedUpdateManyInputSchema ]),
  where: ColonyDetectionWhereInputSchema.optional(),
}).strict()

export const ColonyDetectionDeleteManyArgsSchema: z.ZodType<Prisma.ColonyDetectionDeleteManyArgs> = z.object({
  where: ColonyDetectionWhereInputSchema.optional(),
}).strict()

export const ElnReportCreateArgsSchema: z.ZodType<Prisma.ElnReportCreateArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  data: z.union([ ElnReportCreateInputSchema,ElnReportUncheckedCreateInputSchema ]),
}).strict()

export const ElnReportUpsertArgsSchema: z.ZodType<Prisma.ElnReportUpsertArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  where: ElnReportWhereUniqueInputSchema,
  create: z.union([ ElnReportCreateInputSchema,ElnReportUncheckedCreateInputSchema ]),
  update: z.union([ ElnReportUpdateInputSchema,ElnReportUncheckedUpdateInputSchema ]),
}).strict()

export const ElnReportCreateManyArgsSchema: z.ZodType<Prisma.ElnReportCreateManyArgs> = z.object({
  data: z.union([ ElnReportCreateManyInputSchema,ElnReportCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const ElnReportAndReturnCreateManyArgsSchema: z.ZodType<Prisma.ElnReportAndReturnCreateManyArgs> = z.object({
  data: z.union([ ElnReportCreateManyInputSchema,ElnReportCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict()

export const ElnReportDeleteArgsSchema: z.ZodType<Prisma.ElnReportDeleteArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  where: ElnReportWhereUniqueInputSchema,
}).strict()

export const ElnReportUpdateArgsSchema: z.ZodType<Prisma.ElnReportUpdateArgs> = z.object({
  select: ElnReportSelectSchema.optional(),
  include: ElnReportIncludeSchema.optional(),
  data: z.union([ ElnReportUpdateInputSchema,ElnReportUncheckedUpdateInputSchema ]),
  where: ElnReportWhereUniqueInputSchema,
}).strict()

export const ElnReportUpdateManyArgsSchema: z.ZodType<Prisma.ElnReportUpdateManyArgs> = z.object({
  data: z.union([ ElnReportUpdateManyMutationInputSchema,ElnReportUncheckedUpdateManyInputSchema ]),
  where: ElnReportWhereInputSchema.optional(),
}).strict()

export const ElnReportDeleteManyArgsSchema: z.ZodType<Prisma.ElnReportDeleteManyArgs> = z.object({
  where: ElnReportWhereInputSchema.optional(),
}).strict()