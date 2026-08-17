import { useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { DateTime, Effect } from "effect";
import * as m from "@cafebot/i18n";
import { ChatMessage } from "@cafebot/sdk";
import { toast } from "sonner";
import { streamChat } from "../../lib/chat-stream";
import { messagesAtom } from "../../lib/atoms";
import {
  dialogueQuestionAtom,
  learnerDecisionAtom,
  pendingReplyAtom,
  streamTextAtom,
} from "../../lib/streaming";
import { zenAccountAtom, zenApiKeyAtom, zenEndpoint, zenModelAtom } from "../../lib/zen-settings";

export function ChatStreamer() {
  const [pending, setPending] = useAtom(pendingReplyAtom);
  const [, setStreamText] = useAtom(streamTextAtom);
  const [, setDialogueQuestion] = useAtom(dialogueQuestionAtom);
  const [, setLearnerDecision] = useAtom(learnerDecisionAtom);
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
        console.groupCollapsed("[Cafebot] Actualización bayesiana");
        console.table(context.bayesian?.hypotheses ?? {});
        console.log("Hipótesis principal:", context.bayesian?.top_hypothesis);
        console.log("Confianza:", context.bayesian?.confidence);
        console.log("Evidencia acumulada:", context.bayesian?.evidence);
        console.groupEnd();
        console.groupCollapsed("[Cafebot] Política de intención");
        console.log("Acción:", context.intent_policy?.action);
        console.log("Requisitos:", context.intent_policy?.must_have);
        console.log("Máximo de preguntas:", context.intent_policy?.max_questions);
        console.groupEnd();
        console.groupCollapsed("[Cafebot] Grafo de conocimiento");
        console.log("Encontrado:", context.knowledge?.found);
        console.log("Consulta:", context.knowledge?.query);
        console.log("Nodo:", context.knowledge?.node);
        console.log("Ruta:", context.knowledge?.path);
        console.log("Costo:", context.knowledge?.cost);
        console.log("Respuesta recuperada:", context.knowledge?.response);
        console.groupEnd();
        console.groupCollapsed("[Cafebot] Análisis de sentimiento");
        console.log("Etiqueta:", context.sentiment?.label);
        console.table(context.sentiment?.probas ?? {});
        console.log("Confianza:", context.sentiment?.confidence);
        console.log("Política aplicada:", context.policy);
        console.groupEnd();
        setDialogueQuestion(context.question);
        if (
          context.policy?.learner_state !== undefined &&
          context.policy.selected_source !== undefined
        ) {
          setLearnerDecision({
            state: context.policy.learner_state,
            action: context.policy.selected_source,
          });
        }
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
    setLearnerDecision,
  ]);

  return null;
}
