import { Predicate } from "effect";

const THEME_STORAGE_KEY = "cafebot.theme";

export function prefersDarkColorScheme(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getStoredTheme(): boolean | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (Predicate.isNull(stored)) {
    return null;
  }
  return stored === "dark";
}

export function storeTheme(dark: boolean): void {
  localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
}

export function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
}
