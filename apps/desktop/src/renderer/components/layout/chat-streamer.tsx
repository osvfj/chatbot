import { useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { DateTime, Effect } from "effect";
import * as m from "@cafebot/i18n";
import { ChatMessage } from "@cafebot/sdk";
import { toast } from "sonner";
import { streamChat } from "../../lib/chat-stream";
import { messagesAtom } from "../../lib/atoms";
import { pendingReplyAtom, streamTextAtom } from "../../lib/streaming";
import { zenAccountAtom, zenApiKeyAtom, zenEndpoint, zenModelAtom } from "../../lib/zen-settings";

export function ChatStreamer() {
  const [pending, setPending] = useAtom(pendingReplyAtom);
  const [, setStreamText] = useAtom(streamTextAtom);
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
    const prompt =
      pending.context.length === 0 ? pending.content : `${pending.content}\n\n${pending.context}`;
    void streamChat({
      chatId: pending.chatId,
      content: prompt,
      apiKey,
      model,
      endpoint: zenEndpoint(account),
      signal: controller.signal,
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
  }, [pending, apiKey, model, account, setStreamText, setPending, setMessages]);

  return null;
}
