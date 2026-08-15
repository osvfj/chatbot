import { ImagesIcon } from "lucide-react";
import { Predicate } from "effect";
import { Badge } from "@cafebot/ui/components/badge";
import type { Album } from "../../lib/use-gallery";
import { useMessages } from "../../lib/use-language";

interface AlbumCardProps {
  readonly album: Album;
  readonly onOpen: () => void;
}

export function AlbumCard({ album, onOpen }: AlbumCardProps) {
  const m = useMessages();
  const first = album.photos[0];
  const coverUrl = Predicate.isUndefined(first) ? "" : first.imageUrl;

  return (
    <div className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <img
        src={coverUrl}
        alt={album.title}
        className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10"
        aria-label={album.title}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10 text-white">
        <p className="truncate text-sm font-semibold">{album.title}</p>
        <p className="text-xs text-white/80">{m.albumPhotos({ count: album.photos.length })}</p>
      </div>
      <Badge className="absolute top-2 left-2 z-10 gap-1 bg-background/80 backdrop-blur-sm">
        <ImagesIcon className="size-3" />
        {album.photos.length}
      </Badge>
    </div>
  );
}
