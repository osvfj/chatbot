import { ChatMessage } from "@cafebot/sdk";
import { Predicate } from "effect";
import { CoffeeIcon } from "lucide-react";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@cafebot/ui/components/attachment";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from "@cafebot/ui/components/message";
import { Bubble, BubbleContent, BubbleGroup } from "@cafebot/ui/components/bubble";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@cafebot/ui/components/message-scroller";
import { welcomeMessage } from "../../lib/atoms";
import { type DialogueQuestion, type PendingReply } from "../../lib/streaming";
import { formatBytes, formatTime } from "../../lib/format";
import { useMessages } from "../../lib/use-language";
import { Markdown } from "./markdown";
import { StreamingReply } from "./streaming-reply";
import { TypingIndicator } from "./typing-indicator";
import { DialogueQuestionCard } from "./dialogue-question-card";

interface MessageListProps {
  readonly messages: ReadonlyArray<InstanceType<typeof ChatMessage>>;
  readonly isWaiting: boolean;
  readonly streaming?: PendingReply | null | undefined;
  readonly dialogueQuestion?: DialogueQuestion | null | undefined;
  readonly onDialogueAnswer?:
    | ((answer: {
        readonly optionId?: string;
        readonly freeText: string;
        readonly label: string;
      }) => void)
    | undefined;
}

export function MessageList({
  messages,
  isWaiting,
  streaming,
  dialogueQuestion,
  onDialogueAnswer,
}: MessageListProps) {
  const m = useMessages();
  return (
    <MessageScrollerProvider>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="px-6 py-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const attachments = Predicate.isUndefined(message.attachments)
                ? []
                : message.attachments;
              return (
                <MessageScrollerItem key={message.id} scrollAnchor={index === messages.length - 1}>
                  <MessageGroup>
                    <Message
                      align={isUser ? "end" : "start"}
                      data-variant={isUser ? undefined : "ghost"}
                    >
                      {!isUser && (
                        <MessageAvatar className="size-8 bg-primary text-primary-foreground">
                          <CoffeeIcon className="size-4" />
                        </MessageAvatar>
                      )}
                      <MessageContent>
                        <BubbleGroup>
                          {attachments.length > 0 && (
                            <AttachmentGroup className="justify-end">
                              {attachments.map((attachment) => (
                                <Attachment key={attachment.name} size="lg">
                                  <AttachmentMedia variant="image">
                                    <img src={attachment.dataUrl} alt={attachment.name} />
                                  </AttachmentMedia>
                                  <AttachmentContent>
                                    <AttachmentTitle>{attachment.name}</AttachmentTitle>
                                    <AttachmentDescription>
                                      {formatBytes(attachment.sizeBytes)}
                                    </AttachmentDescription>
                                  </AttachmentContent>
                                </Attachment>
                              ))}
                            </AttachmentGroup>
                          )}
                          {message.content.length > 0 && (
                            <Bubble variant={isUser ? "default" : "ghost"}>
                              <BubbleContent>
                                {isUser || message.id === welcomeMessage.id ? (
                                  message.id === welcomeMessage.id ? (
                                    m.chatWelcome()
                                  ) : (
                                    message.content
                                  )
                                ) : (
                                  <Markdown text={message.content} />
                                )}
                              </BubbleContent>
                            </Bubble>
                          )}
                        </BubbleGroup>
                        <MessageFooter>{formatTime(message.sentAt)}</MessageFooter>
                      </MessageContent>
                    </Message>
                  </MessageGroup>
                </MessageScrollerItem>
              );
            })}
            {streaming !== undefined && streaming !== null && (
              <StreamingReply key={streaming.key} />
            )}
            {dialogueQuestion !== undefined &&
              dialogueQuestion !== null &&
              onDialogueAnswer !== undefined && (
                <MessageScrollerItem>
                  <DialogueQuestionCard
                    question={dialogueQuestion}
                    disabled={isWaiting}
                    onSubmit={onDialogueAnswer}
                  />
                </MessageScrollerItem>
              )}
            {isWaiting && (streaming === undefined || streaming === null) && (
              <MessageScrollerItem>
                <TypingIndicator />
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
