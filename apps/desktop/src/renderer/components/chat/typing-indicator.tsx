import { Marker, MarkerContent, MarkerIcon } from "@cafebot/ui/components/marker";
import { Spinner } from "@cafebot/ui/components/spinner";

export function TypingIndicator() {
  return (
    <Marker>
      <MarkerIcon>
        <Spinner className="size-3.5" />
      </MarkerIcon>
      <MarkerContent className="shimmer">Cafebot está escribiendo…</MarkerContent>
    </Marker>
  );
}
