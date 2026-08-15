import { Trash2Icon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { SidebarTrigger } from "@cafebot/ui/components/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@cafebot/ui/components/tooltip";
import { useChat } from "../../lib/use-chat";
import { useGallery } from "../../lib/use-gallery";
import { ChatInput } from "./chat-input";
import { MessageList } from "./message-list";

export function ChatView() {
  const { messages, isWaiting, sendMessage, resetChat } = useChat();
  const { isAnalyzing, analyzeFile } = useGallery();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger aria-label="Colapsar barra lateral" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Chat</h1>
            <p className="text-sm text-muted-foreground">
              Asistente para la detección de enfermedades del cafeto
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={isWaiting}
                onClick={resetChat}
                aria-label="Nueva conversación"
              >
                <Trash2Icon className="size-4" />
              </Button>
            }
          />
          <TooltipContent>Nueva conversación</TooltipContent>
        </Tooltip>
      </header>
      <MessageList messages={messages} isWaiting={isWaiting} />
      <ChatInput
        onSend={sendMessage}
        onAttach={analyzeFile}
        disabled={isWaiting}
        analyzing={isAnalyzing}
      />
    </div>
  );
}
