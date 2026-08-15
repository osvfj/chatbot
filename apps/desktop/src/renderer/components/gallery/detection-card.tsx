import type { DetectionCard as DetectionCardModel } from "../../lib/atoms";
import { formatPercent, severityLabel } from "../../lib/format";
import { useMessages } from "../../lib/use-language";
import { Equal } from "effect";
import { Badge } from "@cafebot/ui/components/badge";
import { Button } from "@cafebot/ui/components/button";
import { Trash2Icon } from "lucide-react";

interface DetectionCardProps {
  readonly card: DetectionCardModel;
  readonly onOpen: () => void;
  readonly onRemove: () => void;
}

export function DetectionCard({ card, onOpen, onRemove }: DetectionCardProps) {
  const m = useMessages();
  const { detection } = card;
  const severity = detection.disease.severity;
  const badgeVariant = Equal.equals("high")(severity)
    ? ("destructive" as const)
    : Equal.equals("medium")(severity)
      ? ("default" as const)
      : ("secondary" as const);

  return (
    <div className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <img
        src={card.imageUrl}
        alt={detection.fileName}
        className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-10"
        aria-label={m.galleryViewDetail({ disease: detection.disease.name })}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10 text-white">
        <p className="truncate text-sm font-semibold">{detection.disease.name}</p>
        <p className="text-xs text-white/80">
          {m.detectionConfidence({ percent: formatPercent(detection.confidence) })}
        </p>
      </div>
      <Badge
        variant={badgeVariant}
        className="absolute left-2 top-2 z-10 bg-background/80 backdrop-blur-sm"
      >
        {severityLabel(severity)}
      </Badge>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        aria-label={m.galleryRemove()}
        className="absolute right-2 top-2 z-20 bg-black/30 text-white hover:bg-black/50 hover:text-white"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}
