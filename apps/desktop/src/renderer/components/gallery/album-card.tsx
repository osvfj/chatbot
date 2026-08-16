import { ImagesIcon } from "lucide-react";
import { Badge } from "@cafebot/ui/components/badge";
import type { Album } from "../../lib/backend";
import { useMessages } from "../../lib/use-language";
import { usePhotoUrl } from "../../lib/use-photo";

interface AlbumCardProps {
  readonly album: Album;
  readonly onOpen: () => void;
}

export function AlbumCard({ album, onOpen }: AlbumCardProps) {
  const m = useMessages();
  const coverUrl = usePhotoUrl(album.preview_foto_id ?? undefined);

  return (
    <div className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <img
        src={coverUrl}
        alt={album.titulo}
        className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10"
        aria-label={album.titulo}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10 text-white">
        <p className="truncate text-sm font-semibold">{album.titulo}</p>
        <p className="text-xs text-white/80">{m.albumPhotos({ count: album.foto_count })}</p>
      </div>
      <Badge className="absolute left-2 top-2 z-10 gap-1 bg-background/80 backdrop-blur-sm">
        <ImagesIcon className="size-3" />
        {album.foto_count}
      </Badge>
    </div>
  );
}
