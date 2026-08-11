import { ChatMessage } from "@cafebot/sdk";
import { CoffeeIcon } from "lucide-react";
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
import { formatTime } from "../../lib/format";
import { TypingIndicator } from "./typing-indicator";

interface MessageListProps {
  readonly messages: ReadonlyArray<InstanceType<typeof ChatMessage>>;
  readonly isWaiting: boolean;
}

export function MessageList({ messages, isWaiting }: MessageListProps) {
  return (
    <MessageScrollerProvider>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {messages.map((message, index) => (
              <MessageScrollerItem key={message.id} scrollAnchor={index === messages.length - 1}>
                <MessageGroup>
                  <Message align={message.role === "user" ? "end" : "start"}>
                    {message.role === "assistant" && (
                      <MessageAvatar className="size-8 bg-primary text-primary-foreground">
                        <CoffeeIcon className="size-4" />
                      </MessageAvatar>
                    )}
                    <MessageContent>
                      <BubbleGroup>
                        <Bubble variant={message.role === "user" ? "default" : "tinted"}>
                          <BubbleContent>{message.content}</BubbleContent>
                        </Bubble>
                      </BubbleGroup>
                      <MessageFooter>{formatTime(message.sentAt)}</MessageFooter>
                    </MessageContent>
                  </Message>
                </MessageGroup>
              </MessageScrollerItem>
            ))}
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
