import { useAtom } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import { Cause, DateTime, Effect, Exit } from "effect";
import { ChatMessage } from "@cafebot/sdk";
import { toast } from "sonner";
import { messagesAtom, sendMessageFn, suggestionsAtom, welcomeMessage } from "./atoms";

const errorMessage = new ChatMessage({
  id: "00000000-0000-4000-8000-000000000002",
  role: "assistant",
  content: "Lo siento, hubo un problema al generar la respuesta. Inténtalo de nuevo en un momento.",
  sentAt: Effect.runSync(DateTime.now),
});

export function useChat() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [sendResult, send] = useAtom(sendMessageFn, { mode: "promiseExit" });
  const [, setSuggestions] = useAtom(suggestionsAtom);

  const sendMessage = async (content: string): Promise<void> => {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return;
    }
    setSuggestions([]);
    setMessages((current) => [
      ...current,
      new ChatMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        sentAt: Effect.runSync(DateTime.now),
      }),
    ]);

    const exit = await send({ payload: { content: trimmed } });
    if (Exit.isSuccess(exit)) {
      setMessages((current) => [...current, exit.value.message]);
      setSuggestions(exit.value.suggestions);
    } else {
      setMessages((current) => [...current, errorMessage]);
      toast.error("No se pudo enviar el mensaje", {
        description: String(Cause.squash(exit.cause)),
      });
    }
  };

  const resetChat = (): void => {
    setMessages([welcomeMessage]);
    setSuggestions([]);
  };

  return {
    messages,
    isWaiting: AsyncResult.isWaiting(sendResult),
    sendMessage,
    resetChat,
  };
}
