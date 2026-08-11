import { useAtom } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import { Cause, DateTime, Effect, Exit } from "effect";
import { ChatMessage } from "@cafebot/sdk";
import { toast } from "sonner";
import { analyzeImageFn, detectionsAtom, messagesAtom } from "./atoms";

export function useGallery() {
  const [detections, setDetections] = useAtom(detectionsAtom);
  const [analyzeResult, analyze] = useAtom(analyzeImageFn, {
    mode: "promiseExit",
  });
  const [, setMessages] = useAtom(messagesAtom);

  const analyzeFile = async (file: File): Promise<void> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const exit = await analyze({
      payload: { fileName: file.name, data: bytes },
    });
    if (Exit.isSuccess(exit)) {
      const detection = exit.value;
      const imageUrl = URL.createObjectURL(file);
      setDetections((current) => [...current, { detection, imageUrl, sizeBytes: bytes.length }]);
      const confidence = Math.round(detection.confidence * 100);
      setMessages((current) => [
        ...current,
        new ChatMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            `Analicé la imagen "${detection.fileName}": se detectó ${detection.disease.name} ` +
            `con un ${confidence}% de confianza. Encontrarás esta foto en la galería con el detalle completo.`,
          sentAt: Effect.runSync(DateTime.now),
        }),
      ]);
      toast.success("Análisis completado", {
        description: `${detection.disease.name} · ${confidence}% de confianza`,
      });
    } else {
      toast.error("No se pudo analizar la imagen", {
        description: String(Cause.squash(exit.cause)),
      });
    }
  };

  const removeDetection = (id: string): void => {
    setDetections((current) => current.filter((card) => card.detection.id !== id));
  };

  return {
    detections,
    isAnalyzing: AsyncResult.isWaiting(analyzeResult),
    analyzeFile,
    removeDetection,
  };
}
