import { Marker, MarkerContent, MarkerIcon } from "@cafebot/ui/components/marker";
import { Spinner } from "@cafebot/ui/components/spinner";
import { useMessages } from "../../lib/use-language";

export function TypingIndicator() {
  const m = useMessages();
  return (
    <Marker>
      <MarkerIcon>
        <Spinner className="size-3.5" />
      </MarkerIcon>
      <MarkerContent className="shimmer">{m.chatTyping()}</MarkerContent>
    </Marker>
  );
}
