import { useState } from "react";
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
import { useGallery } from "../../lib/use-gallery";
import type { DetectionCard as DetectionCardModel } from "../../lib/atoms";
import { DetectionCard } from "./detection-card";
import { DetectionDialog } from "./detection-dialog";

export function GalleryView() {
  const { detections, isAnalyzing, removeDetection } = useGallery();
  const [selected, setSelected] = useState<DetectionCardModel | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger aria-label="Colapsar barra lateral" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Galería</h1>
            <p className="text-sm text-muted-foreground">Fotos analizadas · {detections.length}</p>
          </div>
        </div>
        {isAnalyzing && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Analizando…
          </span>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {detections.length === 0 ? (
          <Empty className="h-full border-2 border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImageOffIcon className="size-4" />
              </EmptyMedia>
              <EmptyTitle>Sin análisis todavía</EmptyTitle>
              <EmptyDescription>
                Sube una foto de una hoja desde el chat y aparecerá aquí con su diagnóstico y nivel
                de confianza.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
            {detections.map((card) => (
              <DetectionCard
                key={card.detection.id}
                card={card}
                onOpen={() => setSelected(card)}
                onRemove={() => removeDetection(card.detection.id)}
              />
            ))}
          </div>
        )}
      </div>
      {selected !== null && <DetectionDialog card={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
