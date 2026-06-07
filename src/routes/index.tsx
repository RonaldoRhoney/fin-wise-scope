import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFinwise } from "@/lib/finwise/store";
import { applyFilters, dailyExpenses, expensesByCategory, periodRange } from "@/lib/finwise/selectors";
import { brl, formatDate } from "@/lib/finwise/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, PieChart as PieIcon, Plus, Sparkles, TrendingUp, LineChart as LineIcon, BarChart3, AreaChart as AreaIcon } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { TransactionFormDialog } from "@/components/finwise/TransactionFormDialog";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Controle Financeiro" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const { transactions, categories, filters, setFilters } = useFinwise();
  const [loading, setLoading] = useState(false);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    setLoading(true);
    const tm = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(tm);
  }, [filters.period, filters.categoryId]);

  const dashFilters = { ...filters, search: "", type: "all" as const };
  const filtered = useMemo(() => applyFilters(transactions, dashFilters), [transactions, filters.period, filters.categoryId]);

  const totalIn = filtered.filter((tx) => tx.type === "entrada").reduce((s, tx) => s + tx.amount, 0);
  const totalOut = filtered.filter((tx) => tx.type === "despesa").reduce((s, tx) => s + tx.amount, 0);
  const { days } = periodRange(filters.period, transactions);
  const avgDaily = totalOut / days;

  const byCat = expensesByCategory(filtered, categories);
  const topCat = byCat[0];

  const daily = dailyExpenses(filtered, filters);
  const peak = daily.reduce((acc, d) => (d.total > acc.total ? d : acc), { date: "", label: "", total: 0 });

  const insights: string[] = [];
  if (topCat && totalOut > 0) {
    const pct = ((topCat.total / totalOut) * 100).toFixed(0);
    insights.push(t("dashboard.insights.topCategoryPct", { name: topCat.name, pct }));
  }
  if (avgDaily > 0) insights.push(t("dashboard.insights.avgDaily", { value: brl(avgDaily) }));
  if (peak.total > 0) insights.push(t("dashboard.insights.peakDay", { value: brl(peak.total), date: formatDate(peak.date) }));
  if (topCat && topCat.total > 0) insights.push(t("dashboard.insights.reduceTip", { name: topCat.name, value: brl(topCat.total * 0.1) }));

  const hasData = filtered.length > 0;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {(["7d", "30d", "all"] as const).map((p) => (
              <Button key={p} size="sm" variant={filters.period === p ? "default" : "ghost"} onClick={() => setFilters({ period: p })}>
                {t(`dashboard.period.${p}`)}
              </Button>
            ))}
          </div>
          <Select value={filters.categoryId} onValueChange={(v) => setFilters({ categoryId: v })}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dashboard.allCategories")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi loading={loading} icon={<ArrowUpCircle className="h-5 w-5 text-emerald-500" />} label={t("dashboard.kpi.totalIn")} value={brl(totalIn)} tone="emerald" />
        <Kpi loading={loading} icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />} label={t("dashboard.kpi.totalOut")} value={brl(totalOut)} tone="red" />
        <Kpi loading={loading} icon={<CalendarDays className="h-5 w-5 text-blue-500" />} label={t("dashboard.kpi.avgDaily")} value={brl(avgDaily)} tone="blue" />
        <Kpi loading={loading} icon={<PieChart className="h-5 w-5 text-purple-500" />} label={t("dashboard.kpi.topCategory")} value={topCat ? topCat.name : "—"} sub={topCat ? brl(topCat.total) : undefined} tone="purple" />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> {t("dashboard.charts.dailySpending")}</CardTitle>
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
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                  <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label={t("common.noDataShort")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><PieChart className="h-4 w-4" /> {t("dashboard.charts.expensesByCategory")}</CardTitle>
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
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                  <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label={t("common.noDataShort")} />
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> {t("dashboard.insights.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasData && insights.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {insights.slice(0, 4).map((tx, i) => (
                  <li key={i} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">{tx}</li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
                {t("common.noData")}
                <Button onClick={() => setOpenNew(true)} size="sm"><Plus className="h-4 w-4" /> {t("dashboard.insights.addRecord")}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <TransactionFormDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}

type KpiTone = "emerald" | "red" | "blue" | "purple";
const toneStyles: Record<KpiTone, { ring: string; text: string; bg: string }> = {
  emerald: { ring: "hover:border-emerald-500/50", text: "text-emerald-500", bg: "bg-emerald-500/10" },
  red:     { ring: "hover:border-red-500/50",     text: "text-red-500",     bg: "bg-red-500/10" },
  blue:    { ring: "hover:border-blue-500/50",    text: "text-blue-500",    bg: "bg-blue-500/10" },
  purple:  { ring: "hover:border-purple-500/50",  text: "text-purple-500",  bg: "bg-purple-500/10" },
};

function Kpi({ loading, icon, label, value, sub, tone }: { loading: boolean; icon: React.ReactNode; label: string; value: string; sub?: string; tone?: KpiTone }) {
  const ts = tone ? toneStyles[tone] : null;
  return (
    <Card className={`transition-all ${ts?.ring ?? "hover:border-primary/40"}`}>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{label}</span>
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${ts?.bg ?? ""}`}>{icon}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-32" />
        ) : (
          <>
            <div className={`text-2xl font-semibold tracking-tight ${ts?.text ?? ""}`}>{value}</div>
            {sub && <div className={`mt-1 text-xs font-medium ${ts?.text ?? "text-muted-foreground"}`}>{sub}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
