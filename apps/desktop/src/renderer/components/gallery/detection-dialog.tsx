import type { Foto } from "../../lib/backend";
import { formatPercent, severityLabel } from "../../lib/format";
import { useMessages } from "../../lib/use-language";
import { usePhotoUrl } from "../../lib/use-photo";
import { MessageCircleIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cafebot/ui/components/dialog";

interface DetectionDialogProps {
  readonly foto: Foto;
  readonly onClose: () => void;
  readonly onGoToChat: () => void;
}

export function DetectionDialog({ foto, onClose, onGoToChat }: DetectionDialogProps) {
  const m = useMessages();
  const imageUrl = usePhotoUrl(foto.id);
  const confidence = Math.round(foto.confidence * 100);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{foto.disease_name}</DialogTitle>
          <DialogDescription>
            {m.galleryDialogDescription({
              fileName: foto.nombre_archivo,
              confidence: formatPercent(foto.confidence),
              severity: severityLabel(foto.severity),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-slim text-sm">
          <img
            src={imageUrl}
            alt={foto.nombre_archivo}
            className="w-full rounded-xl border border-border object-cover"
          />
          <div>
            <p className="mb-1 font-medium">{m.galleryDescription()}</p>
            <p className="text-muted-foreground">{foto.description}</p>
          </div>
          <div>
            <p className="mb-1 font-medium">{m.galleryRecommendation()}</p>
            <p className="text-muted-foreground">{foto.advice}</p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-medium">{m.galleryConfidence()}</p>
              <p className="text-muted-foreground">{confidence}%</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0">
          <Button onClick={onGoToChat}>
            <MessageCircleIcon className="size-4" />
            {m.galleryGoToChat()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
