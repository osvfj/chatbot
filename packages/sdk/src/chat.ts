import { Schema } from "effect";

export const ChatRole = Schema.Literals(["user", "assistant"]);

export class MessageAttachment extends Schema.Class<MessageAttachment>("MessageAttachment")({
  name: Schema.NonEmptyString,
  dataUrl: Schema.NonEmptyString,
  sizeBytes: Schema.Number,
}) {}

export class ChatMessage extends Schema.Class<ChatMessage>("ChatMessage")({
  id: Schema.String.check(Schema.isUUID()),
  role: ChatRole,
  content: Schema.String,
  sentAt: Schema.DateTimeUtcFromDate,
  attachments: Schema.optional(Schema.Array(MessageAttachment)),
}) {}

export class ChatReply extends Schema.Class<ChatReply>("ChatReply")({
  message: ChatMessage,
  suggestions: Schema.Array(Schema.NonEmptyString),
}) {}
