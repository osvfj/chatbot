import { RegistryProvider } from "@effect/atom-react";
import { createRoot } from "react-dom/client";
import { Predicate } from "effect";
import "@cafebot/ui/globals.css";
import { App } from "./App";
import { applyTheme, getStoredTheme, prefersDarkColorScheme } from "./lib/theme";

const storedTheme = getStoredTheme();
applyTheme(Predicate.isNull(storedTheme) ? prefersDarkColorScheme() : storedTheme);

const container = document.getElementById("root");
if (container === null) {
  throw new Error("Falta el elemento #root");
}

createRoot(container).render(
  <RegistryProvider>
    <App />
  </RegistryProvider>,
);
