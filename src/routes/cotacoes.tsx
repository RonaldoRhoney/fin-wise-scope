import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownRight, ArrowUpRight, RefreshCw, Banknote } from "lucide-react";
import { AnimatedNumber } from "@/components/finwise/AnimatedNumber";
import { brl } from "@/lib/finwise/format";

const fmtBRL = (v: number) => {
  if (!Number.isFinite(v) || v <= 0) return "Indisponível";
  if (v < 1) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(v);
  }
  return brl(v);
};

const isValidQuote = (q: { bid: number; high: number; low: number }) =>
  Number.isFinite(q.bid) && q.bid > 0 && Number.isFinite(q.high) && Number.isFinite(q.low);
import { toast } from "sonner";

export const Route = createFileRoute("/cotacoes")({
  head: () => ({ meta: [{ title: "Cotações — Controle Financeiro" }] }),
  component: CotacoesPage,
});

const PAIRS = [
  { code: "USD", name: "Dólar Americano", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "Libra Esterlina", flag: "🇬🇧" },
  { code: "BTC", name: "Bitcoin", flag: "₿" },
  { code: "ETH", name: "Ethereum", flag: "Ξ" },
] as const;

type Quote = {
  code: string;
  name: string;
  high: number;
  low: number;
  bid: number;
  pctChange: number;
  createDate: string;
};

type ApiItem = {
  code: string;
  codein: string;
  name: string;
  high: string;
  low: string;
  bid: string;
  pctChange: string;
  create_date: string;
};

const URL = `https://economia.awesomeapi.com.br/json/last/${PAIRS.map((p) => `${p.code}-BRL`).join(",")}`;

function CotacoesPage() {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchQuotes = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Falha na API");
      const data = (await res.json()) as Record<string, ApiItem>;
      const list: Quote[] = [];
      for (const p of PAIRS) {
        const item = data[`${p.code}BRL`];
        if (!item) continue;
        list.push({
          code: p.code,
          name: p.name,
          high: Number(item.high),
          low: Number(item.low),
          bid: Number(item.bid),
          pctChange: Number(item.pctChange),
          createDate: item.create_date,
        });
      }
      setQuotes(list);
      setUpdatedAt(new Date());
    } catch (e) {
      if (!silent) toast.error("Não foi possível carregar as cotações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes(true);
    const id = setInterval(() => fetchQuotes(true), 60_000);
    return () => clearInterval(id);
  }, [fetchQuotes]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cotações</h1>
            <p className="text-sm text-muted-foreground">
              {updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR")}` : "Carregando cotações…"}
            </p>
          </div>
        </div>
        <Button onClick={() => fetchQuotes(false)} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !quotes
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))
          : quotes?.map((q) => {
              const pair = PAIRS.find((p) => p.code === q.code)!;
              const valid = isValidQuote(q);
              const up = q.pctChange >= 0;
              const color = !valid ? "#9CA3AF" : up ? "#10B981" : "#EF4444";
              const time = q.createDate
                ? new Date(q.createDate.replace(" ", "T")).toLocaleTimeString("pt-BR")
                : "—";
              return (
                <Card key={q.code} className="animate-fade-in overflow-hidden transition-all hover:shadow-lg" style={{ borderColor: `${color}40` }}>
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-xl">{pair.flag}</span>
                        <div>
                          <div className="text-sm font-semibold tracking-tight">{q.name}</div>
                          <div className="text-xs text-muted-foreground">{q.code}/BRL</div>
                        </div>
                      </div>
                      {valid ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: `${color}1A`, color }}
                        >
                          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {q.pctChange.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          Indisponível
                        </span>
                      )}
                    </div>

                    <div className="text-2xl font-bold tracking-tight tabular-nums" style={{ color }}>
                      {valid ? <AnimatedNumber value={q.bid} format={fmtBRL} /> : "Indisponível"}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Máx: <span className="font-medium text-foreground">{fmtBRL(q.high)}</span></span>
                      <span>Mín: <span className="font-medium text-foreground">{fmtBRL(q.low)}</span></span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Atualizado às {time}</div>
                  </CardContent>
                </Card>
              );
            })}
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Dados fornecidos pela AwesomeAPI · Atualização automática a cada 60s
      </p>
    </div>
  );
}
