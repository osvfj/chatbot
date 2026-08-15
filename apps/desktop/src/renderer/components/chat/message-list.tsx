import { ChatMessage } from "@cafebot/sdk";
import { Equal } from "effect";
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
import { formatBytes, formatTime } from "../../lib/format";
import { useMessages } from "../../lib/use-language";
import { TypingIndicator } from "./typing-indicator";

interface MessageListProps {
  readonly messages: ReadonlyArray<InstanceType<typeof ChatMessage>>;
  readonly isWaiting: boolean;
}

export function MessageList({ messages, isWaiting }: MessageListProps) {
  const m = useMessages();
  return (
    <MessageScrollerProvider>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="px-6 py-6">
            {messages.map((message, index) => {
              const isUser = Equal.equals("user")(message.role);
              const attachments = message.attachments ?? [];
              return (
                <MessageScrollerItem
                  key={message.id}
                  scrollAnchor={Equal.equals(index)(messages.length - 1)}
                >
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
                                {Equal.equals(message.id)(welcomeMessage.id)
                                  ? m.chatWelcome()
                                  : message.content}
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
            {isWaiting && (
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
