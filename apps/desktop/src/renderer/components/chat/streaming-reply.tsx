import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import { CoffeeIcon } from "lucide-react";
import { Bubble, BubbleContent, BubbleGroup } from "@cafebot/ui/components/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@cafebot/ui/components/message";
import { MessageScrollerItem } from "@cafebot/ui/components/message-scroller";
import { streamingResultAtom } from "../../lib/streaming";
import { Markdown } from "./markdown";
import { TypingIndicator } from "./typing-indicator";

export function StreamingReply() {
  const result = useAtomValue(streamingResultAtom);
  const text = AsyncResult.isSuccess(result)
    ? result.value.items.map((item) => item.delta).join("")
    : "";

  return (
    <MessageScrollerItem>
      <MessageGroup>
        <Message align="start" data-variant="ghost">
          <MessageAvatar className="size-8 bg-primary text-primary-foreground">
            <CoffeeIcon className="size-4" />
          </MessageAvatar>
          <MessageContent>
            <BubbleGroup>
              {text.length > 0 ? (
                <Bubble variant="ghost">
                  <BubbleContent>
                    <Markdown text={text} />
                  </BubbleContent>
                </Bubble>
              ) : (
                <TypingIndicator />
              )}
            </BubbleGroup>
          </MessageContent>
        </Message>
      </MessageGroup>
    </MessageScrollerItem>
  );
}
