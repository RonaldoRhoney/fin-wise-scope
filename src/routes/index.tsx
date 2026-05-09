import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useFinwise } from "@/lib/finwise/store";
import { applyFilters, dailyExpenses, expensesByCategory, periodRange } from "@/lib/finwise/selectors";
import { brl, formatDate } from "@/lib/finwise/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, PieChart, Plus, Sparkles, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { TransactionFormDialog } from "@/components/finwise/TransactionFormDialog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — FinWise" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { transactions, categories, filters, setFilters } = useFinwise();
  const [loading, setLoading] = useState(false);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [filters.period, filters.categoryId]);

  // For dashboard: ignore search/type filters from registros page
  const dashFilters = { ...filters, search: "", type: "all" as const };
  const filtered = useMemo(() => applyFilters(transactions, dashFilters), [transactions, filters.period, filters.categoryId]);

  const totalIn = filtered.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
  const { days } = periodRange(filters.period, transactions);
  const avgDaily = totalOut / days;

  const byCat = expensesByCategory(filtered, categories);
  const topCat = byCat[0];

  const daily = dailyExpenses(filtered, filters);
  const peak = daily.reduce((acc, d) => (d.total > acc.total ? d : acc), { date: "", label: "", total: 0 });

  const insights: string[] = [];
  if (topCat && totalOut > 0) {
    const pct = ((topCat.total / totalOut) * 100).toFixed(0);
    insights.push(`A categoria ${topCat.name} representou ${pct}% das suas despesas no período.`);
  }
  if (avgDaily > 0) insights.push(`Sua média diária de gastos foi de ${brl(avgDaily)}.`);
  if (peak.total > 0) insights.push(`Seu maior gasto diário foi ${brl(peak.total)} em ${formatDate(peak.date)}.`);
  if (topCat && topCat.total > 0) insights.push(`Reduzindo 10% em ${topCat.name}, você economizaria ${brl(topCat.total * 0.1)}.`);

  const hasData = filtered.length > 0;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {(["7d", "30d", "all"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={filters.period === p ? "default" : "ghost"}
                onClick={() => setFilters({ period: p })}
              >
                {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "Total"}
              </Button>
            ))}
          </div>
          <Select value={filters.categoryId} onValueChange={(v) => setFilters({ categoryId: v })}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi loading={loading} icon={<ArrowUpCircle className="h-4 w-4 text-emerald-400" />} label="Total Entradas" value={brl(totalIn)} />
        <Kpi loading={loading} icon={<ArrowDownCircle className="h-4 w-4 text-rose-400" />} label="Total Saídas" value={brl(totalOut)} />
        <Kpi loading={loading} icon={<CalendarDays className="h-4 w-4 text-sky-400" />} label="Gasto médio diário" value={brl(avgDaily)} />
        <Kpi
          loading={loading}
          icon={<PieChart className="h-4 w-4 text-amber-400" />}
          label="Maior categoria"
          value={topCat ? topCat.name : "—"}
          sub={topCat ? brl(topCat.total) : undefined}
        />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Gasto por dia</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : daily.some((d) => d.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" stroke="currentColor" fontSize={11} tick={{ fill: "currentColor" }} />
                  <YAxis stroke="currentColor" fontSize={11} tick={{ fill: "currentColor" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><PieChart className="h-4 w-4" /> Despesa por categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : byCat.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCat} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" stroke="currentColor" fontSize={11} tick={{ fill: "currentColor" }} />
                  <YAxis stroke="currentColor" fontSize={11} tick={{ fill: "currentColor" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v: number) => brl(v)}
                  />
                  <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {hasData && insights.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {insights.slice(0, 4).map((t, i) => (
                  <li key={i} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">{t}</li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
                Sem dados no período selecionado.
                <Button onClick={() => setOpenNew(true)} size="sm"><Plus className="h-4 w-4" /> Adicionar registro</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <TransactionFormDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}

function Kpi({ loading, icon, label, value, sub }: { loading: boolean; icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="transition-all hover:border-primary/40">
      <CardContent className="p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-32" />
        ) : (
          <>
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
            {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Sem dados no período.
    </div>
  );
}
