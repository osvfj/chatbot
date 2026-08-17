import { useRef, useState, type ChangeEvent } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { Textarea } from "@cafebot/ui/components/textarea";
import type { DialogueQuestion } from "../../lib/streaming";
import { CameraCapture } from "./camera-capture";

interface DialogueQuestionCardProps {
  readonly question: DialogueQuestion;
  readonly disabled: boolean;
  readonly onSubmit: (answer: {
    readonly optionId?: string;
    readonly freeText: string;
    readonly label: string;
  }) => void;
  readonly onPhoto?: ((file: File, description: string) => void) | undefined;
}

export function DialogueQuestionCard({
  question,
  disabled,
  onSubmit,
  onPhoto,
}: DialogueQuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoDescription, setPhotoDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = selected !== null || freeText.trim().length > 0;

  const submit = (): void => {
    if (!canSubmit || disabled) return;
    const option = question.options.find((item) => item.id === selected);
    const label = [option?.label, freeText.trim()].filter(Boolean).join(". ");
    onSubmit({
      ...(selected === null ? {} : { optionId: selected }),
      freeText: freeText.trim(),
      label,
    });
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file !== undefined) onPhoto?.(file, photoDescription.trim());
  };

  if (question.id === "photo_followup" && onPhoto !== undefined) {
    return (
      <div className="mt-3 w-full max-w-xl rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium">{question.text}</p>
        {cameraOpen ? (
          <CameraCapture
            onCapture={(file) => {
              setCameraOpen(false);
              onPhoto(file, photoDescription.trim());
            }}
            onBack={() => setCameraOpen(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Textarea
              value={photoDescription}
              onChange={(event) => setPhotoDescription(event.target.value)}
              disabled={disabled}
              placeholder="Describe qué observas en esta nueva fotografía..."
              className="mb-3 min-h-20 w-full resize-none"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              type="button"
              disabled={disabled || photoDescription.trim().length === 0}
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar fotografía
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || photoDescription.trim().length === 0}
              onClick={() => setCameraOpen(true)}
            >
              Abrir cámara
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 w-full max-w-xl rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium">{question.text}</p>
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={selected === option.id ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => setSelected(option.id)}
            className="rounded-full"
          >
            {option.label}
          </Button>
        ))}
      </div>
      {question.allow_free_text && (
        <Textarea
          value={freeText}
          onChange={(event) => setFreeText(event.target.value)}
          disabled={disabled}
          placeholder="Describe algo diferente..."
          className="mt-3 min-h-20 resize-none"
        />
      )}
      <Button
        type="button"
        size="sm"
        disabled={!canSubmit || disabled}
        onClick={submit}
        className="mt-3 gap-2"
      >
        Responder
        <SendIcon className="size-3.5" />
      </Button>
    </div>
  );
}
