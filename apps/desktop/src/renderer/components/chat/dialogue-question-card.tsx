import { useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { Textarea } from "@cafebot/ui/components/textarea";
import type { DialogueQuestion } from "../../lib/streaming";

interface DialogueQuestionCardProps {
  readonly question: DialogueQuestion;
  readonly disabled: boolean;
  readonly onSubmit: (answer: {
    readonly optionId?: string;
    readonly freeText: string;
    readonly label: string;
  }) => void;
}

export function DialogueQuestionCard({ question, disabled, onSubmit }: DialogueQuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
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
