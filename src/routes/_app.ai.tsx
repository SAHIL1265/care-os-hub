import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Mic, Send, Sparkles, FileHeart, Pill, Stethoscope, Brain, Salad } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { initialChat } from "@/lib/demo-data";

export const Route = createFileRoute("/_app/ai")({
  head: () => ({ meta: [{ title: "AI Assistant · CareOS AI" }] }),
  component: AiAssistant,
});

const suggestions = [
  { icon: Stethoscope, label: "Check my symptoms" },
  { icon: Pill, label: "Explain a medicine" },
  { icon: FileHeart, label: "Analyze my report" },
  { icon: Brain, label: "I feel stressed" },
  { icon: Salad, label: "Nutrition advice" },
];

const canned: Record<string, string> = {
  default: "I've reviewed your latest vitals. Everything looks stable. Would you like me to compare with your previous week or explain a specific value?",
};

function AiAssistant() {
  const [messages, setMessages] = useState(initialChat as Array<{ role: "user" | "assistant"; content: string }>);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: canned.default }]);
      setTyping(false);
    }, 1200);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
      <PageHeader title="AI Health Assistant" subtitle="Symptom check, medicines, reports and wellness — always with you." />

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-bg text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "gradient-bg text-white" : "bg-muted"}`}>
                {m.content}
              </div>
            </motion.div>
          ))}
          {typing && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-bg text-white"><Bot className="h-4 w-4" /></div>
              <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {messages.length < 2 && (
          <div className="border-t p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" /> Try one of these</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button key={s.label} variant="outline" size="sm" onClick={() => send(s.label)} className="gap-1.5">
                  <s.icon className="h-3.5 w-3.5" />{s.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <CardContent className="border-t p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2"
          >
            <Button type="button" variant="ghost" size="icon" aria-label="Voice"><Mic className="h-5 w-5" /></Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about symptoms, medicines, reports…"
              className="border-0 bg-muted/60 focus-visible:ring-1"
            />
            <Button type="submit" className="gradient-bg text-white" size="icon" aria-label="Send"><Send className="h-4 w-4" /></Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
