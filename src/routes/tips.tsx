import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Send, Bot, User as UserIcon, ShieldCheck, Landmark, TrendingUp, Bitcoin, PiggyBank, Lightbulb } from "lucide-react";
import { askTipsMoney } from "@/lib/finwise/tips.functions";
import { useFinwise } from "@/lib/finwise/store";
import { brl } from "@/lib/finwise/format";
import { toast } from "sonner";

export const Route = createFileRoute("/tips")({
  head: () => ({ meta: [{ title: "TipsMoney — Controle Financeiro" }] }),
  component: TipsPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function TipsPage() {
  const { t, i18n } = useTranslation();
  const ask = useServerFn(askTipsMoney);
  const { transactions } = useFinwise();
  const balance = useMemo(() => {
    let v = 0;
    for (const tx of transactions) v += tx.type === "entrada" ? tx.amount : -tx.amount;
    return v;
  }, [transactions]);
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
      if ((res as any).error) {
        const code = (res as any).error;
        if (code === "rate_limited") toast.error(t("tips.errors.rate"));
        else if (code === "payment_required") toast.error(t("tips.errors.credits"));
        else toast.error(t("tips.errors.generic"));
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: res.reply || "…" }]);
      }
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500 text-white shadow-lg">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("tips.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("tips.subtitle")}</p>
        </div>
      </header>

      <InvestmentGuide balance={balance} />

      <Card className="flex h-[70vh] flex-col overflow-hidden">
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
                        : "bg-muted/60 text-foreground max-h-96 overflow-y-auto"
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

type InvestCategory = {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  desc: string;
  details: { name: string; about: string }[];
};

const CATEGORIES: InvestCategory[] = [
  {
    key: "fixa",
    title: "Renda Fixa",
    icon: Landmark,
    color: "#3B82F6",
    desc: "Investimentos com regras de remuneração definidas no momento da aplicação. Indicados para quem busca previsibilidade e baixo risco.",
    details: [
      { name: "Tesouro Direto", about: "Títulos públicos do governo federal, considerados o investimento mais seguro do país. Há opções pós-fixadas (Selic), prefixadas e atreladas à inflação (IPCA+)." },
      { name: "CDB", about: "Certificado de Depósito Bancário. Empréstimo que você faz ao banco e recebe com juros. Protegido pelo FGC até R$ 250 mil por instituição." },
      { name: "LCI / LCA", about: "Letras de Crédito Imobiliário/Agronegócio. Renda fixa isenta de Imposto de Renda para pessoa física, também coberta pelo FGC." },
    ],
  },
  {
    key: "variavel",
    title: "Renda Variável",
    icon: TrendingUp,
    color: "#10B981",
    desc: "Investimentos cujo retorno não é previsível. Têm maior potencial de ganho no longo prazo, mas oscilam no curto prazo.",
    details: [
      { name: "Ações", about: "Frações de empresas listadas na bolsa (B3). Você se torna sócio e participa dos resultados via valorização e dividendos." },
      { name: "FIIs", about: "Fundos de Investimento Imobiliário. Permitem investir em imóveis ou recebíveis com pouco capital e receber rendimentos mensais geralmente isentos de IR." },
      { name: "ETFs", about: "Fundos negociados em bolsa que replicam índices (ex.: BOVA11 segue o Ibovespa). Diversificação automática com baixo custo." },
    ],
  },
  {
    key: "cripto",
    title: "Criptomoedas",
    icon: Bitcoin,
    color: "#F59E0B",
    desc: "Ativos digitais descentralizados como Bitcoin e Ethereum. Alta volatilidade — invista apenas valores que esteja disposto a ver oscilar bastante.",
    details: [
      { name: "Bitcoin (BTC)", about: "Primeira e maior criptomoeda. Vista por muitos como reserva de valor digital, com oferta limitada a 21 milhões de unidades." },
      { name: "Ethereum (ETH)", about: "Plataforma para contratos inteligentes e aplicações descentralizadas. Base de boa parte do ecossistema cripto." },
      { name: "Stablecoins", about: "Criptos atreladas a moedas (ex.: USDT, USDC ao dólar). Servem para reduzir volatilidade e movimentar valores entre exchanges." },
    ],
  },
  {
    key: "reserva",
    title: "Reserva de Emergência",
    icon: ShieldCheck,
    color: "#8B5CF6",
    desc: "Dinheiro guardado com liquidez imediata para imprevistos. Deve ser a primeira meta antes de qualquer outro investimento.",
    details: [
      { name: "Quanto guardar", about: "Entre 3 e 6 meses dos seus gastos mensais essenciais. Autônomos podem precisar de 6 a 12 meses." },
      { name: "Onde guardar", about: "Tesouro Selic, CDB de liquidez diária com 100% do CDI ou contas remuneradas. Evite ativos voláteis ou com carência." },
      { name: "Quando usar", about: "Somente em emergências reais: desemprego, problemas de saúde, reparos urgentes. Reponha o valor assim que possível." },
    ],
  },
];

function InvestmentGuide({ balance }: { balance: number }) {
  const needsReserve = balance <= 0;
  const tipText = needsReserve
    ? "Você ainda não tem saldo positivo registrado. Comece pela Reserva de Emergência: priorize guardar antes de investir em renda variável ou cripto."
    : `Você já tem ${brl(balance)} de saldo positivo. Considere alocar parte na Reserva de Emergência (3 a 6 meses de gastos) antes de partir para Renda Variável ou Cripto.`;

  return (
    <section className="flex flex-col gap-4">
      <Card className="overflow-hidden border-0 text-white" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 60%, #06B6D4 100%)" }}>
        <CardContent className="flex items-start gap-3 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-white/80">Dica baseada no seu perfil</p>
            <p className="mt-1 text-sm leading-relaxed">{tipText}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.key} className="overflow-hidden" style={{ borderColor: `${cat.color}40` }}>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${cat.color}1A`, color: cat.color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold tracking-tight">{cat.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{cat.desc}</p>
                <Accordion type="single" collapsible className="mt-2">
                  <AccordionItem value="more" className="border-b-0">
                    <AccordionTrigger className="py-2 text-xs font-medium" style={{ color: cat.color }}>Saiba mais</AccordionTrigger>
                    <AccordionContent>
                      <ul className="flex flex-col gap-2 pt-1">
                        {cat.details.map((d) => (
                          <li key={d.name} className="rounded-md border border-border/60 bg-muted/30 p-2 text-xs">
                            <div className="mb-0.5 font-semibold text-foreground">{d.name}</div>
                            <div className="text-muted-foreground">{d.about}</div>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

// PiggyBank import keeps lucide tree-shake happy if reused
void PiggyBank;
