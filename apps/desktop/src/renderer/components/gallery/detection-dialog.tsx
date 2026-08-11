import type { DetectionCard as DetectionCardModel } from "../../lib/atoms";
import { formatPercent, severityLabel } from "../../lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@cafebot/ui/components/dialog";

interface DetectionDialogProps {
  readonly card: DetectionCardModel;
  readonly onClose: () => void;
}

export function DetectionDialog({ card, onClose }: DetectionDialogProps) {
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{detection.disease.name}</DialogTitle>
          <DialogDescription>
            {detection.fileName} · {formatPercent(detection.confidence)} de confianza ·{" "}
            {severityLabel(detection.disease.severity)}
          </DialogDescription>
        </DialogHeader>
        <img
          src={card.imageUrl}
          alt={`Foto ${detection.fileName}`}
          className="w-full rounded-xl border border-border object-cover"
        />
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-1 font-medium">Descripción</p>
            <p className="text-muted-foreground">{detection.disease.description}</p>
          </div>
          <div>
            <p className="mb-1 font-medium">Recomendación</p>
            <p className="text-muted-foreground">{detection.disease.advice}</p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-medium">Confianza</p>
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
      </DialogContent>
    </Dialog>
  );
}
