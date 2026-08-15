import { useEffect } from "react";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { Predicate } from "effect";
import { Atom } from "effect/unstable/reactivity";
import * as m from "@cafebot/i18n";
import {
  baseLocale,
  isLocale,
  overwriteGetLocale,
  overwriteSetLocale,
  toLocale,
} from "@cafebot/i18n";

export type Language = "es" | "en" | "ht";

const LANGUAGE_STORAGE_KEY = "cafebot:language";

const LANGUAGE_ORDER: ReadonlyArray<Language> = ["es", "en", "ht"];

const detectSystemLanguage = (): Language => {
  const system = navigator.language.toLowerCase();
  const matched = toLocale(system);
  if (Predicate.isNotUndefined(matched) && isLocale(matched)) {
    return matched;
  }
  if (system.startsWith("es")) {
    return "es";
  }
  if (system.startsWith("ht")) {
    return "ht";
  }
  if (system.startsWith("en")) {
    return "en";
  }
  return baseLocale;
};

const readStoredLanguage = (): Language => {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (!Predicate.isNull(stored)) {
    const parsed = toLocale(stored);
    if (Predicate.isNotUndefined(parsed) && isLocale(parsed)) {
      return parsed;
    }
  }
  return detectSystemLanguage();
};

export const languageAtom = Atom.make<Language>(readStoredLanguage()).pipe(Atom.keepAlive);

let currentLanguage: Language = readStoredLanguage();
overwriteGetLocale(() => currentLanguage);
overwriteSetLocale(() => undefined);

export function useLanguage() {
  const [language, setLanguageState] = useAtom(languageAtom);

  const setLanguage = (next: Language): void => {
    currentLanguage = next;
    setLanguageState(next);
  };

  useEffect(() => {
    currentLanguage = language;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  return [language, setLanguage] as const;
}

export function useMessages() {
  useAtomValue(languageAtom);
  return m;
}

export function cycleLanguage(language: Language): Language {
  const index = LANGUAGE_ORDER.indexOf(language);
  const next = LANGUAGE_ORDER[(index + 1) % LANGUAGE_ORDER.length];
  return Predicate.isUndefined(next) ? baseLocale : next;
}
