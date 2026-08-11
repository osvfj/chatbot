import { CoffeeIcon } from "lucide-react";
import { Message, MessageAvatar, MessageContent } from "@cafebot/ui/components/message";
import { Bubble, BubbleContent, BubbleGroup } from "@cafebot/ui/components/bubble";

export function TypingIndicator() {
  return (
    <Message align="start">
      <MessageAvatar className="size-8 bg-primary text-primary-foreground">
        <CoffeeIcon className="size-4" />
      </MessageAvatar>
      <MessageContent>
        <BubbleGroup>
          <Bubble variant="tinted">
            <BubbleContent className="flex items-center gap-1 py-3" aria-label="Escribiendo…">
              <span className="size-1.5 animate-bounce rounded-full bg-foreground/70 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-foreground/70 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-foreground/70 [animation-delay:300ms]" />
            </BubbleContent>
          </Bubble>
        </BubbleGroup>
      </MessageContent>
    </Message>
  );
}
