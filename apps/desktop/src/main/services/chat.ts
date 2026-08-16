import { Effect, Stream } from "effect";
import { ChatDelta, RpcError } from "@cafebot/sdk";
import { streamChatCompletion, type LlmMessage, type LlmOptions } from "./llm";

const systemPrompt =
  "Eres Cafebot, un asistente experto en la detección y el manejo de enfermedades del cafeto " +
  "(roya, cercospora, ojo de gallo, minador de la hoja y broca). Responde en el mismo idioma " +
  "del usuario, con un lenguaje claro y cercano. Ofrece consejos prácticos de manejo integrado cuando el tema lo requiera.";

const maxHistory = 20;

let turns: ReadonlyArray<LlmMessage> = [];

const pushTurn = (message: LlmMessage): void => {
  turns = [...turns, message].slice(-maxHistory);
};

export const sendMessage = (
  content: string,
  options: LlmOptions = {},
): Stream.Stream<ChatDelta, RpcError> => {
  const userMessage: LlmMessage = { role: "user", content };
  const systemMessage: LlmMessage = { role: "system", content: systemPrompt };
  return Stream.unwrap(
    streamChatCompletion([systemMessage, ...turns, userMessage], options).pipe(
      Effect.map((stream) => {
        pushTurn(userMessage);
        const buffer: Array<string> = [];
        return stream.pipe(
          Stream.tap((delta) =>
            Effect.sync(() => {
              buffer.push(delta.delta);
            }),
          ),
          Stream.ensuring(
            Effect.sync(() => {
              const text = buffer.join("");
              if (text.length > 0) {
                pushTurn({ role: "assistant", content: text });
              }
            }),
          ),
        );
      }),
    ),
  );
};
