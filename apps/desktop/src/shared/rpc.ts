import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { ChatReply, DetectionResult, RpcError } from "@cafebot/sdk";

export class ChatRpcs extends RpcGroup.make(
  Rpc.make("SendMessage", {
    payload: Schema.Struct({ content: Schema.NonEmptyString }),
    success: ChatReply,
    error: RpcError,
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
