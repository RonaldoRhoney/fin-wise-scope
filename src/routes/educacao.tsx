import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ExternalLink, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function EducacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Educação Financeira</h1>
        <p className="text-sm text-muted-foreground">
          Conteúdo informativo para ampliar seu conhecimento sobre o mercado financeiro
        </p>
      </div>

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

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <GraduationCap className="h-5 w-5 text-emerald-400" />
          Conceitos básicos
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CONCEPTS.map((c) => (
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
