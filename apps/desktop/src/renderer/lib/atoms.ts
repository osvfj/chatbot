import { DateTime, Effect, Predicate } from "effect";
import { Atom } from "effect/unstable/reactivity";
import * as m from "@cafebot/i18n";
import { ChatMessage, DetectionResult } from "@cafebot/sdk";
import { Api } from "../services/api";
import { getStoredTheme, prefersDarkColorScheme } from "./theme";

export interface DetectionCard {
  readonly detection: InstanceType<typeof DetectionResult>;
  readonly imageUrl: string;
  readonly sizeBytes: number;
  readonly conversationUuid: string;
}

export interface ConversationMeta {
  readonly title: string;
  readonly createdAt: number;
}

export const welcomeMessage = new ChatMessage({
  id: "00000000-0000-4000-8000-000000000000",
  role: "assistant",
  content: m.chatWelcome(),
  sentAt: Effect.runSync(DateTime.now),
});

export const conversationUuidAtom = Atom.make<string | null>(null).pipe(Atom.keepAlive);

export const conversationMetaAtom = Atom.make<ReadonlyMap<string, ConversationMeta>>(
  new Map(),
).pipe(Atom.keepAlive);

export const messagesAtom = Atom.make<ReadonlyArray<InstanceType<typeof ChatMessage>>>([
  welcomeMessage,
]).pipe(Atom.keepAlive);

export const detectionsAtom = Atom.make<ReadonlyArray<DetectionCard>>([]).pipe(Atom.keepAlive);

export const suggestionsAtom = Atom.make<ReadonlyArray<string>>([]).pipe(Atom.keepAlive);

const storedTheme = getStoredTheme();

export const darkModeAtom = Atom.make(
  Predicate.isNull(storedTheme) ? prefersDarkColorScheme() : storedTheme,
).pipe(Atom.keepAlive);

export const sendMessageFn = Api.mutation("SendMessage").pipe(Atom.keepAlive);

export const analyzeImageFn = Api.mutation("AnalyzeImage").pipe(Atom.keepAlive);
