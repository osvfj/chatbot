import { Predicate } from "effect";
import { BACKEND_URL, getToken } from "./backend";

export interface ChatStreamOptions {
  readonly chatId: string;
  readonly content: string;
  readonly fotoId?: string | undefined;
  readonly apiKey: string;
  readonly model: string;
  readonly endpoint: string;
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
        if (!trimmed.startsWith("data:")) {
          continue;
        }
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          continue;
        }
        const payload = JSON.parse(data) as {
          readonly error?: { readonly message?: string };
          readonly choices?: ReadonlyArray<{ readonly delta?: { readonly content?: string } }>;
        };
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
