import { useEffect, useRef, useState } from "react";
import { Predicate } from "effect";
import { CameraIcon, ChevronLeftIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { Spinner } from "@cafebot/ui/components/spinner";
import { useMessages } from "../../lib/use-language";

interface CameraCaptureProps {
  readonly onCapture: (file: File) => void;
  readonly onBack: () => void;
}

export function CameraCapture({ onCapture, onBack }: CameraCaptureProps) {
  const m = useMessages();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;

    if (!Predicate.isFunction(navigator.mediaDevices?.getUserMedia)) {
      setStarting(false);
      setError(true);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        const video = videoRef.current;
        if (Predicate.isNotNull(video)) {
          video.srcObject = mediaStream;
          void video.play().catch(() => {
            if (active) {
              setError(true);
            }
          });
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setStarting(false);
        }
      });

    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleCapture = (): void => {
    const video = videoRef.current;
    if (Predicate.isNull(video) || video.videoWidth === 0) {
      return;
    }
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (Predicate.isNull(context)) {
      setCapturing(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (Predicate.isNull(blob)) {
          setCapturing(false);
          return;
        }
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        setCapturing(false);
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        {starting && !error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Spinner className="size-5" />
          </div>
        )}
        <video ref={videoRef} playsInline muted className="size-full object-cover" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <p className="text-sm text-destructive">{m.chatCameraError()}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex-1">
          <ChevronLeftIcon />
          {m.chatBack()}
        </Button>
        <Button
          size="sm"
          onClick={handleCapture}
          disabled={capturing || error || starting}
          className="flex-1"
        >
          {capturing ? <Spinner /> : <CameraIcon />}
          {m.chatCapture()}
        </Button>
      </div>
    </div>
  );
}
