import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Upload, Camera, Bot, FileText, Trash2, Loader2, ShieldAlert, MessageSquare,
  AlertTriangle, CheckCircle2, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { ReportCamera } from "@/components/report-camera";
import { supabase } from "@/integrations/supabase/client";
import {
  ACCEPT_ATTR, PROCESSING_STEPS, REPORT_DISCLAIMER, formatDate, fileToDataUrl,
  validateReportFile, type ReportAnalysis,
} from "@/lib/report-helpers";

export const Route = createFileRoute("/_app/reports/")({
  head: () => ({
    meta: [
      { title: "Medical Reports · Sahara AI Health OS" },
      { name: "description", content: "Upload or scan medical reports and get a simple, easy-to-understand AI explanation you can ask questions about." },
      { property: "og:title", content: "Medical Reports · Sahara" },
      { property: "og:description", content: "Upload, scan and understand your medical reports with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

type ReportRow = {
  id: string;
  file_name: string;
  report_type: string;
  patient_label: string;
  processing_status: string;
  created_at: string;
  ai_summary: string | null;
};

type Member = { id: string; name: string; relationship: string };
type Mode = "upload" | "scan" | "ai";

function ReportsPage() {
  const nav = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("upload");
  const [pending, setPending] = useState<File | null>(null);
  const [patient, setPatient] = useState<string>("me");
  const [step, setStep] = useState(-1);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [r, m] = await Promise.all([
      supabase.from("medical_reports")
        .select("id,file_name,report_type,patient_label,processing_status,created_at,ai_summary")
        .order("created_at", { ascending: false }),
      supabase.from("family_members").select("id,name,relationship").order("name"),
    ]);
    if (r.error) toast.error("We couldn't load your reports. Please try again.");
    setReports((r.data as ReportRow[]) ?? []);
    setMembers((m.data as Member[]) ?? []);
    setLoading(false);
  }

  function pickFile(nextMode: Mode) {
    setMode(nextMode);
    fileInputRef.current?.click();
  }

  function acceptFile(file: File) {
    const err = validateReportFile(file);
    if (err) { toast.error(err); return; }
    setFailure(null);
    setPending(file);
  }

  async function analyze() {
    const file = pending;
    if (!file) return;
    setFailure(null);
    setStep(0);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("You need to be signed in.");

      const member = members.find((m) => m.id === patient);
      const patientLabel = member ? `${member.name} (${member.relationship})` : "Me";

      // 1. Store the original document privately (per-user folder).
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("medical-reports").upload(path, file, {
        contentType: file.type || undefined, upsert: false,
      });
      if (up.error) throw new Error("We couldn't save this file securely. Please try again.");

      setStep(1);
      const dataUrl = await fileToDataUrl(file);

      setStep(2);
      const res = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: dataUrl, mime: file.type || "image/jpeg", file_name: file.name }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        await supabase.storage.from("medical-reports").remove([path]);
        throw new Error(text || "We couldn't analyze this report right now. Please try again.");
      }

      setStep(3);
      const analysis = (await res.json()) as ReportAnalysis;

      if (analysis.processing_ok === false) {
        await supabase.storage.from("medical-reports").remove([path]);
        throw new Error(analysis.failure_reason || "We couldn't read this report clearly. Please upload a clearer image or PDF.");
      }

      setStep(4);
      const insert = await supabase.from("medical_reports").insert({
        user_id: uid,
        family_member_id: member?.id ?? null,
        patient_label: patientLabel,
        file_name: file.name,
        file_path: path,
        file_type: file.type === "application/pdf" ? "pdf" : "image",
        source: mode === "upload" ? "upload" : mode === "scan" ? "scan" : "ai_analysis",
        report_type: analysis.report_type || "Medical Report",
        extracted_text: analysis.extracted_text ?? null,
        structured_results: (analysis.structured_results ?? []) as never,
        analysis: analysis as never,
        ai_summary: analysis.ai_summary ?? null,
        important_findings: (analysis.important_findings ?? []) as never,
        doctor_questions: (analysis.doctor_questions ?? []) as never,
        simple_explanation: analysis.simple_explanation ?? null,
        ocr_confidence: typeof analysis.ocr_confidence === "number" ? analysis.ocr_confidence : null,
        processing_status: "complete",
      }).select("id").single();

      if (insert.error) throw new Error("We couldn't save this analysis. Please try again.");

      setStep(5);
      setPending(null);
      setStep(-1);
      toast.success("Analysis complete");
      nav({ to: "/reports/$reportId", params: { reportId: insert.data.id }, search: { ask: mode === "ai" ? true : undefined } });
    } catch (err) {
      setStep(-1);
      setFailure(err instanceof Error ? err.message : "We couldn't analyze this report right now. Please try again.");
    }
  }

  async function remove(id: string) {
    const { data: row } = await supabase.from("medical_reports").select("file_path").eq("id", id).maybeSingle();
    if (row?.file_path) await supabase.storage.from("medical-reports").remove([row.file_path]);
    const { error } = await supabase.from("medical_reports").delete().eq("id", id);
    if (error) { toast.error("We couldn't delete this report. Please try again."); return; }
    setReports((prev) => prev.filter((r) => r.id !== id));
    toast.success("Report deleted");
  }

  const busy = step >= 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Medical reports" subtitle="Upload, scan, and understand your medical reports with AI." />

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) acceptFile(f);
        }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) { setMode("upload"); acceptFile(f); }
        }}
        className={`grid gap-4 rounded-2xl p-1 transition sm:grid-cols-3 ${dragging ? "bg-primary/5 ring-2 ring-primary/40" : ""}`}
      >
        {[
          { icon: Upload, label: "Upload report", desc: "PDF, JPG, PNG or WEBP · drag & drop too", action: () => pickFile("upload") },
          { icon: Camera, label: "Scan report", desc: "Use your camera to capture a paper report", action: () => { setMode("scan"); setCameraOpen(true); } },
          { icon: Bot, label: "AI analysis", desc: "Capture and ask questions about your report", action: () => { setMode("ai"); setCameraOpen(true); } },
        ].map((s) => (
          <Card key={s.label} role="button" tabIndex={0} onClick={s.action}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.action(); } }}
            className="cursor-pointer border-dashed transition hover:shadow-elegant focus-visible:ring-2 focus-visible:ring-primary">
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg text-white shadow-glow"><s.icon className="h-6 w-6" /></div>
              <div className="mt-1 font-semibold">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">{REPORT_DISCLAIMER}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Recent reports</CardTitle>
          <CardDescription>Your analyzed reports, newest first</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading your reports…</div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No reports yet. Upload or scan your first medical report above.
            </div>
          ) : reports.map((r) => (
            <div key={r.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald/10 text-emerald"><FileText className="h-5 w-5" /></div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{r.report_type}</span>
                  <Badge variant="outline" className="gap-1 border-emerald/40 text-emerald">
                    <CheckCircle2 className="h-3 w-3" />{r.processing_status === "complete" ? "Analysis complete" : r.processing_status}
                  </Badge>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {r.file_name} · Patient: {r.patient_label} · {formatDate(r.created_at)}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/reports/$reportId" params={{ reportId: r.id }} search={{ ask: undefined }}>View analysis</Link>
                </Button>
                <Button asChild size="sm" className="gap-1.5">
                  <Link to="/reports/$reportId" params={{ reportId: r.id }} search={{ ask: true }}>
                    <MessageSquare className="h-4 w-4" />Ask AI
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${r.report_type}`} onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ReportCamera
        open={cameraOpen}
        title={mode === "ai" ? "AI analysis" : "Scan report"}
        hint={mode === "ai"
          ? "Place the report clearly inside the frame. After analysis you can ask questions about it."
          : undefined}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => { setCameraOpen(false); acceptFile(file); }}
        onUploadInstead={() => { setCameraOpen(false); pickFile("upload"); }}
      />

      {/* Patient selection + processing */}
      <Dialog open={!!pending} onOpenChange={(v) => { if (!v && !busy) { setPending(null); setFailure(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{busy ? "Analyzing your report" : "Who is this report for?"}</DialogTitle>
            <DialogDescription className="truncate">{pending?.name}</DialogDescription>
          </DialogHeader>

          {busy ? (
            <ol className="space-y-2 py-2 text-sm">
              {PROCESSING_STEPS.map((label, i) => (
                <li key={label} className={`flex items-center gap-2 ${i <= step ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {i < step ? <CheckCircle2 className="h-4 w-4 text-emerald" />
                    : i === step ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    : <Info className="h-4 w-4 opacity-40" />}
                  {label}
                </li>
              ))}
            </ol>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="patient">Patient / family member</Label>
                <Select value={patient} onValueChange={setPatient}>
                  <SelectTrigger id="patient"><SelectValue placeholder="Select a person" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">Me</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} · {m.relationship}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Add more people on the Family page. We never assume the patient from the document.
                </p>
              </div>

              {failure && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{failure}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {!busy && (
            <DialogFooter className="gap-2 sm:gap-2">
              {failure ? (
                <>
                  <Button variant="outline" onClick={() => { setPending(null); setFailure(null); pickFile("upload"); }}>Upload another report</Button>
                  <Button onClick={() => void analyze()}>Try again</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
                  <Button onClick={() => void analyze()} className="gap-2"><Bot className="h-4 w-4" />Analyze report</Button>
                </>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              The original file and its AI analysis will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const id = deleteId; setDeleteId(null); if (id) void remove(id); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
