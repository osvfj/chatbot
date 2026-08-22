import { useEffect, useState } from "react";
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
import { dialogueQuestionAtom, learnerDecisionAtom } from "../../lib/streaming";
import { chatModeAtom, persistChatMode } from "../../lib/zen-settings";
import { api } from "../../lib/backend";
import { ChatInput } from "./chat-input";
import { InspectorPanel } from "./inspector-panel";
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
  const [dialogueQuestion, setDialogueQuestion] = useAtom(dialogueQuestionAtom);
  const [learnerDecision, setLearnerDecision] = useAtom(learnerDecisionAtom);
  const [chatMode, setChatMode] = useAtom(chatModeAtom);
  const [inspectorAbierto, setInspectorAbierto] = useState(false);
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
      sendReply(
        chatId,
        trimmed.length > 0 ? trimmed : m.chatPhotoPrompt(),
        fotoId,
        undefined,
        undefined,
        chatMode,
      );
    } else {
      sendReply(chatId, trimmed, undefined, undefined, undefined, chatMode);
    }
  };

  const handleDialogueAnswer = (answer: {
    readonly optionId?: string;
    readonly freeText: string;
    readonly label: string;
  }): void => {
    if (conversationId === undefined) return;
    appendUserMessage(answer.label);
    setDialogueQuestion(null);
    sendReply(conversationId, answer.label, undefined, answer.optionId, answer.freeText, chatMode);
  };

  const handleDialoguePhoto = async (file: File, description: string): Promise<void> => {
    if (conversationId === undefined) return;
    const foto = await uploadPhoto.mutateAsync({ chatId: conversationId, file });
    const dataUrl = await readAsDataUrl(file);
    appendUserMessage(description, [{ name: file.name, sizeBytes: file.size, dataUrl }]);
    setDialogueQuestion(null);
    sendReply(conversationId, description, foto.id, undefined, description, chatMode);
  };

  const handleRate = (reward: number): void => {
    if (learnerDecision === null) return;
    void api.rate({ ...learnerDecision, reward }).then(() => setLearnerDecision(null));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger aria-label={m.sidebarCollapse()} />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{m.chatHeader()}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{m.chatSubtitle()}</p>
              <select
                value={chatMode}
                onChange={(event) => {
                  const next = event.target.value === "llm" ? "llm" : "classical";
                  setChatMode(next);
                  persistChatMode(next);
                }}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                aria-label="Modo del chatbot"
              >
                <option value="classical">Clásico</option>
                <option value="llm">LLM</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={inspectorAbierto ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setInspectorAbierto((abierto) => !abierto)}
            aria-label="Inspector del sistema"
          >
            Inspector
          </Button>
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
        </div>
      </header>
      {inspectorAbierto && <InspectorPanel />}
      <MessageList
        messages={messages}
        isWaiting={busy}
        streaming={streaming}
        dialogueQuestion={dialogueQuestion}
        onDialogueAnswer={handleDialogueAnswer}
        onDialoguePhoto={(file, description) => void handleDialoguePhoto(file, description)}
        learnerDecision={learnerDecision}
        onRate={handleRate}
      />
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
