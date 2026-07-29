import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pill, Plus, ScanLine, QrCode, Barcode, AlertTriangle, Camera, X, Volume2,
  Square, Star, Printer, Loader2, Sparkles, RefreshCw, Zap, ShieldCheck,
  Clock, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { medicines } from "@/lib/demo-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/medicines")({
  head: () => ({ meta: [{ title: "Medicines · Sahara" }] }),
  component: Medicines,
});

type ScanType = "camera" | "barcode" | "qr";

type MedicineInfo = {
  medicine_name: string;
  generic_name?: string | null;
  brand_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  manufacturer?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  manufacturing_date?: string | null;
  price?: string | null;
  prescription_required?: boolean | null;
  confidence?: number;
  raw_text?: string | null;
  overview?: string;
  what_is_it?: string;
  used_for?: string[];
  how_it_works?: string;
  how_to_take?: string;
  side_effects?: string[];
  who_should_avoid?: string[];
  warnings?: string[];
  food_interactions?: string | null;
  alcohol_warning?: string | null;
  pregnancy_guidance?: string | null;
  driving_warning?: string | null;
  missed_dose?: string | null;
  overdose?: string | null;
  storage?: string;
  disposal?: string | null;
  doctor_advice?: string;
};

type ScanRow = {
  id: string;
  scan_type: ScanType;
  medicine_name: string;
  info: MedicineInfo;
  confidence: number | null;
  language: string;
  is_favorite: boolean;
  created_at: string;
};

const LANGS = [
  { value: "en", label: "English", voice: "en-US" },
  { value: "hi", label: "हिन्दी", voice: "hi-IN" },
  { value: "mr", label: "मराठी", voice: "mr-IN" },
  { value: "ja", label: "日本語", voice: "ja-JP" },
];

const SCAN_LABEL: Record<ScanType, string> = {
  camera: "Scan Medicine",
  barcode: "Barcode Scanner",
  qr: "QR Scanner",
};

function Medicines() {
  const [scanOpen, setScanOpen] = useState<ScanType | null>(null);
  const [language, setLanguage] = useState("en");
  const [current, setCurrent] = useState<MedicineInfo | null>(null);
  const [currentType, setCurrentType] = useState<ScanType>("camera");
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const loadHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from("medicine_scans")
      .select("id, scan_type, medicine_name, info, confidence, language, is_favorite, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return;
    setHistory((data ?? []) as unknown as ScanRow[]);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const analyze = useCallback(async (payload: { image?: string; hint?: string; scan_type: ScanType }) => {
    setAnalyzing(true);
    setScanOpen(null);
    setCurrentType(payload.scan_type);
    try {
      const res = await fetch("/api/scan-medicine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, language }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Request failed (${res.status})`);
      }
      const info = (await res.json()) as MedicineInfo;
      setCurrent(info);
      // Persist
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        const { data: saved } = await supabase.from("medicine_scans").insert({
          user_id: uid,
          scan_type: payload.scan_type,
          medicine_name: info.medicine_name || "Unknown medicine",
          raw_text: info.raw_text ?? null,
          info: info as unknown as Record<string, unknown>,
          confidence: typeof info.confidence === "number" ? info.confidence : null,
          language,
        }).select("id, scan_type, medicine_name, info, confidence, language, is_favorite, created_at").single();
        if (saved) setHistory((h) => [saved as unknown as ScanRow, ...h].slice(0, 20));
      }
      toast.success("Medicine identified");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to analyze");
    } finally {
      setAnalyzing(false);
    }
  }, [language]);

  const toggleFavorite = useCallback(async (row: ScanRow) => {
    const next = !row.is_favorite;
    setHistory((h) => h.map((r) => r.id === row.id ? { ...r, is_favorite: next } : r));
    await supabase.from("medicine_scans").update({ is_favorite: next }).eq("id", row.id);
  }, []);

  const removeScan = useCallback(async (id: string) => {
    setHistory((h) => h.filter((r) => r.id !== id));
    await supabase.from("medicine_scans").delete().eq("id", id);
    toast.success("Scan removed");
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine management"
        subtitle="Scan any medicine strip, barcode or QR — get simple, safe guidance instantly."
        actions={
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="gradient-bg text-white"><Plus className="mr-2 h-4 w-4" />Add medicine</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {([
          { type: "camera" as const, icon: ScanLine, label: "Scan Medicine", desc: "Camera + AI recognition" },
          { type: "barcode" as const, icon: Barcode, label: "Barcode Scanner", desc: "Instant medicine lookup" },
          { type: "qr" as const, icon: QrCode, label: "QR Scanner", desc: "Prescription & links" },
        ]).map((s) => (
          <Card
            key={s.type}
            onClick={() => setScanOpen(s.type)}
            className="cursor-pointer transition hover:shadow-elegant hover:-translate-y-0.5"
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg text-white shadow-glow">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {analyzing && (
        <Card className="border-primary/40">
          <CardContent className="flex items-center gap-3 p-5">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="text-sm">Analyzing image with AI…</div>
          </CardContent>
        </Card>
      )}

      {current && (
        <MedicineInfoCard
          info={current}
          scanType={currentType}
          language={language}
          onClose={() => setCurrent(null)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Today's schedule</CardTitle>
          <CardDescription>Adherence 92% this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {medicines.map((m) => (
            <div key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border p-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Pill className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{m.name}</span>
                  {m.status === "critical" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Refill</Badge>}
                  {m.status === "low" && <Badge className="bg-warning/20 text-warning hover:bg-warning/25">Low stock</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{m.schedule} · {m.stock} pills left · refill in {m.refillIn} days</div>
                <Progress value={(m.stock / 60) * 100} className="mt-2 h-1.5" />
              </div>
              <Button variant={m.taken ? "outline" : "default"} size="sm" className={m.taken ? "" : "gradient-bg text-white"}>
                {m.taken ? "Taken" : "Mark taken"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scan history</CardTitle>
            <CardDescription>Your recent medicine scans</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadHistory}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No scans yet — tap <span className="font-medium">Scan Medicine</span> above to get started.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {history.map((row) => (
                <div key={row.id} className="group rounded-xl border p-3 transition hover:shadow-elegant">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="flex min-w-0 items-start gap-3 text-left"
                      onClick={() => { setCurrent(row.info); setCurrentType(row.scan_type); }}
                    >
                      <div className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white",
                        row.scan_type === "camera" && "bg-primary",
                        row.scan_type === "barcode" && "bg-emerald-500",
                        row.scan_type === "qr" && "bg-violet-500",
                      )}>
                        {row.scan_type === "camera" && <ScanLine className="h-5 w-5" />}
                        {row.scan_type === "barcode" && <Barcode className="h-5 w-5" />}
                        {row.scan_type === "qr" && <QrCode className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{row.medicine_name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(row.created_at).toLocaleString()}
                          {row.confidence != null && <Badge variant="secondary" className="h-5">{Math.round(row.confidence)}%</Badge>}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => toggleFavorite(row)}>
                        <Star className={cn("h-4 w-4", row.is_favorite && "fill-warning text-warning")} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeScan(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ScannerDialog
        type={scanOpen}
        onClose={() => setScanOpen(null)}
        onCapture={analyze}
      />
    </div>
  );
}

// ---------- Scanner Dialog ----------

function ScannerDialog({
  type,
  onClose,
  onCapture,
}: {
  type: ScanType | null;
  onClose: () => void;
  onCapture: (payload: { image?: string; hint?: string; scan_type: ScanType }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const open = type !== null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setError(null); setReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);

        // Barcode / QR live detection when supported
        if (type === "barcode" || type === "qr") {
          const BD = (window as any).BarcodeDetector;
          if (BD) {
            const formats = type === "qr"
              ? ["qr_code"]
              : ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar", "data_matrix"];
            try {
              detectorRef.current = new BD({ formats });
              setDetecting(true);
              const loop = async () => {
                if (cancelled || !videoRef.current) return;
                try {
                  const codes = await detectorRef.current.detect(videoRef.current);
                  if (codes && codes.length > 0) {
                    const value = codes[0].rawValue as string;
                    cleanup();
                    onCapture({ hint: value, scan_type: type });
                    return;
                  }
                } catch { /* ignore per-frame errors */ }
                rafRef.current = requestAnimationFrame(loop);
              };
              rafRef.current = requestAnimationFrame(loop);
            } catch { /* fallback: manual capture */ }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera access denied");
      }
    })();

    const cleanup = () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setTorchOn(false);
      setDetecting(false);
    };
    return cleanup;
  }, [open, type, onCapture]);

  const capture = useCallback(() => {
    if (!videoRef.current || !type) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCapture({ image: dataUrl, scan_type: type });
  }, [type, onCapture]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const caps = (track as any)?.getCapabilities?.();
    if (!track || !caps?.torch) { toast.info("Torch not supported on this device"); return; }
    const next = !torchOn;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch { toast.error("Could not toggle torch"); }
  }, [torchOn]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            {type ? SCAN_LABEL[type] : ""}
          </DialogTitle>
          <DialogDescription>
            {type === "camera" && "Point the camera at the medicine strip, box, bottle or label, then capture."}
            {type === "barcode" && "Align the barcode inside the frame — detection is automatic when supported."}
            {type === "qr" && "Point the camera at the QR code — detection is automatic when supported."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl border bg-black" style={{ aspectRatio: "16 / 10" }}>
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {!ready && !error && (
            <div className="absolute inset-0 grid place-items-center text-white/80">
              <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Starting camera…</div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">
              <div>
                <div className="mb-1 font-semibold">Camera unavailable</div>
                <div className="text-white/70">{error}</div>
              </div>
            </div>
          )}
          {/* Scanning frame */}
          {(type === "barcode" || type === "qr") && ready && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className={cn(
                "rounded-2xl border-2 border-primary/80 shadow-glow",
                type === "qr" ? "h-48 w-48" : "h-24 w-72",
              )} />
            </div>
          )}
          {detecting && (
            <Badge className="absolute left-3 top-3 gap-1 bg-emerald-500/90 text-white">
              <Sparkles className="h-3 w-3" /> Auto-detecting
            </Badge>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleTorch} disabled={!ready}>
              <Zap className={cn("mr-2 h-4 w-4", torchOn && "text-warning")} />
              {torchOn ? "Flash on" : "Flash"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}><X className="mr-2 h-4 w-4" />Cancel</Button>
            <Button className="gradient-bg text-white" onClick={capture} disabled={!ready}>
              <Camera className="mr-2 h-4 w-4" />Capture
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Medicine Info Card ----------

function MedicineInfoCard({
  info, scanType, language, onClose,
}: { info: MedicineInfo; scanType: ScanType; language: string; onClose: () => void }) {
  const [speaking, setSpeaking] = useState(false);

  const voiceLang = LANGS.find((l) => l.value === language)?.voice ?? "en-US";

  const spokenText = useMemo(() => buildSpokenText(info), [info]);

  const readAloud = useCallback(() => {
    if (!("speechSynthesis" in window)) { toast.error("Text-to-speech not supported"); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(spokenText);
    u.lang = voiceLang;
    u.rate = 0.98;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [spokenText, voiceLang]);

  const stopReading = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const share = useCallback(async () => {
    const text = `${info.medicine_name}\n\n${info.overview ?? ""}`;
    if (navigator.share) {
      try { await navigator.share({ title: info.medicine_name, text }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }
    catch { toast.error("Could not share"); }
  }, [info]);

  const confidence = Math.max(0, Math.min(100, Math.round(info.confidence ?? 0)));

  return (
    <Card className="overflow-hidden border-primary/30">
      <div className="gradient-bg p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs opacity-90">
              <ShieldCheck className="h-3.5 w-3.5" />
              AI Medicine Overview · {scanType === "camera" ? "Camera scan" : scanType === "barcode" ? "Barcode" : "QR code"}
            </div>
            <h3 className="mt-1 truncate text-2xl font-bold tracking-tight">{info.medicine_name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {info.strength && <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/25">{info.strength}</Badge>}
              {info.dosage_form && <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/25">{info.dosage_form}</Badge>}
              {info.generic_name && <span className="opacity-90">Generic: {info.generic_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-white/10 px-3 py-1.5 text-xs">
              Accuracy <span className="font-bold">{confidence}%</span>
            </div>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {info.overview && <p className="mt-3 text-sm leading-relaxed text-white/95">{info.overview}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {!speaking ? (
            <Button size="sm" variant="secondary" className="bg-white text-primary hover:bg-white/90" onClick={readAloud}>
              <Volume2 className="mr-2 h-4 w-4" />Read Aloud
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="bg-white text-primary hover:bg-white/90" onClick={stopReading}>
              <Square className="mr-2 h-4 w-4" />Stop
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />Export PDF
          </Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/15" onClick={share}>
            <Sparkles className="mr-2 h-4 w-4" />Share
          </Button>
        </div>
      </div>

      <CardContent className="grid gap-4 p-5 md:grid-cols-2">
        {info.what_is_it && <InfoBlock title="What is this medicine?">{info.what_is_it}</InfoBlock>}
        {info.how_it_works && <InfoBlock title="How does it work?">{info.how_it_works}</InfoBlock>}
        {info.used_for && info.used_for.length > 0 && <InfoList title="Used for" items={info.used_for} />}
        {info.how_to_take && <InfoBlock title="How to take">{info.how_to_take}</InfoBlock>}
        {info.side_effects && info.side_effects.length > 0 && <InfoList title="Common side effects" items={info.side_effects} />}
        {info.who_should_avoid && info.who_should_avoid.length > 0 && <InfoList title="Who should avoid it" items={info.who_should_avoid} />}
        {info.warnings && info.warnings.length > 0 && <InfoList title="Warnings" items={info.warnings} tone="warning" />}
        {(info.food_interactions || info.alcohol_warning) && (
          <InfoBlock title="Food & alcohol">
            {[info.food_interactions, info.alcohol_warning].filter(Boolean).join(" ")}
          </InfoBlock>
        )}
        {info.pregnancy_guidance && <InfoBlock title="Pregnancy & breastfeeding">{info.pregnancy_guidance}</InfoBlock>}
        {info.driving_warning && <InfoBlock title="Driving">{info.driving_warning}</InfoBlock>}
        {info.missed_dose && <InfoBlock title="Missed dose">{info.missed_dose}</InfoBlock>}
        {info.overdose && <InfoBlock title="Overdose" tone="warning">{info.overdose}</InfoBlock>}
        {info.storage && <InfoBlock title="Storage">{info.storage}</InfoBlock>}
        {info.disposal && <InfoBlock title="Disposal">{info.disposal}</InfoBlock>}

        <div className="md:col-span-2 grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaField label="Manufacturer" value={info.manufacturer} />
          <MetaField label="Batch" value={info.batch_number} />
          <MetaField label="Expiry" value={info.expiry_date} />
          <MetaField label="Price" value={info.price} />
          <MetaField label="Brand" value={info.brand_name} />
          <MetaField label="Mfg date" value={info.manufacturing_date} />
          <MetaField label="Prescription" value={info.prescription_required == null ? null : info.prescription_required ? "Required" : "Not required"} />
          <MetaField label="Language" value={LANGS.find((l) => l.value === language)?.label ?? language} />
        </div>

        {info.doctor_advice && (
          <div className="md:col-span-2 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">{info.doctor_advice}</div>
          </div>
        )}

        {info.raw_text && (
          <details className="md:col-span-2 rounded-xl border p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">OCR text (what the AI read)</summary>
            <ScrollArea className="mt-2 max-h-40 whitespace-pre-wrap">{info.raw_text}</ScrollArea>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function InfoBlock({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "warning" }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      tone === "warning" && "border-warning/40 bg-warning/5",
    )}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function InfoList({ title, items, tone }: { title: string; items: string[]; tone?: "warning" }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      tone === "warning" && "border-warning/40 bg-warning/5",
    )}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="ml-4 list-disc space-y-1 text-sm">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );
}

function buildSpokenText(info: MedicineInfo): string {
  const parts: string[] = [];
  parts.push(info.medicine_name);
  if (info.overview) parts.push(info.overview);
  if (info.what_is_it) parts.push(info.what_is_it);
  if (info.used_for?.length) parts.push("Used for: " + info.used_for.join(", "));
  if (info.how_to_take) parts.push("How to take: " + info.how_to_take);
  if (info.side_effects?.length) parts.push("Common side effects: " + info.side_effects.join(", "));
  if (info.warnings?.length) parts.push("Warnings: " + info.warnings.join(". "));
  if (info.storage) parts.push("Storage: " + info.storage);
  if (info.doctor_advice) parts.push(info.doctor_advice);
  return parts.join(". ");
}
  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine management"
        subtitle="Reminders, refills, inventory and scanners."
        actions={<Button className="gradient-bg text-white"><Plus className="mr-2 h-4 w-4" />Add medicine</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[{ icon: ScanLine, label: "Scan medicine" }, { icon: Barcode, label: "Barcode scan" }, { icon: QrCode, label: "QR scan" }].map((s) => (
          <Card key={s.label} className="cursor-pointer transition hover:shadow-elegant">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg text-white shadow-glow"><s.icon className="h-6 w-6" /></div>
              <div>
                <div className="font-semibold">{s.label}</div>
                <div className="text-xs text-muted-foreground">Instant AI recognition</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's schedule</CardTitle>
          <CardDescription>Adherence 92% this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {medicines.map((m) => (
            <div key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border p-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Pill className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{m.name}</span>
                  {m.status === "critical" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Refill</Badge>}
                  {m.status === "low" && <Badge className="bg-warning/20 text-warning hover:bg-warning/25">Low stock</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{m.schedule} · {m.stock} pills left · refill in {m.refillIn} days</div>
                <Progress value={(m.stock / 60) * 100} className="mt-2 h-1.5" />
              </div>
              <Button variant={m.taken ? "outline" : "default"} size="sm" className={m.taken ? "" : "gradient-bg text-white"}>
                {m.taken ? "Taken" : "Mark taken"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

