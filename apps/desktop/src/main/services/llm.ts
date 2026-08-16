import { Effect, Predicate, Result, Schema, Stream } from "effect";
import { Sse } from "effect/unstable/encoding";
import { ChatDelta, RpcError } from "@cafebot/sdk";

const defaultEndpoint =
  process.env.OPENCODE_ZEN_ENDPOINT ?? "https://opencode.ai/zen/v1/chat/completions";
const defaultModel = process.env.OPENCODE_ZEN_MODEL ?? "deepseek-v4-flash-free";

export interface LlmOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly endpoint?: string;
}

export interface LlmMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

const DeltaChunkSchema = Schema.Struct({
  choices: Schema.Array(
    Schema.Struct({
      delta: Schema.Struct({ content: Schema.optional(Schema.String) }),
    }),
  ),
});

const parseDelta = (data: string): Result.Result<ChatDelta, void> => {
  if (data === "[DONE]") {
    return Result.failVoid;
  }
  try {
    const decoded = Schema.decodeUnknownSync(DeltaChunkSchema)(JSON.parse(data));
    const content = decoded.choices[0]?.delta.content;
    if (content === undefined) {
      return Result.failVoid;
    }
    return Result.succeed(new ChatDelta({ delta: content }));
  } catch {
    return Result.failVoid;
  }
};

export const streamChatCompletion = (
  messages: ReadonlyArray<LlmMessage>,
  options: LlmOptions = {},
): Effect.Effect<Stream.Stream<ChatDelta, RpcError>, RpcError> =>
  Effect.gen(function* () {
    const apiKey = options.apiKey ?? process.env.OPENCODE_API_KEY ?? "public";
    const model = options.model ?? defaultModel;
    const endpoint = options.endpoint ?? defaultEndpoint;
    const response = yield* Effect.tryPromise(() =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          accept: "text/event-stream",
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, stream: true }),
      }),
    ).pipe(
      Effect.mapError((error) => new RpcError({ code: "llm-request", message: String(error) })),
    );

    if (!response.ok) {
      const body = yield* Effect.tryPromise(() => response.text()).pipe(
        Effect.mapError((error) => new RpcError({ code: "llm-status", message: String(error) })),
      );
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const hint = retryAfter === null ? "" : ` Se renueva en ${retryAfter} s (medianoche UTC).`;
        return yield* Effect.fail(
          new RpcError({
            code: "llm-rate-limit",
            message: `Límite de uso gratuito de OpenCode Zen alcanzado (429).${hint} ${body.slice(0, 200)}`,
          }),
        );
      }
      return yield* Effect.fail(
        new RpcError({
          code: "llm-status",
          message: `OpenCode Zen respondió ${response.status}: ${body.slice(0, 300)}`,
        }),
      );
    }

    const bodyStream = response.body;
    if (Predicate.isNull(bodyStream)) {
      return yield* Effect.fail(
        new RpcError({
          code: "llm-empty",
          message: "OpenCode Zen no devolvió un cuerpo de streaming",
        }),
      );
    }

    const decoder = new TextDecoder();

    return Stream.fromAsyncIterable(
      bodyStream,
      (error) => new RpcError({ code: "llm-stream", message: String(error) }),
    ).pipe(
      Stream.map((chunk) => decoder.decode(chunk, { stream: true })),
      Stream.pipeThroughChannel(Sse.decode()),
      Stream.filterMap((event) => parseDelta(event.data)),
      Stream.mapError((error) => new RpcError({ code: "llm-stream", message: String(error) })),
    );
  });
