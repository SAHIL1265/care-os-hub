import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bot, Mic, MicOff, Send, Sparkles, FileHeart, Pill, Stethoscope, Brain,
  Salad, HeartHandshake, Trash2, Volume2, Square, AlertTriangle, User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ai")({
  head: () => ({ meta: [{ title: "AI Healthcare Partner · Sahara" }] }),
  component: AiAssistant,
});

type Msg = { role: "user" | "assistant"; content: string; ts: number };

const STORAGE_KEY = "sahara.ai.chat.v1";

const quickActions = [
  { icon: FileHeart, label: "Explain Medical Report", prompt: "Help me understand a medical report. I'll paste the values shortly — first, what should I look for?" },
  { icon: Stethoscope, label: "Ask Health Question", prompt: "I have a general health question about my patient." },
  { icon: Pill, label: "Medication Assistant", prompt: "Help me understand and organize my patient's current medications." },
  { icon: HeartHandshake, label: "Patient Health Summary", prompt: "Summarize what I should keep track of for the patient's recent health progress." },
  { icon: Salad, label: "Recovery Assistant", prompt: "What should I focus on to support the patient's recovery this week?" },
  { icon: Brain, label: "Caregiver Support", prompt: "I'm feeling stressed as a caregiver. What can I do right now?" },
];

const suggestions = [
  "What should I ask the doctor during the next appointment?",
  "What food is generally good during recovery?",
  "I forgot to give the medicine. What should I do?",
  "What are the important health tasks for today?",
];

const WELCOME: Msg = {
  role: "assistant",
  ts: Date.now(),
  content:
    "Hi 👋 I'm your **AI Healthcare Partner** inside Sahara. I can help you understand medical reports, medications, patient care, recovery, nutrition, appointments, and caregiver wellness — and answer general questions too.\n\nHow can I help you today?",
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Minimal, safe markdown-ish renderer: **bold**, ## headings, - bullets, line breaks.
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let listBuf: string[] = [];
  const flushList = (key: string) => {
    if (listBuf.length) {
      out.push(
        <ul key={key} className="my-2 ml-5 list-disc space-y-1">
          {listBuf.map((l, i) => <li key={i}>{renderInline(l)}</li>)}
        </ul>
      );
      listBuf = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      listBuf.push(line.replace(/^\s*[-*]\s+/, ""));
      return;
    }
    flushList(`l-${i}`);
    if (/^##\s+/.test(line)) {
      out.push(<h3 key={i} className="mt-3 mb-1 text-sm font-semibold">{renderInline(line.replace(/^##\s+/, ""))}</h3>);
    } else if (line === "") {
      out.push(<div key={i} className="h-2" />);
    } else {
      out.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
    }
  });
  flushList("l-end");
  return <div className="space-y-0.5 text-sm">{out}</div>;
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

function isEmergency(text: string) {
  return text.includes("⚠️ POSSIBLE MEDICAL EMERGENCY");
}

function AiAssistant() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted conversation
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Msg = { role: "user", content: trimmed, ts: Date.now() };
    const nextHistory = [...messages, userMsg];
    setMessages([...nextHistory, { role: "assistant", content: "", ts: Date.now() }]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc, ts: copy[copy.length - 1].ts };
          return copy;
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last.role === "assistant" && !last.content) copy.pop();
          return copy;
        });
      } else {
        toast.error(err?.message || "Something went wrong");
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry, I couldn't reach the AI service just now. Please try again in a moment.",
            ts: Date.now(),
          };
          return copy;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [messages, streaming]);

  const stop = () => abortRef.current?.abort();

  const clearConversation = () => {
    stop();
    window.speechSynthesis?.cancel();
    setMessages([{ ...WELCOME, ts: Date.now() }]);
    toast.success("Conversation cleared");
  };

  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) send(finalText);
    };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const speak = (idx: number, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech isn't supported in this browser.");
      return;
    }
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/\*\*/g, "").replace(/##\s+/g, ""));
    utter.rate = 1;
    utter.onend = () => setSpeakingIdx((cur) => (cur === idx ? null : cur));
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
  };

  const showQuickActions = messages.length <= 1;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <PageHeader
        title="AI Healthcare Partner"
        subtitle="Ask about health, reports, medicines, recovery, appointments, or caregiver wellness."
        actions={
          <Button variant="outline" size="sm" onClick={clearConversation} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((m, i) => {
            const emergency = m.role === "assistant" && isEmergency(m.content);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-bg text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={cn("group max-w-[80%] space-y-1", m.role === "user" && "items-end")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm",
                      m.role === "user"
                        ? "gradient-bg text-white"
                        : emergency
                          ? "border border-destructive/40 bg-destructive/10 text-foreground"
                          : "bg-muted"
                    )}
                  >
                    {emergency && (
                      <div className="mb-2 flex items-center gap-1.5 font-semibold text-destructive">
                        <AlertTriangle className="h-4 w-4" /> Possible medical emergency
                      </div>
                    )}
                    {m.role === "assistant"
                      ? (m.content ? <RichText text={m.content} /> : <TypingDots />)
                      : <p className="whitespace-pre-wrap">{m.content}</p>}
                  </div>
                  <div className={cn("flex items-center gap-2 px-1 text-[10px] text-muted-foreground", m.role === "user" && "justify-end")}>
                    <span>{formatTime(m.ts)}</span>
                    {m.role === "assistant" && m.content && (
                      <button
                        onClick={() => speak(i, m.content)}
                        className="opacity-0 transition group-hover:opacity-100 hover:text-foreground"
                        aria-label={speakingIdx === i ? "Stop reading" : "Read aloud"}
                      >
                        {speakingIdx === i ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {showQuickActions && (
          <div className="border-t p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Quick actions
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => send(a.prompt)}
                  className="flex items-center gap-2 rounded-xl border bg-background/60 p-2.5 text-left text-xs font-medium transition hover:border-primary/50 hover:bg-muted"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg gradient-bg text-white">
                    <a.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{a.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border bg-background/60 px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <CardContent className="border-t p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              variant={listening ? "default" : "ghost"}
              size="icon"
              onClick={toggleVoiceInput}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              className={cn(listening && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about symptoms, medicines, reports, caregiving…"
              className="border-0 bg-muted/60 focus-visible:ring-1"
              disabled={streaming}
            />
            {streaming ? (
              <Button type="button" onClick={stop} variant="outline" size="icon" aria-label="Stop">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="gradient-bg text-white" size="icon" aria-label="Send" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          <p className="mt-2 px-1 text-[10px] text-muted-foreground">
            Educational information only — not a substitute for professional medical advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}