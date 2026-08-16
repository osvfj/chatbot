import { useEffect, useRef } from "react";
import { useAtom, useAtomRefresh } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import { Cause, DateTime, Effect } from "effect";
import * as m from "@cafebot/i18n";
import { ChatMessage } from "@cafebot/sdk";
import { toast } from "sonner";
import { messagesAtom } from "../../lib/atoms";
import { pendingReplyAtom, streamingResultAtom } from "../../lib/streaming";

export function StreamingManager() {
  const [pending, setPending] = useAtom(pendingReplyAtom);
  const [result, write] = useAtom(streamingResultAtom);
  const [, setMessages] = useAtom(messagesAtom);
  const refresh = useAtomRefresh(streamingResultAtom);
  const activeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (pending === null) {
      return;
    }
    if (activeKeyRef.current !== pending.key) {
      activeKeyRef.current = pending.key;
      refresh();
      return;
    }
    if (AsyncResult.isWaiting(result)) {
      return;
    }
    if (AsyncResult.isSuccess(result)) {
      if (result.value.done) {
        const text = result.value.items.map((item) => item.delta).join("");
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
      } else {
        write(undefined);
      }
      return;
    }
    if (AsyncResult.isFailure(result)) {
      toast.error(m.errorSend(), {
        description: String(Cause.squash(result.cause)),
      });
      activeKeyRef.current = null;
      setPending(null);
    }
  }, [pending, result, refresh, write, setPending, setMessages]);

  return null;
}
