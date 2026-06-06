import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { askTipsMoney } from "@/lib/finwise/tips.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/tips")({
  head: () => ({ meta: [{ title: "TipsMoney — Controle Financeiro" }] }),
  component: TipsPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function TipsPage() {
  const { t, i18n } = useTranslation();
  const ask = useServerFn(askTipsMoney);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: t("tips.welcome") },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const lang = (i18n.language?.startsWith("en")
        ? "en-US"
        : i18n.language?.startsWith("es")
        ? "es-ES"
        : "pt-BR") as "pt-BR" | "en-US" | "es-ES";
      const res = await ask({
        data: {
          messages: next.filter((m) => m.role !== "assistant" || m.content.length > 0).slice(-20),
          language: lang,
        },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply || "…" }]);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("rate_limited")) toast.error(t("tips.errors.rate"));
      else if (msg.includes("payment_required")) toast.error(t("tips.errors.credits"));
      else toast.error(t("tips.errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    t("tips.suggestions.s1"),
    t("tips.suggestions.s2"),
    t("tips.suggestions.s3"),
    t("tips.suggestions.s4"),
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col p-4 sm:p-6 lg:h-screen lg:p-8">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500 text-white shadow-lg">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("tips.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("tips.subtitle")}</p>
        </div>
      </header>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-0 p-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user"
                        ? "bg-primary/15 text-primary"
                        : "bg-gradient-to-br from-violet-500 to-emerald-500 text-white"
                    }`}
                  >
                    {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:my-2">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-current" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {messages.length <= 1 && !loading && (
            <div className="border-t border-border/60 p-3 sm:p-4">
              <div className="mb-2 text-xs text-muted-foreground">{t("tips.tryAsking")}</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <Button key={i} variant="outline" size="sm" onClick={() => send(s)} className="rounded-full">
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-border/60 p-3 sm:p-4"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("tips.inputPlaceholder")}
              disabled={loading}
              maxLength={2000}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
