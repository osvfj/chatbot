import type { DetectionCard as DetectionCardModel } from "../../lib/atoms";
import { formatPercent, severityLabel } from "../../lib/format";
import { useMessages } from "../../lib/use-language";
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
  readonly card: DetectionCardModel;
  readonly onClose: () => void;
  readonly onGoToChat: () => void;
}

export function DetectionDialog({ card, onClose, onGoToChat }: DetectionDialogProps) {
  const m = useMessages();
  const { detection } = card;
  const confidence = Math.round(detection.confidence * 100);

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
          <DialogTitle>{detection.disease.name}</DialogTitle>
          <DialogDescription>
            {m.galleryDialogDescription({
              fileName: detection.fileName,
              confidence: formatPercent(detection.confidence),
              severity: severityLabel(detection.disease.severity),
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-slim text-sm">
          <img
            src={card.imageUrl}
            alt={detection.fileName}
            className="w-full rounded-xl border border-border object-cover"
          />
          <div>
            <p className="mb-1 font-medium">{m.galleryDescription()}</p>
            <p className="text-muted-foreground">{detection.disease.description}</p>
          </div>
          <div>
            <p className="mb-1 font-medium">{m.galleryRecommendation()}</p>
            <p className="text-muted-foreground">{detection.disease.advice}</p>
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
