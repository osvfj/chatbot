import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useAtomValue } from "@effect/atom-react";
import { CameraIcon, FileImageIcon, PaperclipIcon, SendIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@cafebot/ui/components/popover";
import { Spinner } from "@cafebot/ui/components/spinner";
import { Textarea } from "@cafebot/ui/components/textarea";
import { suggestionsAtom } from "../../lib/atoms";
import { CameraCapture } from "./camera-capture";

interface ChatInputProps {
  readonly onSend: (content: string) => Promise<void>;
  readonly onAttach: (file: File) => Promise<void>;
  readonly disabled: boolean;
  readonly analyzing: boolean;
}

export function ChatInput({ onSend, onAttach, disabled, analyzing }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachBusy, setAttachBusy] = useState(false);
  const [attachView, setAttachView] = useState<"menu" | "camera">("menu");
  const [popoverOpen, setPopoverOpen] = useState(false);
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

  const handleOpenChange = (open: boolean): void => {
    setPopoverOpen(open);
    if (open) {
      setAttachView("menu");
    }
  };

  const openFilePicker = (): void => {
    setPopoverOpen(false);
    fileInputRef.current?.click();
  };

  const handlePhoto = (file: File): void => {
    setPopoverOpen(false);
    void onAttach(file);
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
    <div className="border-t border-border p-5">
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
      <div className="relative rounded-[2rem] border-2 border-border bg-card shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/30">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe un síntoma o pregunta sobre el café…"
          className="max-h-64 min-h-24 w-full resize-none border-0 bg-transparent pt-4 pr-14 pb-16 pl-8 text-base shadow-none scrollbar-slim focus-visible:ring-0"
          rows={2}
        />
        <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                className="absolute bottom-3 left-3 size-10 rounded-full"
                aria-label="Adjuntar imagen"
              />
            }
          >
            {attachBusy || analyzing ? (
              <Spinner className="size-5" />
            ) : (
              <PaperclipIcon className="size-5" />
            )}
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-64 rounded-2xl p-1.5">
            {attachView === "menu" ? (
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openFilePicker}
                  className="justify-start gap-2 rounded-lg px-2"
                >
                  <FileImageIcon className="size-4" />
                  Seleccionar archivo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttachView("camera")}
                  className="justify-start gap-2 rounded-lg px-2"
                >
                  <CameraIcon className="size-4" />
                  Tomar foto
                </Button>
              </div>
            ) : (
              <CameraCapture onCapture={handlePhoto} onBack={() => setAttachView("menu")} />
            )}
          </PopoverContent>
        </Popover>
        <Button
          size="icon"
          disabled={busy || value.trim().length === 0}
          onClick={() => submit(value)}
          aria-label="Enviar mensaje"
          className="absolute right-3 bottom-3 size-10 rounded-full"
        >
          <SendIcon className="size-5 -translate-x-px translate-y-px" />
        </Button>
      </div>
    </div>
  );
}
