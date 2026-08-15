import { useState } from "react";
import { useAtom } from "@effect/atom-react";
import { Cause, DateTime, Effect, Exit } from "effect";
import * as m from "@cafebot/i18n";
import { ChatMessage, MessageAttachment } from "@cafebot/sdk";
import { toast } from "sonner";
import { messagesAtom, sendMessageFn, suggestionsAtom, welcomeMessage } from "./atoms";

const errorMessage = new ChatMessage({
  id: "00000000-0000-4000-8000-000000000002",
  role: "assistant",
  content: m.chatErrorReply(),
  sentAt: Effect.runSync(DateTime.now),
});

export function useChat() {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [, send] = useAtom(sendMessageFn, { mode: "promiseExit" });
  const [, setSuggestions] = useAtom(suggestionsAtom);
  const [sending, setSending] = useState(false);

  const appendUserMessage = (
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
  };

  const sendReply = async (content: string): Promise<void> => {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return;
    }
    setSuggestions([]);
    setSending(true);
    try {
      const exit = await send({ payload: { content: trimmed } });
      if (Exit.isSuccess(exit)) {
        setMessages((current) => [...current, exit.value.message]);
        setSuggestions(exit.value.suggestions);
      } else {
        setMessages((current) => [...current, errorMessage]);
        toast.error(m.errorSend(), {
          description: String(Cause.squash(exit.cause)),
        });
      }
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (content: string): Promise<void> => {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return;
    }
    appendUserMessage(trimmed);
    await sendReply(trimmed);
  };

  const resetChat = (): void => {
    setMessages([welcomeMessage]);
    setSuggestions([]);
  };

  return {
    messages,
    isWaiting: sending,
    sendMessage,
    appendUserMessage,
    sendReply,
    resetChat,
  };
}
