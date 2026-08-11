import { Toaster } from "sonner";
import { TooltipProvider } from "@cafebot/ui/components/tooltip";
import { AppShell } from "./components/layout/app-shell";

export function App() {
  return (
    <TooltipProvider>
      <AppShell />
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );
}
