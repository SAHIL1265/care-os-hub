import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title?: string;
  hint?: string;
  onClose: () => void;
  onCapture: (file: File) => void;
  onUploadInstead: () => void;
};

export function ReportCamera({ open, title = "Scan report", hint, onClose, onCapture, onUploadInstead }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera access is blocked. Please allow camera permission in your browser settings, then try again.");
      } else if (name === "NotFoundError") {
        setError("We couldn't find a camera on this device.");
      } else {
        setError("We couldn't open the camera on this device.");
      }
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    if (open) { setShot(null); void start(); }
    return () => stop();
  }, [open, start, stop]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    // Cap the long edge so uploads stay small but text stays readable.
    const max = 2000;
    const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Light contrast boost improves OCR on printed reports.
    ctx.filter = "contrast(1.12) brightness(1.05) saturate(0.9)";
    ctx.drawImage(canvas, 0, 0);
    setShot(canvas.toDataURL("image/jpeg", 0.92));
  }

  async function usePhoto() {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    const file = new File([blob], `report-scan-${Date.now()}.jpg`, { type: "image/jpeg" });
    stop();
    onCapture(file);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { stop(); onClose(); } }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint ?? "Place the report flat inside the frame. Make sure the text is sharp and well lit."}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] w-full bg-black sm:aspect-video">
          {error ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div className="space-y-4">
                <p className="text-sm text-white/90">{error}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button onClick={() => void start()} className="gap-2"><Camera className="h-4 w-4" />Allow camera access</Button>
                  <Button variant="secondary" onClick={() => { stop(); onUploadInstead(); }} className="gap-2">
                    <Upload className="h-4 w-4" />Upload report instead
                  </Button>
                </div>
              </div>
            </div>
          ) : shot ? (
            <img src={shot} alt="Captured report preview" className="h-full w-full object-contain" />
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-white/70" />
              {starting && <div className="absolute inset-0 grid place-items-center text-sm text-white/80">Opening camera…</div>}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4">
          <Button variant="ghost" onClick={() => { stop(); onClose(); }} className="gap-2"><X className="h-4 w-4" />Cancel</Button>
          {shot ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShot(null)} className="gap-2"><RotateCcw className="h-4 w-4" />Retake</Button>
              <Button onClick={() => void usePhoto()} className="gap-2"><Check className="h-4 w-4" />Use photo</Button>
            </div>
          ) : (
            <Button size="lg" disabled={!!error} onClick={capture} className="gap-2"><Camera className="h-5 w-5" />Capture</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
