import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { ChatDelta, DetectionResult, RpcError } from "@cafebot/sdk";

export class ChatRpcs extends RpcGroup.make(
  Rpc.make("SendMessage", {
    payload: Schema.Struct({
      content: Schema.NonEmptyString,
      apiKey: Schema.optional(Schema.NonEmptyString),
      model: Schema.optional(Schema.NonEmptyString),
      endpoint: Schema.optional(Schema.NonEmptyString),
    }),
    success: ChatDelta,
    error: RpcError,
    stream: true,
  }),
) {}

export class VisionRpcs extends RpcGroup.make(
  Rpc.make("AnalyzeImage", {
    payload: Schema.Struct({
      fileName: Schema.NonEmptyString,
      data: Schema.Uint8Array,
    }),
    success: DetectionResult,
    error: RpcError,
  }),
) {}

export const AllRpcs = ChatRpcs.merge(VisionRpcs);
