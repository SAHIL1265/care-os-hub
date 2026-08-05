import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, FileText, Loader2, Send, ShieldAlert, AlertTriangle, Stethoscope,
  Sparkles, ExternalLink, Square,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import {
  REPORT_DISCLAIMER, buildReportContext, formatDate, statusMeta, type ReportAnalysis,
} from "@/lib/report-helpers";

export const Route = createFileRoute("/_app/reports/$reportId")({
  validateSearch: (search: Record<string, unknown>) => ({ ask: search.ask === true || search.ask === "true" ? true : undefined }),
  head: () => ({
    meta: [
      { title: "Report analysis · Sahara AI Health OS" },
      { name: "description", content: "A simple-language AI explanation of your medical report, with a chat to ask questions about it." },
      { property: "og:title", content: "Report analysis · Sahara" },
      { property: "og:description", content: "Understand your medical report in simple language." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportDetail,
});

type Row = {
  id: string;
  file_name: string;
  file_path: string | null;
  file_type: string;
  report_type: string;
  patient_label: string;
  created_at: string;
  extracted_text: string | null;
  analysis: unknown;
  chat: unknown;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What does my report mean?",
  "Which result is abnormal?",
  "Explain this report in very simple language.",
  "What should I ask my doctor?",
  "Which results should I pay attention to?",
];

function ReportDetail() {
  const { reportId } = Route.useParams();
  const { ask } = Route.useSearch();
  const nav = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { void load(); }, [reportId]);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [messages, streaming]);
  useEffect(() => {
    if (ask && !loading) document.getElementById("ask-ai")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ask, loading]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_reports")
      .select("id,file_name,file_path,file_type,report_type,patient_label,created_at,extracted_text,analysis,chat")
      .eq("id", reportId)
      .maybeSingle();
    if (error || !data) {
      toast.error("We couldn't open this report.");
      setLoading(false);
      return;
    }
    setRow(data as Row);
    setMessages(Array.isArray(data.chat) ? (data.chat as ChatMsg[]) : []);
    if (data.file_path) {
      const signed = await supabase.storage.from("medical-reports").createSignedUrl(data.file_path, 3600);
      setFileUrl(signed.data?.signedUrl ?? null);
    }
    setLoading(false);
  }

  const a: ReportAnalysis = (row?.analysis as ReportAnalysis) ?? {};
  const results = a.structured_results ?? [];

  async function persistChat(next: ChatMsg[]) {
    await supabase.from("medical_reports").update({ chat: next as never }).eq("id", reportId);
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || streaming || !row) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      const res = await fetch("/api/report-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          report: buildReportContext(a, { report_type: row.report_type, patient_label: row.patient_label, file_name: row.file_name }),
          messages: next,
        }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "We couldn't answer right now. Please try again.");
      }
      setMessages([...next, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
      }
      const final: ChatMsg[] = [...next, { role: "assistant", content: acc }];
      setMessages(final);
      void persistChat(final);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "We couldn't answer right now. Please try again.");
        setMessages(next);
      } else if (acc) {
        const final: ChatMsg[] = [...next, { role: "assistant", content: acc }];
        setMessages(final);
        void persistChat(final);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading report…</div>;
  }

  if (!row) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">This report isn't available.</p>
        <Button onClick={() => nav({ to: "/reports" })}>Back to reports</Button>
      </div>
    );
  }

  const patientInfo = Object.entries(a.patient_info ?? {}).filter(([, v]) => v);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
        <Link to="/reports"><ArrowLeft className="h-4 w-4" />All reports</Link>
      </Button>

      <PageHeader
        title={row.report_type}
        subtitle={`${row.file_name} · Patient: ${row.patient_label} · ${formatDate(row.created_at)}`}
        actions={fileUrl ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Original</a>
          </Button>
        ) : undefined}
      />

      {a.urgent && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This report may need prompt medical attention</AlertTitle>
          <AlertDescription>Please contact your doctor or local emergency services if you feel unwell.</AlertDescription>
        </Alert>
      )}

      {a.is_medical_image && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Imaging report</AlertTitle>
          <AlertDescription className="text-xs">
            {a.image_notice || "Sahara explains only the text written in imaging reports. The image itself must be interpreted by a qualified radiologist or doctor."}
          </AlertDescription>
        </Alert>
      )}

      {a.low_confidence_notice && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">{a.low_confidence_notice}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI summary</CardTitle>
              <CardDescription>A short overview of this report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <p>{a.ai_summary || "No summary available for this report."}</p>
              {(a.important_findings ?? []).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Important findings</div>
                    {(a.important_findings ?? []).map((f, i) => (
                      <div key={i} className={`rounded-xl border p-3 ${f.severity === "urgent" ? "border-destructive/40 bg-destructive/5" : f.severity === "attention" ? "border-warning/40 bg-warning/5" : ""}`}>
                        <div className="font-semibold">{f.title}</div>
                        <div className="mt-0.5 text-muted-foreground">{f.detail}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Important results</CardTitle>
                <CardDescription>Values and reference ranges exactly as printed on your report</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Normal range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[220px]">Simple explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => {
                      const meta = statusMeta(r.status);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.test}</TableCell>
                          <TableCell>{r.result}{r.unit ? ` ${r.unit}` : ""}</TableCell>
                          <TableCell className="text-muted-foreground">{r.reference_range}</TableCell>
                          <TableCell><Badge variant="outline" className={meta.className}>{meta.label}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{r.explanation}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>What does this report mean?</CardTitle>
              <CardDescription>Explained in simple language</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed">
              {(a.simple_explanation || "No explanation available.").split(/\n{1,}/).filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {(a.warning_signs ?? []).length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning signs to watch for</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4">{(a.warning_signs ?? []).map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card id="ask-ai">
            <CardHeader>
              <CardTitle>Ask questions about this report</CardTitle>
              <CardDescription>Answers are based on this report only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div ref={chatRef} className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl bg-muted/30 p-3">
                {messages.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Ask anything about this report — for example, “Is my hemoglobin normal?”</p>
                ) : messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                      {m.content || (streaming ? "…" : "")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" size="sm" disabled={streaming} onClick={() => void send(s)} className="text-xs">{s}</Button>
                ))}
              </div>

              <form
                className="flex gap-2"
                onSubmit={(e) => { e.preventDefault(); void send(input); }}
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about this report…"
                  aria-label="Ask about this report"
                  maxLength={800}
                  disabled={streaming}
                />
                {streaming ? (
                  <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()} className="gap-1.5">
                    <Square className="h-4 w-4" />Stop
                  </Button>
                ) : (
                  <Button type="submit" disabled={!input.trim()} className="gap-1.5"><Send className="h-4 w-4" />Send</Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Original report</CardTitle>
            </CardHeader>
            <CardContent>
              {!fileUrl ? (
                <p className="text-sm text-muted-foreground">The original file isn't available.</p>
              ) : row.file_type === "pdf" ? (
                <Button asChild variant="outline" className="w-full gap-1.5">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Open PDF</a>
                </Button>
              ) : (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <img src={fileUrl} alt={`Original document: ${row.file_name}`} className="w-full rounded-xl border object-contain" loading="lazy" />
                </a>
              )}
            </CardContent>
          </Card>

          {patientInfo.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Patient information</CardTitle>
                <CardDescription>Only what was detected in the document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {patientInfo.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
                    <span className="text-right font-medium">{v}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(a.doctor_questions ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Stethoscope className="h-4 w-4" />Questions for your doctor</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                  {(a.doctor_questions ?? []).map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {(a.findings ?? []).length > 0 && (
            <Card>
              <CardHeader><CardTitle>Findings on the report</CardTitle>
                <CardDescription>As written by the lab or doctor</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                  {(a.findings ?? []).map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {row.extracted_text && (
            <Card>
              <CardHeader><CardTitle>Extracted text</CardTitle>
                <CardDescription>Raw text read from the document</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{row.extracted_text}</pre>
              </CardContent>
            </Card>
          )}

          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">{REPORT_DISCLAIMER}</AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
