import { useState } from "react";
import { Predicate } from "effect";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon, MessageCircleIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { useAlbums, useAlbumPhotos } from "../../lib/use-gallery";
import { useMessages } from "../../lib/use-language";
import type { Foto } from "../../lib/backend";
import { DetectionCard } from "./detection-card";
import { DetectionDialog } from "./detection-dialog";

interface AlbumViewProps {
  readonly conversationUuid: string;
}

export function AlbumView({ conversationUuid }: AlbumViewProps) {
  const m = useMessages();
  const navigate = useNavigate();
  const { data } = useAlbums();
  const album = data?.albums.find((item) => item.chat_id === conversationUuid);
  const [selected, setSelected] = useState<Foto | null>(null);
  const photosQuery = useAlbumPhotos(album?.id ?? "");

  if (Predicate.isUndefined(album)) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6">
        <p className="text-sm text-muted-foreground">{m.galleryEmptyTitle()}</p>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/gallery" })}>
          <ChevronLeftIcon />
          {m.chatBack()}
        </Button>
      </div>
    );
  }

  const photos = photosQuery.data?.photos ?? [];

  const goToChat = (): void => {
    navigate({ to: "/chat/$uuid", params: { uuid: conversationUuid } });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate({ to: "/gallery" })}
            aria-label={m.chatBack()}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{album.titulo}</h1>
            <p className="text-sm text-muted-foreground">
              {m.albumPhotos({ count: photos.length })}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={goToChat}>
          <MessageCircleIcon className="size-4" />
          {m.galleryGoToChat()}
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim p-6">
        <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
          {photos.map((foto) => (
            <DetectionCard key={foto.id} foto={foto} onOpen={() => setSelected(foto)} />
          ))}
        </div>
      </div>
      {!Predicate.isNull(selected) && (
        <DetectionDialog foto={selected} onClose={() => setSelected(null)} onGoToChat={goToChat} />
      )}
    </div>
  );
}
