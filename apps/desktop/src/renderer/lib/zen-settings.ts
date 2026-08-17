import { Atom } from "effect/unstable/reactivity";

const ZEN_API_KEY_STORAGE = "cafebot:zen-api-key";
const ZEN_MODEL_STORAGE = "cafebot:zen-model";
const ZEN_ACCOUNT_STORAGE = "cafebot:zen-account";
const CHAT_MODE_STORAGE = "cafebot:chat-mode";

export type ZenAccount = "zen" | "go";
export type ChatMode = "classical" | "llm";

export const ZEN_MODELS = [
  { id: "deepseek-v4-flash-free", paid: false, zen: true, go: false },
  { id: "big-pickle", paid: false, zen: true, go: false },
  { id: "mimo-v2.5-free", paid: false, zen: true, go: false },
  { id: "deepseek-v4-flash", paid: true, zen: true, go: true },
  { id: "deepseek-v4-pro", paid: true, zen: true, go: true },
  { id: "minimax-m3", paid: true, zen: true, go: true },
  { id: "minimax-m2.7", paid: true, zen: true, go: true },
  { id: "minimax-m2.5", paid: true, zen: true, go: true },
  { id: "kimi-k3", paid: true, zen: true, go: true },
  { id: "grok-4.5", paid: true, zen: true, go: true },
  { id: "qwen3.8-max", paid: true, zen: false, go: true },
  { id: "glm-5.2", paid: true, zen: true, go: true },
  { id: "glm-5.1", paid: true, zen: true, go: true },
  { id: "gpt-5.6-luna", paid: true, zen: true, go: true },
  { id: "qwen3.7-plus", paid: true, zen: false, go: true },
  { id: "hy3", paid: true, zen: false, go: true },
  { id: "mimo-v2.5", paid: true, zen: false, go: true },
  { id: "qwen3.6-plus", paid: true, zen: true, go: true },
  { id: "qwen3.5-plus", paid: true, zen: true, go: true },
] as const;

const readStored = (key: string): string => {
  const stored = localStorage.getItem(key);
  return stored ?? "";
};

export const zenApiKeyAtom = Atom.make(readStored(ZEN_API_KEY_STORAGE)).pipe(Atom.keepAlive);

export const zenModelAtom = Atom.make(readStored(ZEN_MODEL_STORAGE)).pipe(Atom.keepAlive);

export const zenAccountAtom = Atom.make<ZenAccount>(
  readStored(ZEN_ACCOUNT_STORAGE) === "go" ? "go" : "zen",
).pipe(Atom.keepAlive);

export const chatModeAtom = Atom.make<ChatMode>(
  readStored(CHAT_MODE_STORAGE) === "llm" ? "llm" : "classical",
).pipe(Atom.keepAlive);

export const defaultZenModel = (account: ZenAccount): string =>
  account === "go" ? "deepseek-v4-flash" : "deepseek-v4-flash-free";

export const zenEndpoint = (account: ZenAccount): string =>
  account === "go"
    ? "https://opencode.ai/zen/go/v1/chat/completions"
    : "https://opencode.ai/zen/v1/chat/completions";

export const persistZenApiKey = (value: string): void => {
  localStorage.setItem(ZEN_API_KEY_STORAGE, value);
};

export const persistZenModel = (value: string): void => {
  localStorage.setItem(ZEN_MODEL_STORAGE, value);
};

export const persistZenAccount = (value: ZenAccount): void => {
  localStorage.setItem(ZEN_ACCOUNT_STORAGE, value);
};

export const persistChatMode = (value: ChatMode): void => {
  localStorage.setItem(CHAT_MODE_STORAGE, value);
};
