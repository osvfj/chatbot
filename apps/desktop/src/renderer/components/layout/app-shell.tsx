import { useAtomValue } from "@effect/atom-react";
import { Equal } from "effect";
import { SidebarInset, SidebarProvider } from "@cafebot/ui/components/sidebar";
import { activeSectionAtom } from "../../lib/atoms";
import { ChatView } from "../chat/chat-view";
import { GalleryView } from "../gallery/gallery-view";
import { AppSidebar } from "./sidebar";

export function AppShell() {
  const section = useAtomValue(activeSectionAtom);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        {Equal.equals("chat")(section) ? <ChatView /> : <GalleryView />}
      </SidebarInset>
    </SidebarProvider>
  );
}
