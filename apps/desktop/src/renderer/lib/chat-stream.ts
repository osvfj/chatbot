import { Predicate } from "effect";
import { BACKEND_URL, getToken } from "./backend";
import type { DialogueQuestion } from "./streaming";

export interface ChatContext {
  readonly question: DialogueQuestion | null;
  readonly sentiment?: {
    readonly label: string;
    readonly probas: Readonly<Record<string, number>>;
    readonly confidence: number;
  } | null;
  readonly policy?: {
    readonly tone: string;
    readonly verbosity: string;
    readonly must_not_confirm_diagnosis: boolean;
    readonly ask_for_evidence_if_empty: boolean;
  } | null;
  readonly bayesian?: {
    readonly hypotheses: Readonly<Record<string, number>>;
    readonly top_hypothesis: string | null;
    readonly confidence: number;
    readonly evidence: ReadonlyArray<unknown>;
  } | null;
}

export interface ChatStreamOptions {
  readonly chatId: string;
  readonly content: string;
  readonly fotoId?: string | undefined;
  readonly answerId?: string | undefined;
  readonly freeText?: string | undefined;
  readonly apiKey: string;
  readonly model: string;
  readonly endpoint: string;
  readonly onContext: (context: ChatContext) => void;
  readonly onDelta: (text: string) => void;
  readonly onDone: (fullText: string) => void;
  readonly onError: (message: string) => void;
  readonly signal?: AbortSignal | undefined;
}

export async function streamChat(options: ChatStreamOptions): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BACKEND_URL}/chats/${options.chatId}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      content: options.content,
      ...(options.fotoId === undefined ? {} : { foto_id: options.fotoId }),
      ...(options.answerId === undefined ? {} : { answer_id: options.answerId }),
      ...(options.freeText === undefined ? {} : { free_text: options.freeText }),
      apiKey: options.apiKey,
      model: options.model,
      endpoint: options.endpoint,
    }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });

  if (!res.ok || res.body === null) {
    const body = await res.text().catch(() => "");
    options.onError(`${res.status}: ${body.slice(0, 200)}`);
    return;
  }

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = "";
  let full = "";
  let eventName = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const trimmed = line.trim();
        if (trimmed.startsWith("event:")) {
          eventName = trimmed.slice(6).trim();
          continue;
        }
        if (!trimmed.startsWith("data:")) {
          continue;
        }
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          eventName = "";
          continue;
        }
        const payload = JSON.parse(data) as {
          readonly error?: { readonly message?: string };
          readonly choices?: ReadonlyArray<{ readonly delta?: { readonly content?: string } }>;
          readonly detection?: unknown;
          readonly intent?: unknown;
          readonly question?: DialogueQuestion | null;
          readonly bayesian?: ChatContext["bayesian"];
          readonly sentiment?: ChatContext["sentiment"];
          readonly policy?: ChatContext["policy"];
        };
        if (eventName === "context") {
          options.onContext({
            question: payload.question ?? null,
            bayesian: payload.bayesian ?? null,
            sentiment: payload.sentiment ?? null,
            policy: payload.policy ?? null,
          });
          eventName = "";
          continue;
        }
        if (payload.error !== undefined) {
          throw new Error(payload.error.message ?? "Error del LLM");
        }
        const delta = payload.choices?.[0]?.delta?.content;
        if (Predicate.isString(delta) && delta.length > 0) {
          full += delta;
          options.onDelta(full);
        }
      }
    }
    options.onDone(full);
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      return;
    }
    options.onError(String(cause));
  }
}
