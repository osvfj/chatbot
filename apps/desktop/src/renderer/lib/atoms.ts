import { DateTime, Effect } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { ChatMessage, DetectionResult } from "@cafebot/sdk";
import { Api } from "../services/api";
import { getStoredTheme, prefersDarkColorScheme } from "./theme";

export type SectionId = "chat" | "gallery";

export interface DetectionCard {
  readonly detection: InstanceType<typeof DetectionResult>;
  readonly imageUrl: string;
  readonly sizeBytes: number;
}

export const welcomeMessage = new ChatMessage({
  id: "00000000-0000-4000-8000-000000000000",
  role: "assistant",
  content:
    "¡Hola! Soy Cafebot, tu asistente para la detección de enfermedades del cafeto. Sube una foto de una hoja y la analizaré, o pregúntame sobre roya, cercospora, ojo de gallo, broca o minador.",
  sentAt: Effect.runSync(DateTime.now),
});

export const activeSectionAtom = Atom.make<SectionId>("chat").pipe(Atom.keepAlive);

export const messagesAtom = Atom.make<ReadonlyArray<InstanceType<typeof ChatMessage>>>([
  welcomeMessage,
]).pipe(Atom.keepAlive);

export const detectionsAtom = Atom.make<ReadonlyArray<DetectionCard>>([]).pipe(Atom.keepAlive);

export const suggestionsAtom = Atom.make<ReadonlyArray<string>>([]).pipe(Atom.keepAlive);

export const darkModeAtom = Atom.make(getStoredTheme() ?? prefersDarkColorScheme()).pipe(
  Atom.keepAlive,
);

export const sendMessageFn = Api.mutation("SendMessage").pipe(Atom.keepAlive);

export const analyzeImageFn = Api.mutation("AnalyzeImage").pipe(Atom.keepAlive);
