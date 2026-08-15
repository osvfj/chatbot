import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useAtomValue } from "@effect/atom-react";
import { Equal } from "effect";
import { CameraIcon, FileImageIcon, PaperclipIcon, SendIcon, XIcon } from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@cafebot/ui/components/attachment";
import { Button } from "@cafebot/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@cafebot/ui/components/popover";
import { Spinner } from "@cafebot/ui/components/spinner";
import { Textarea } from "@cafebot/ui/components/textarea";
import { suggestionsAtom } from "../../lib/atoms";
import { formatBytes } from "../../lib/format";
import { useMessages } from "../../lib/use-language";
import { CameraCapture } from "./camera-capture";

interface PendingAttachment {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
}

interface ChatInputProps {
  readonly onSend: (content: string, attachments: ReadonlyArray<File>) => Promise<void>;
  readonly disabled: boolean;
  readonly analyzing: boolean;
}

export function ChatInput({ onSend, disabled, analyzing }: ChatInputProps) {
  const m = useMessages();
  const [value, setValue] = useState("");
  const [attachView, setAttachView] = useState<"menu" | "camera">("menu");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pending, setPending] = useState<ReadonlyArray<PendingAttachment>>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestions = useAtomValue(suggestionsAtom);
  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    return () => {
      for (const attachment of pendingRef.current) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, []);

  const busy = disabled || sending || analyzing;

  const addAttachment = (file: File): void => {
    setPending((current) => [
      ...current,
      { id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) },
    ]);
  };

  const removeAttachment = (id: string): void => {
    setPending((current) => {
      const attachment = current.find((item) => Equal.equals(id)(item.id));
      if (attachment !== undefined) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return current.filter((item) => !Equal.equals(id)(item.id));
    });
  };

  const submit = (content: string): void => {
    const trimmed = content.trim();
    if ((trimmed.length === 0 && pending.length === 0) || busy) {
      return;
    }
    const attachments = pending;
    setValue("");
    void (async () => {
      setSending(true);
      try {
        await onSend(
          trimmed,
          attachments.map((attachment) => attachment.file),
        );
      } finally {
        setSending(false);
        for (const attachment of attachments) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
        setPending([]);
      }
    })();
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
    addAttachment(file);
    setPopoverOpen(false);
    setAttachView("menu");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(value);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined || busy) {
      return;
    }
    addAttachment(file);
    setPopoverOpen(false);
    setAttachView("menu");
  };

  return (
    <div className="border-t border-border p-5">
      {pending.length > 0 && (
        <AttachmentGroup className="mb-3">
          {pending.map((attachment) => (
            <Attachment key={attachment.id} size="lg">
              <AttachmentMedia variant="image">
                <img src={attachment.previewUrl} alt="" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{attachment.file.name}</AttachmentTitle>
                <AttachmentDescription>{formatBytes(attachment.file.size)}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  onClick={() => removeAttachment(attachment.id)}
                  aria-label={m.chatRemoveAttachment()}
                >
                  <XIcon className="size-3.5" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
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
          placeholder={m.chatPlaceholder()}
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
                aria-label={m.chatAttachFile()}
              />
            }
          >
            {analyzing ? <Spinner className="size-5" /> : <PaperclipIcon className="size-5" />}
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
                  {m.chatAttachFile()}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttachView("camera")}
                  className="justify-start gap-2 rounded-lg px-2"
                >
                  <CameraIcon className="size-4" />
                  {m.chatTakePhoto()}
                </Button>
              </div>
            ) : (
              <CameraCapture onCapture={handlePhoto} onBack={() => setAttachView("menu")} />
            )}
          </PopoverContent>
        </Popover>
        <Button
          size="icon"
          disabled={busy || (value.trim().length === 0 && pending.length === 0)}
          onClick={() => submit(value)}
          aria-label={m.chatSend()}
          className="absolute right-3 bottom-3 size-10 rounded-full"
        >
          <SendIcon className="size-5 -translate-x-px translate-y-px" />
        </Button>
      </div>
    </div>
  );
}
