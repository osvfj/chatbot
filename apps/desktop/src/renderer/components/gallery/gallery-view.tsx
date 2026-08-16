import { useNavigate } from "@tanstack/react-router";
import { ImageOffIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@cafebot/ui/components/empty";
import { SidebarTrigger } from "@cafebot/ui/components/sidebar";
import { Spinner } from "@cafebot/ui/components/spinner";
import { useAlbums } from "../../lib/use-gallery";
import { useMessages } from "../../lib/use-language";
import { AlbumCard } from "./album-card";

export function GalleryView() {
  const m = useMessages();
  const navigate = useNavigate();
  const { data, isFetching } = useAlbums();
  const albums = data?.albums ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger aria-label={m.sidebarCollapse()} />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{m.galleryHeader()}</h1>
            <p className="text-sm text-muted-foreground">
              {m.gallerySubtitle({ count: albums.length })}
            </p>
          </div>
        </div>
        {isFetching && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {m.galleryAnalyzing()}
          </span>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-slim p-6">
        {albums.length === 0 ? (
          <Empty className="h-full border-2 border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageOffIcon className="size-4" />
              </EmptyMedia>
              <EmptyTitle>{m.galleryEmptyTitle()}</EmptyTitle>
              <EmptyDescription>{m.galleryEmptyDescription()}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onOpen={() => navigate({ to: "/gallery/$uuid", params: { uuid: album.chat_id } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
