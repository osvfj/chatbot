import { Schema } from "effect";
import { DiseaseInfo } from "./catalog.ts";

export class DetectionResult extends Schema.Class<DetectionResult>("DetectionResult")({
  id: Schema.String.check(Schema.isUUID()),
  fileName: Schema.NonEmptyString,
  disease: DiseaseInfo,
  confidence: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  analyzedAt: Schema.DateTimeUtcFromDate,
}) {}

export class RpcError extends Schema.TaggedClass<RpcError>()("RpcError", {
  code: Schema.NonEmptyString,
  message: Schema.NonEmptyString,
}) {}
