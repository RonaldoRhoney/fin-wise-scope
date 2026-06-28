import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Bot, ExternalLink, GraduationCap, Sparkles, Play, Square, Type, Gauge } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { personalizeEducation } from "@/lib/finwise/agents/education.functions";

export const Route = createFileRoute("/educacao")({
  component: EducacaoPage,
});

type Concept = { title: string; body: string };

const CONCEPTS: Concept[] = [
  {
    title: "Renda fixa e renda variável",
    body: "Renda fixa reúne aplicações cuja regra de remuneração é definida no momento da aplicação (pré ou pós-fixada). Renda variável engloba ativos cujo valor oscila no mercado, como ações e fundos imobiliários, sem garantia de retorno.",
  },
  {
    title: "O que é o Tesouro Direto",
    body: "É um programa do Tesouro Nacional para a venda de títulos públicos federais a pessoas físicas pela internet. Os títulos possuem diferentes prazos e formas de rentabilidade, e são considerados de baixo risco de crédito.",
  },
  {
    title: "Corretoras de valores",
    body: "Corretoras são instituições autorizadas pela CVM a intermediar a compra e venda de ativos financeiros. Elas oferecem acesso ao mercado, custódia e plataformas de negociação, e são fiscalizadas por órgãos reguladores.",
  },
  {
    title: "Diversificação de investimentos",
    body: "Consiste em distribuir aplicações entre diferentes classes de ativos, setores e prazos. O objetivo é reduzir a exposição a um único risco específico, e não garante retorno nem elimina perdas.",
  },
  {
    title: "Riscos e volatilidade",
    body: "Todo investimento envolve algum grau de risco, incluindo possibilidade de perda do capital. Volatilidade descreve a intensidade das oscilações de preço de um ativo ao longo do tempo e deve ser avaliada conforme o perfil do investidor.",
  },
];

type Source = {
  name: string;
  url: string;
  description: string;
  color: string;
  initials: string;
};

const SOURCES: Source[] = [
  {
    name: "B3",
    url: "https://www.b3.com.br",
    description: "Bolsa de valores oficial do Brasil.",
    color: "#0a2540",
    initials: "B3",
  },
  {
    name: "Nubank",
    url: "https://www.nubank.com.br",
    description: "Instituição financeira regulamentada pelo Banco Central.",
    color: "#820ad1",
    initials: "Nu",
  },
  {
    name: "Itaú",
    url: "https://www.itau.com.br",
    description: "Instituição financeira regulamentada pelo Banco Central.",
    color: "#ec7000",
    initials: "IT",
  },
  {
    name: "Banco Inter",
    url: "https://www.bancointer.com.br",
    description: "Instituição financeira regulamentada pelo Banco Central.",
    color: "#ff7a00",
    initials: "IN",
  },
  {
    name: "Binance",
    url: "https://www.binance.com",
    description:
      "Plataforma de criptoativos. Importante: criptoativos não são regulamentados como valores mobiliários no Brasil e apresentam alta volatilidade.",
    color: "#f0b90b",
    initials: "BN",
  },
];

const DISCLAIMER_TEXT =
  "Aviso importante. Este conteúdo tem finalidade exclusivamente educacional e informativa. Não constitui oferta, recomendação, consultoria ou análise de investimento, nos termos da Resolução CVM número 19 de 2021. Investimentos envolvem riscos, incluindo perda do capital investido. Antes de tomar decisões financeiras, consulte um profissional certificado e avalie seu perfil de investidor.";

function buildFullReading(): string {
  const intro =
    "Educação Financeira. Conteúdo informativo para ampliar seu conhecimento sobre o mercado financeiro.";
  const concepts = CONCEPTS.map((c) => `${c.title}. ${c.body}`).join(" ");
  const sourcesIntro =
    "Para saber mais. Os links a seguir levam a sites oficiais e plataformas regulamentadas.";
  const sources = SOURCES.map((s) => `${s.name}. ${s.description}`).join(" ");
  return [DISCLAIMER_TEXT, intro, "Conceitos básicos.", concepts, sourcesIntro, sources].join(" ");
}

const FONT_STEPS = [
  { label: "A", scale: 1 },
  { label: "A+", scale: 1.15 },
  { label: "A++", scale: 1.3 },
  { label: "A+++", scale: 1.5 },
] as const;

const RATE_STEPS = [
  { label: "0,75x", rate: 0.75 },
  { label: "1x", rate: 1 },
  { label: "1,25x", rate: 1.25 },
  { label: "1,5x", rate: 1.5 },
  { label: "1,75x", rate: 1.75 },
  { label: "2x", rate: 2 },
] as const;

function EducacaoPage() {
  const [isReading, setIsReading] = useState(false);
  const [fontIndex, setFontIndex] = useState(0);
  const [rateIndex, setRateIndex] = useState(1); // 1x padrão
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fullText = useMemo(() => buildFullReading(), []);
  const scale = FONT_STEPS[fontIndex].scale;

  // AGENT 4 — Education personalization (isolated, ordering only)
  const askPersonalize = useServerFn(personalizeEducation);
  const [intro, setIntro] = useState<string>("");
  const [orderedConcepts, setOrderedConcepts] = useState<Concept[]>(CONCEPTS);
  useEffect(() => {
    let active = true;
    const topics = CONCEPTS.map((c) => ({ id: c.title, title: c.title }));
    askPersonalize({ data: { topics } })
      .then((res) => {
        if (!active) return;
        setIntro(res.intro || "");
        if (res.order && res.order.length) {
          const map = new Map(CONCEPTS.map((c) => [c.title, c]));
          const next = res.order.map((id) => map.get(id)).filter(Boolean) as Concept[];
          if (next.length === CONCEPTS.length) setOrderedConcepts(next);
        }
      })
      .catch(() => { /* isolated */ });
    return () => { active = false; };
  }, [askPersonalize]);


  function pickPtVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => /pt[-_]BR/i.test(v.lang)) ||
      voices.find((v) => /^pt/i.test(v.lang)) ||
      null
    );
  }

  function startReading() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(fullText);
    u.lang = "pt-BR";
    u.rate = RATE_STEPS[rateIndex].rate;
    u.pitch = 1;
    u.volume = 1;
    const v = pickPtVoice();
    if (v) u.voice = v;
    u.onend = () => setIsReading(false);
    u.onerror = () => setIsReading(false);
    utterRef.current = u;
    setIsReading(true);
    // Some browsers need voices to be loaded asynchronously
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        const vv = pickPtVoice();
        if (vv) u.voice = vv;
        window.speechSynthesis.speak(u);
      };
    } else {
      window.speechSynthesis.speak(u);
    }
  }

  function stopReading() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsReading(false);
  }

  return (
    <div className="space-y-6" style={{ fontSize: `${scale}rem` }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Educação Financeira</h1>
        <p className="text-sm text-muted-foreground">
          Conteúdo informativo para ampliar seu conhecimento sobre o mercado financeiro
        </p>
      </div>

      {/* Reader & font controls */}
      <Card className="w-full border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
          <button
            type="button"
            onClick={isReading ? stopReading : startReading}
            disabled={!supported}
            aria-label={isReading ? "Parar leitura" : "Iniciar leitura em voz alta"}
            className="flex w-full items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-3 text-left transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              {isReading ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold text-foreground">
                {isReading ? "Tocar para parar a leitura" : "Tocar aqui para ouvir o conteúdo"}
              </span>
              <span className="text-xs text-muted-foreground">
                {supported
                  ? "Leitura em voz alta, calma e clara, em português."
                  : "Seu navegador não suporta leitura em voz alta."}
              </span>
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Gauge className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 p-1">
              {RATE_STEPS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setRateIndex(i);
                    if (isReading) {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(fullText);
                      u.lang = "pt-BR";
                      u.rate = RATE_STEPS[i].rate;
                      u.pitch = 1;
                      u.volume = 1;
                      const v = pickPtVoice();
                      if (v) u.voice = v;
                      u.onend = () => setIsReading(false);
                      u.onerror = () => setIsReading(false);
                      utterRef.current = u;
                      window.speechSynthesis.speak(u);
                    }
                  }}
                  aria-pressed={rateIndex === i}
                  aria-label={`Velocidade ${s.label}`}
                  className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                    rateIndex === i
                      ? "bg-emerald-500 text-white"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Type className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 p-1">
              {FONT_STEPS.map((s, i) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setFontIndex(i)}
                  aria-pressed={fontIndex === i}
                  aria-label={`Tamanho de fonte ${s.label}`}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    fontIndex === i
                      ? "bg-emerald-500 text-white"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky top-0 z-20 -mx-2 px-2 py-1 backdrop-blur">
        <Card className="border-amber-500/40 bg-amber-500/10 text-amber-100">
          <CardContent className="flex gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed sm:text-sm">
              Este conteúdo tem finalidade exclusivamente educacional e informativa. Não constitui
              oferta, recomendação, consultoria ou análise de investimento, nos termos da Resolução
              CVM nº 19/2021. Investimentos envolvem riscos, incluindo perda do capital investido.
              Antes de tomar decisões financeiras, consulte um profissional certificado
              (CVM/ANBIMA) e avalie seu perfil de investidor.
            </p>
          </CardContent>
        </Card>
      </div>

      {intro && (
        <Card className="border-violet-500/40 bg-violet-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Bot className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Agente Educação Financeira</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{intro}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GraduationCap className="h-5 w-5 text-emerald-400" />
          Conceitos básicos
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {orderedConcepts.map((c) => (
            <Card key={c.title} className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{c.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Para saber mais</h2>
          <p className="text-sm text-muted-foreground">
            Os links abaixo levam a sites oficiais e plataformas regulamentadas. O acesso é de
            responsabilidade do usuário.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCES.map((s) => (
            <Card key={s.name} className="flex flex-col border-border/60">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ background: s.color }}
                >
                  {s.initials}
                </div>
                <CardTitle className="text-base">{s.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3">
                <p className="text-xs text-muted-foreground">{s.description}</p>
                <Button asChild variant="outline" size="sm" className="self-start">
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    Acessar
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm text-foreground">
              Quer entender melhor seu perfil financeiro? Converse com o TipsMoney.
            </p>
          </div>
          <Button asChild className="bg-emerald-500 text-white hover:bg-emerald-600">
            <Link to="/tips">Conversar com TipsMoney</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
