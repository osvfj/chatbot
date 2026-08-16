import { useCallback } from "react";
import { useAtom } from "@effect/atom-react";
import { DateTime, Effect } from "effect";
import { ChatMessage, MessageAttachment } from "@cafebot/sdk";
import { messagesAtom, suggestionsAtom, welcomeMessage } from "./atoms";
import { pendingReplyAtom } from "./streaming";

export function useChat() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [, setSuggestions] = useAtom(suggestionsAtom);
  const [streaming, setStreaming] = useAtom(pendingReplyAtom);

  const appendUserMessage = useCallback(
    (
      content: string,
      attachments: ReadonlyArray<{
        readonly name: string;
        readonly dataUrl: string;
        readonly sizeBytes: number;
      }> = [],
    ): void => {
      setMessages((current) => [
        ...current,
        new ChatMessage({
          id: crypto.randomUUID(),
          role: "user",
          content,
          sentAt: Effect.runSync(DateTime.now),
          attachments: attachments.map((attachment) => new MessageAttachment(attachment)),
        }),
      ]);
    },
    [setMessages],
  );

  const sendReply = useCallback(
    (content: string, context = ""): void => {
      const trimmed = content.trim();
      if (trimmed.length === 0) {
        return;
      }
      setSuggestions([]);
      setStreaming({ content: trimmed, context, key: crypto.randomUUID() });
    },
    [setSuggestions, setStreaming],
  );

  const clearStreaming = useCallback((): void => {
    setStreaming(null);
  }, [setStreaming]);

  const sendMessage = useCallback(
    (content: string): void => {
      const trimmed = content.trim();
      if (trimmed.length === 0) {
        return;
      }
      appendUserMessage(trimmed);
      sendReply(trimmed);
    },
    [appendUserMessage, sendReply],
  );

  const resetChat = useCallback((): void => {
    setMessages([welcomeMessage]);
    setSuggestions([]);
    setStreaming(null);
  }, [setMessages, setSuggestions, setStreaming]);

  return {
    messages,
    isWaiting: streaming !== null,
    streaming,
    clearStreaming,
    sendMessage,
    appendUserMessage,
    sendReply,
    resetChat,
  };
}
