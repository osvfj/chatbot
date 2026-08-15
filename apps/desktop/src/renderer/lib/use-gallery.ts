import { useAtom, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import { Cause, DateTime, Effect, Exit, Predicate } from "effect";
import * as m from "@cafebot/i18n";
import { ChatMessage } from "@cafebot/sdk";
import { toast } from "sonner";
import {
  analyzeImageFn,
  conversationMetaAtom,
  detectionsAtom,
  messagesAtom,
  type DetectionCard,
} from "./atoms";

export interface Album {
  readonly conversationUuid: string;
  readonly title: string;
  readonly createdAt: number;
  readonly photos: ReadonlyArray<DetectionCard>;
}

export function useGallery() {
  const [detections, setDetections] = useAtom(detectionsAtom);
  const conversationMeta = useAtomValue(conversationMetaAtom);
  const [analyzeResult, analyze] = useAtom(analyzeImageFn, {
    mode: "promiseExit",
  });
  const [, setMessages] = useAtom(messagesAtom);

  const analyzeFile = async (file: File, conversationUuid: string): Promise<void> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const exit = await analyze({
      payload: { fileName: file.name, data: bytes },
    });
    if (Exit.isSuccess(exit)) {
      const detection = exit.value;
      const imageUrl = URL.createObjectURL(file);
      setDetections((current) => [
        ...current,
        { detection, imageUrl, sizeBytes: bytes.length, conversationUuid },
      ]);
      const confidence = Math.round(detection.confidence * 100);
      setMessages((current) => [
        ...current,
        new ChatMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: m.chatAnalysisResult({
            fileName: detection.fileName,
            diseaseName: detection.disease.name,
            confidence,
          }),
          sentAt: Effect.runSync(DateTime.now),
        }),
      ]);
    } else {
      toast.error(m.errorAnalysis(), {
        description: String(Cause.squash(exit.cause)),
      });
    }
  };

  const removeDetection = (id: string): void => {
    setDetections((current) => current.filter((card) => card.detection.id !== id));
  };

  const albums: ReadonlyArray<Album> = (() => {
    const groups = new Map<string, Array<DetectionCard>>();
    for (const card of detections) {
      const existing = groups.get(card.conversationUuid);
      const group = Predicate.isUndefined(existing) ? [] : existing;
      group.push(card);
      groups.set(card.conversationUuid, group);
    }
    const result: Array<Album> = [];
    for (const [uuid, photos] of groups) {
      const first = photos[0];
      if (Predicate.isUndefined(first)) {
        continue;
      }
      const meta = conversationMeta.get(uuid);
      result.push({
        conversationUuid: uuid,
        title: Predicate.isUndefined(meta) ? first.detection.disease.name : meta.title,
        createdAt: Predicate.isUndefined(meta) ? 0 : meta.createdAt,
        photos,
      });
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  })();

  return {
    detections,
    albums,
    isAnalyzing: AsyncResult.isWaiting(analyzeResult),
    analyzeFile,
    removeDetection,
  };
}
