import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useAtomValue } from "@effect/atom-react";
import { PaperclipIcon, SendIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { Spinner } from "@cafebot/ui/components/spinner";
import { Textarea } from "@cafebot/ui/components/textarea";
import { suggestionsAtom } from "../../lib/atoms";

interface ChatInputProps {
  readonly onSend: (content: string) => Promise<void>;
  readonly onAttach: (file: File) => Promise<void>;
  readonly disabled: boolean;
  readonly analyzing: boolean;
}

export function ChatInput({ onSend, onAttach, disabled, analyzing }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachBusy, setAttachBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestions = useAtomValue(suggestionsAtom);

  const busy = disabled || attachBusy || analyzing;

  const submit = (content: string): void => {
    const trimmed = content.trim();
    if (trimmed.length === 0 || busy) {
      return;
    }
    setValue("");
    void onSend(trimmed);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(value);
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined || busy) {
      return;
    }
    setAttachBusy(true);
    try {
      await onAttach(file);
    } finally {
      setAttachBusy(false);
    }
  };

  return (
    <div className="border-t border-border p-4">
      {suggestions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => submit(suggestion)}
              className="rounded-full"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5 rounded-2xl border border-input bg-card p-1.5 transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <Button
          variant="ghost"
          size="icon-lg"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adjuntar imagen"
        >
          {attachBusy || analyzing ? (
            <Spinner className="size-4" />
          ) : (
            <PaperclipIcon className="size-4" />
          )}
        </Button>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe un síntoma o pregunta sobre el café…"
          className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
          rows={1}
        />
        <Button
          size="icon-lg"
          disabled={busy || value.trim().length === 0}
          onClick={() => submit(value)}
          aria-label="Enviar mensaje"
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
