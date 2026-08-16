import { useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { DateTime, Effect } from "effect";
import * as m from "@cafebot/i18n";
import { ChatMessage } from "@cafebot/sdk";
import { toast } from "sonner";
import { streamChat } from "../../lib/chat-stream";
import { messagesAtom } from "../../lib/atoms";
import { dialogueQuestionAtom, pendingReplyAtom, streamTextAtom } from "../../lib/streaming";
import { zenAccountAtom, zenApiKeyAtom, zenEndpoint, zenModelAtom } from "../../lib/zen-settings";

export function ChatStreamer() {
  const [pending, setPending] = useAtom(pendingReplyAtom);
  const [, setStreamText] = useAtom(streamTextAtom);
  const [, setDialogueQuestion] = useAtom(dialogueQuestionAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const apiKey = useAtomValue(zenApiKeyAtom);
  const model = useAtomValue(zenModelAtom);
  const account = useAtomValue(zenAccountAtom);
  const activeKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (pending === null) {
      return;
    }
    if (activeKeyRef.current === pending.key) {
      return;
    }
    activeKeyRef.current = pending.key;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setStreamText("");
    void streamChat({
      chatId: pending.chatId,
      content: pending.content,
      ...(pending.fotoId === undefined ? {} : { fotoId: pending.fotoId }),
      ...(pending.answerId === undefined ? {} : { answerId: pending.answerId }),
      ...(pending.freeText === undefined ? {} : { freeText: pending.freeText }),
      apiKey,
      model,
      endpoint: zenEndpoint(account),
      signal: controller.signal,
      onContext: (context) => {
        console.info("[ml-core] Contexto crudo enviado al LLM", context);
        setDialogueQuestion(context.question);
      },
      onDelta: (text) => setStreamText(text),
      onDone: (text) => {
        if (text.length > 0) {
          setMessages((current) => [
            ...current,
            new ChatMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: text,
              sentAt: Effect.runSync(DateTime.now),
            }),
          ]);
        }
        activeKeyRef.current = null;
        setPending(null);
      },
      onError: (message) => {
        toast.error(m.errorSend(), { description: message });
        activeKeyRef.current = null;
        setPending(null);
      },
    });
    return () => controller.abort();
  }, [
    pending,
    apiKey,
    model,
    account,
    setStreamText,
    setPending,
    setMessages,
    setDialogueQuestion,
  ]);

  return null;
}
