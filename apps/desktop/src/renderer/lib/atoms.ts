import { DateTime, Effect, Predicate } from "effect";
import { Atom } from "effect/unstable/reactivity";
import * as m from "@cafebot/i18n";
import { ChatMessage } from "@cafebot/sdk";
import { getStoredTheme, prefersDarkColorScheme } from "./theme";
import type { Session } from "./backend";

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

export const sessionAtom = Atom.make<Session | null>(null).pipe(Atom.keepAlive);

export const conversationMetaAtom = Atom.make<ReadonlyMap<string, ConversationMeta>>(
  new Map(),
).pipe(Atom.keepAlive);

export const messagesAtom = Atom.make<ReadonlyArray<InstanceType<typeof ChatMessage>>>([
  welcomeMessage,
]).pipe(Atom.keepAlive);

export const suggestionsAtom = Atom.make<ReadonlyArray<string>>([]).pipe(Atom.keepAlive);

const storedTheme = getStoredTheme();

export const darkModeAtom = Atom.make(
  Predicate.isNull(storedTheme) ? prefersDarkColorScheme() : storedTheme,
).pipe(Atom.keepAlive);
