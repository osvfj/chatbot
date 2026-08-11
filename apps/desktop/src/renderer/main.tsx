import { RegistryProvider } from "@effect/atom-react";
import { createRoot } from "react-dom/client";
import "@cafebot/ui/globals.css";
import { App } from "./App";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("Falta el elemento #root");
}

createRoot(container).render(
  <RegistryProvider>
    <App />
  </RegistryProvider>,
);
