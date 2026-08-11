import { useAtomValue } from "@effect/atom-react";
import { activeSectionAtom } from "../../lib/atoms";
import { ChatView } from "../chat/chat-view";
import { GalleryView } from "../gallery/gallery-view";
import { Sidebar } from "./sidebar";

export function AppShell() {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background text-foreground">
      <Sidebar />
      <MainSection />
    </div>
  );
}

function MainSection() {
  const section = useAtomValue(activeSectionAtom);
  return (
    <main className="flex min-w-0 flex-1 flex-col">
      {section === "chat" ? <ChatView /> : <GalleryView />}
    </main>
  );
}
