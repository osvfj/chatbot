import { useEffect } from "react";
import { MessageSquarePlusIcon } from "lucide-react";
import { DateTime, Predicate } from "effect";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "@effect/atom-react";
import { ChatMessage } from "@cafebot/sdk";
import { Button } from "@cafebot/ui/components/button";
import { SidebarTrigger } from "@cafebot/ui/components/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@cafebot/ui/components/tooltip";
import { useChat } from "../../lib/use-chat";
import { useUploadPhoto } from "../../lib/use-gallery";
import { useMessages } from "../../lib/use-language";
import { conversationMetaAtom, conversationUuidAtom, messagesAtom } from "../../lib/atoms";
import { api } from "../../lib/backend";
import { ChatInput } from "./chat-input";
import { MessageList } from "./message-list";

interface ChatViewProps {
  readonly conversationId?: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const m = useMessages();
  const navigate = useNavigate();
  const [, setConversationUuid] = useAtom(conversationUuidAtom);
  const [, setConversationMeta] = useAtom(conversationMetaAtom);
  const {
    messages,
    isWaiting,
    appendUserMessage,
    sendReply,
    resetChat,
    streaming,
    clearStreaming,
  } = useChat();
  const uploadPhoto = useUploadPhoto();
  const [, setMessages] = useAtom(messagesAtom);
  const busy = isWaiting || uploadPhoto.isPending;

  const history = useQuery({
    queryKey: ["messages", conversationId ?? "none"],
    queryFn: () => api.listMessages(conversationId ?? ""),
    enabled: conversationId !== undefined,
  });

  useEffect(() => {
    if (conversationId === undefined || history.data === undefined) {
      return;
    }
    setMessages(
      history.data.messages.map(
        (message) =>
          new ChatMessage({
            id: message.id,
            role: message.rol,
            content: message.contenido,
            sentAt: DateTime.fromDateUnsafe(new Date(message.creado_en)),
          }),
      ),
    );
  }, [history.data, conversationId, setMessages]);

  const ensureChat = async (title: string): Promise<string> => {
    if (conversationId !== undefined) {
      return conversationId;
    }
    const chat = await api.createChat(title);
    setConversationUuid(chat.id);
    setConversationMeta((current) => {
      const next = new Map(current);
      next.set(chat.id, { title, createdAt: Date.now() });
      return next;
    });
    navigate({ to: "/chat/$uuid", params: { uuid: chat.id } });
    return chat.id;
  };

  const handleNewConversation = (): void => {
    setConversationUuid(null);
    resetChat();
    navigate({ to: "/chat" });
  };

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (Predicate.isString(reader.result)) {
          resolve(reader.result);
        } else {
          reject(new Error("No se pudo leer la imagen"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleSend = async (content: string, attachments: ReadonlyArray<File>): Promise<void> => {
    const trimmed = content.trim();
    if (trimmed.length === 0 && attachments.length === 0) {
      return;
    }
    const first = attachments[0];
    const chatId = await ensureChat(
      trimmed.length > 0 ? trimmed : Predicate.isNotUndefined(first) ? first.name : "📷",
    );
    const attachmentData = await Promise.all(
      attachments.map(async (file) => ({
        name: file.name,
        sizeBytes: file.size,
        dataUrl: await readAsDataUrl(file),
      })),
    );
    appendUserMessage(trimmed, attachmentData);
    if (attachments.length > 0) {
      let fotoId: string | undefined;
      for (const file of attachments) {
        const foto = await uploadPhoto.mutateAsync({ chatId, file });
        fotoId = foto.id;
      }
      sendReply(chatId, trimmed.length > 0 ? trimmed : m.chatPhotoPrompt(), fotoId);
    } else {
      sendReply(chatId, trimmed);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger aria-label={m.sidebarCollapse()} />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{m.chatHeader()}</h1>
            <p className="text-sm text-muted-foreground">{m.chatSubtitle()}</p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                onClick={handleNewConversation}
                aria-label={m.tooltipNewConversation()}
              >
                <MessageSquarePlusIcon className="size-4" />
              </Button>
            }
          />
          <TooltipContent>{m.tooltipNewConversation()}</TooltipContent>
        </Tooltip>
      </header>
      <MessageList messages={messages} isWaiting={busy} streaming={streaming} />
      <ChatInput
        onSend={handleSend}
        disabled={busy}
        analyzing={uploadPhoto.isPending}
        streaming={streaming !== null}
        onStop={clearStreaming}
      />
    </div>
  );
}
