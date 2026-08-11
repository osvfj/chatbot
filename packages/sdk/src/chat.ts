import { Schema } from "effect";

export const ChatRole = Schema.Literals(["user", "assistant"]);

export class ChatMessage extends Schema.Class<ChatMessage>("ChatMessage")({
  id: Schema.String.check(Schema.isUUID()),
  role: ChatRole,
  content: Schema.NonEmptyString,
  sentAt: Schema.DateTimeUtcFromDate,
}) {}

export class ChatReply extends Schema.Class<ChatReply>("ChatReply")({
  message: ChatMessage,
  suggestions: Schema.Array(Schema.NonEmptyString),
}) {}
