import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFinwise } from "@/lib/finwise/store";
import { applyFilters, dailyExpenses, expensesByCategory, incomeByCategory, periodRange } from "@/lib/finwise/selectors";
import { brl, formatDate } from "@/lib/finwise/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, PieChart as PieIcon, Plus, Sparkles, TrendingUp } from "lucide-react";
import { TransactionFormDialog } from "@/components/finwise/TransactionFormDialog";
import { AnimatedNumber } from "@/components/finwise/AnimatedNumber";
import rhoneyLogo from "@/assets/rhoneyinc-logo.png.asset.json";

const DashboardCharts = lazy(() => import("@/components/finwise/DashboardCharts"));

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Controle Financeiro" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const { transactions, categories, filters, setFilters, loading: storeLoading } = useFinwise();
  const navigate = useNavigate();
  const [openNew, setOpenNew] = useState(false);

  // Initial load only — filter changes do NOT re-trigger skeletons.
  const initialLoading = storeLoading && transactions.length === 0;

  const goToRegistros = (type: "entrada" | "despesa") => {
    setFilters({ type });
    navigate({ to: "/registros" });
  };

  // KPIs ignore category filter
  const periodTx = useMemo(
    () => applyFilters(transactions, { ...filters, categoryId: "all", search: "", type: "all" }),
    [transactions, filters.period],
  );
  // Charts respect category
  const filtered = useMemo(
    () => applyFilters(transactions, { ...filters, search: "", type: "all" }),
    [transactions, filters.period, filters.categoryId],
  );

  const { totalIn, totalOut, avgDaily, byCat, byCatIncome, daily, peak, topCat, combinedCatMap } = useMemo(() => {
    const totalIn = periodTx.filter((tx) => tx.type === "entrada").reduce((s, tx) => s + tx.amount, 0);
    const totalOut = periodTx.filter((tx) => tx.type === "despesa").reduce((s, tx) => s + tx.amount, 0);
    const { days } = periodRange(filters.period, transactions);
    const avgDaily = totalOut / days;
    const byCat = expensesByCategory(filtered, categories);
    const byCatIncome = incomeByCategory(filtered, categories);
    const topCat = byCat[0];
    const daily = dailyExpenses(filtered, filters);
    const peak = daily.reduce((acc, d) => (d.total > acc.total ? d : acc), { date: "", label: "", total: 0 });
    const map = new Map<string, { name: string; color: string; income: number; expense: number; total: number }>();
    byCat.forEach((c) => map.set(c.id, { name: c.name, color: c.color, income: 0, expense: c.total, total: c.total }));
    byCatIncome.forEach((c) => {
      const existing = map.get(c.id);
      if (existing) { existing.income = c.total; existing.total = existing.expense + c.total; }
      else map.set(c.id, { name: c.name, color: c.color, income: c.total, expense: 0, total: c.total });
    });
    const combinedCatMap = Array.from(map.values()).sort((a, b) => b.total - a.total);
    return { totalIn, totalOut, avgDaily, byCat, byCatIncome, daily, peak, topCat, combinedCatMap };
  }, [periodTx, filtered, categories, filters.period, transactions]);

  // Insights regenerate from current period/filter
  const insights = useMemo(() => {
    const out: string[] = [];
    if (topCat && totalOut > 0) {
      const pct = ((topCat.total / totalOut) * 100).toFixed(0);
      out.push(t("dashboard.insights.topCategoryPct", { name: topCat.name, pct }));
    }
    if (avgDaily > 0) out.push(t("dashboard.insights.avgDaily", { value: brl(avgDaily) }));
    if (peak.total > 0) out.push(t("dashboard.insights.peakDay", { value: brl(peak.total), date: formatDate(peak.date) }));
    if (topCat && topCat.total > 0) out.push(t("dashboard.insights.reduceTip", { name: topCat.name, value: brl(topCat.total * 0.1) }));
    return out;
  }, [topCat, totalOut, avgDaily, peak, t]);

  const hasData = filtered.length > 0;
  // Key changes on period/category — drives a subtle fade transition without removing content.
  const transitionKey = `${filters.period}|${filters.categoryId}`;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src={rhoneyLogo.url} alt="RhoneyInc" className="h-12 w-12 shrink-0 rounded-lg object-contain shadow-sm ring-1 ring-border/60" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
          </div>
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

      {/* Fade wrapper — content swaps smoothly when filters change, no blank flash. */}
      <div key={transitionKey} className="animate-fade-in">
        <section className="mb-4">
          <BalanceCard loading={initialLoading} balance={totalIn - totalOut} label={`${t("dashboard.kpi.currentBalance", "Saldo atual")} · ${t(`dashboard.period.${filters.period}`)}`} />
        </section>

        <section className="mb-6 grid grid-cols-2 gap-4">
          <Kpi loading={initialLoading} icon={<ArrowUpCircle className="h-5 w-5" style={{ color: "#10B981" }} />} label={t("dashboard.kpi.totalIn")} numericValue={totalIn} color="#10B981" onClick={() => goToRegistros("entrada")} />
          <Kpi loading={initialLoading} icon={<ArrowDownCircle className="h-5 w-5" style={{ color: "#EF4444" }} />} label={t("dashboard.kpi.totalOut")} numericValue={totalOut} color="#EF4444" onClick={() => goToRegistros("despesa")} />
          <Kpi loading={initialLoading} icon={<CalendarDays className="h-5 w-5" style={{ color: "#3B82F6" }} />} label={t("dashboard.kpi.avgDaily")} numericValue={avgDaily} color="#3B82F6" />
          <Kpi loading={initialLoading} icon={<PieIcon className="h-5 w-5" style={{ color: "#8B5CF6" }} />} label={t("dashboard.kpi.topCategory")} value={topCat ? topCat.name : "—"} numericSub={topCat ? topCat.total : undefined} color="#8B5CF6" />
        </section>

        <Suspense fallback={<ChartsSkeleton />}>
          <DashboardCharts
            daily={daily}
            byCat={byCat}
            combinedCatMap={combinedCatMap}
            labels={{
              daily: t("dashboard.charts.dailySpending"),
              byCategory: t("dashboard.charts.expensesByCategory"),
              noData: t("common.noDataShort"),
            }}
          />
        </Suspense>

        <section>
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> {t("dashboard.insights.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {initialLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : hasData && insights.length > 0 ? (
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
      </div>

      <TransactionFormDialog open={openNew} onOpenChange={setOpenNew} />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="h-[280px]"><Skeleton className="h-full w-full" /></CardContent>
        </Card>
      ))}
    </section>
  );
}

function Kpi({ loading, icon, label, value, sub, numericValue, numericSub, color, onClick }: { loading: boolean; icon: React.ReactNode; label: string; value?: string; sub?: string; numericValue?: number; numericSub?: number; color: string; onClick?: () => void }) {
  const interactive = !!onClick;
  return (
    <Card
      className={`animate-fade-in transition-all hover:shadow-md ${interactive ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2" : ""}`}
      style={{ borderColor: `${color}40` }}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1A` }}>{icon}</span>
        </div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </>
        ) : (
          <>
            <div className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl" style={{ color }}>
              {typeof numericValue === "number" ? <AnimatedNumber value={numericValue} format={brl} /> : value}
            </div>
            {(sub || typeof numericSub === "number") && (
              <div className="mt-1 text-xs font-medium tabular-nums" style={{ color }}>
                {typeof numericSub === "number" ? <AnimatedNumber value={numericSub} format={brl} /> : sub}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceCard({ loading, balance, label }: { loading: boolean; balance: number; label: string }) {
  const positive = balance >= 0;
  const color = positive ? "#3B82F6" : "#EF4444";
  return (
    <Card
      className="overflow-hidden border-0 text-white animate-fade-in"
      style={{
        background: positive
          ? "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 60%, #06B6D4 100%)"
          : "linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)",
        boxShadow: `0 20px 50px -20px ${color}80`,
      }}
    >
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-white/80">{label}</p>
            {loading ? (
              <Skeleton className="mt-3 h-10 w-48 bg-white/20" />
            ) : (
              <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl lg:text-5xl">
                <AnimatedNumber value={balance} format={brl} />
              </div>
            )}
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 sm:h-14 sm:w-14">
            <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
