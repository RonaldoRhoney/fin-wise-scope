import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFinwise } from "@/lib/finwise/store";
import { applyFilters, dailyExpenses, expensesByCategory, incomeByCategory, periodRange } from "@/lib/finwise/selectors";
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
import { AnimatedNumber } from "@/components/finwise/AnimatedNumber";
import rhoneyLogo from "@/assets/rhoneyinc-logo.png.asset.json";


export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Controle Financeiro" }] }),
  component: Dashboard,
});

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-md" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}>
      <p className="mb-1 text-sm font-semibold" style={{ color: data.color }}>{data.name}</p>
      <div className="space-y-0.5 text-xs">
        {data.income > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#10B981" }} />
            <span className="text-muted-foreground">Entradas:</span>
            <span className="font-medium tabular-nums" style={{ color: "#10B981" }}>{brl(data.income)}</span>
          </div>
        )}
        {data.expense > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#EF4444" }} />
            <span className="text-muted-foreground">Saídas:</span>
            <span className="font-medium tabular-nums" style={{ color: "#EF4444" }}>{brl(data.expense)}</span>
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 border-t border-border pt-1">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold tabular-nums">{brl(data.total)}</span>
        </div>
      </div>
    </div>
  );
}

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

  // KPIs ignoram filtro de categoria (para não esconder Entradas sem categoria)
  const periodTx = useMemo(
    () => applyFilters(transactions, { ...filters, categoryId: "all", search: "", type: "all" }),
    [transactions, filters.period],
  );
  // Gráficos respeitam categoria selecionada
  const filtered = useMemo(
    () => applyFilters(transactions, { ...filters, search: "", type: "all" }),
    [transactions, filters.period, filters.categoryId],
  );

  const totalIn = periodTx.filter((tx) => tx.type === "entrada").reduce((s, tx) => s + tx.amount, 0);
  const totalOut = periodTx.filter((tx) => tx.type === "despesa").reduce((s, tx) => s + tx.amount, 0);
  const { days } = periodRange(filters.period, transactions);
  const avgDaily = totalOut / days;

  const byCat = expensesByCategory(filtered, categories);
  const byCatIncome = incomeByCategory(filtered, categories);
  const topCat = byCat[0];

  const combinedCatMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; income: number; expense: number; total: number }>();
    byCat.forEach((c) => {
      map.set(c.id, { name: c.name, color: c.color, income: 0, expense: c.total, total: c.total });
    });
    byCatIncome.forEach((c) => {
      const existing = map.get(c.id);
      if (existing) {
        existing.income = c.total;
        existing.total = existing.expense + c.total;
      } else {
        map.set(c.id, { name: c.name, color: c.color, income: c.total, expense: 0, total: c.total });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [byCat, byCatIncome]);

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
        <div className="flex items-center gap-3">
          <img
            src={rhoneyLogo.url}
            alt="RhoneyInc"
            className="h-12 w-12 shrink-0 rounded-lg object-contain shadow-sm ring-1 ring-border/60"
          />
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

      <section className="mb-4">
        <BalanceCard loading={loading} balance={totalIn - totalOut} label={t("dashboard.kpi.currentBalance", "Saldo atual")} />
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4">
        <Kpi loading={loading} icon={<ArrowUpCircle className="h-5 w-5" style={{ color: "#10B981" }} />} label={t("dashboard.kpi.totalIn")} numericValue={totalIn} color="#10B981" />
        <Kpi loading={loading} icon={<ArrowDownCircle className="h-5 w-5" style={{ color: "#EF4444" }} />} label={t("dashboard.kpi.totalOut")} numericValue={totalOut} color="#EF4444" />
        <Kpi loading={loading} icon={<CalendarDays className="h-5 w-5" style={{ color: "#3B82F6" }} />} label={t("dashboard.kpi.avgDaily")} numericValue={avgDaily} color="#3B82F6" />
        <Kpi loading={loading} icon={<PieIcon className="h-5 w-5" style={{ color: "#8B5CF6" }} />} label={t("dashboard.kpi.topCategory")} value={topCat ? topCat.name : "—"} numericSub={topCat ? topCat.total : undefined} color="#8B5CF6" />
      </section>


      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <SwitchableChart
          title={t("dashboard.charts.dailySpending")}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={loading}
          empty={!daily.some((d) => d.total > 0)}
          emptyLabel={t("common.noDataShort")}
          types={["line", "area", "bar"]}
          render={(type) => {
            if (type === "area") return (
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            );
            if (type === "bar") return (
              <BarChart data={daily} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            );
            return (
              <LineChart data={daily} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            );
          }}
        />

        <SwitchableChart
          title={t("dashboard.charts.expensesByCategory")}
          icon={<PieIcon className="h-4 w-4" />}
          loading={loading}
          empty={byCat.length === 0}
          emptyLabel={t("common.noDataShort")}
          types={["pie", "bar", "line"]}
          render={(type) => {
            if (type === "pie") return (
              <PieChart>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie data={combinedCatMap} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                  {combinedCatMap.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
              </PieChart>
            );
            if (type === "line") return (
              <LineChart data={byCat} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            );
            return (
              <BarChart data={byCat} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => brl(v)} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {byCat.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            );
          }}
        />
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


function Kpi({ loading, icon, label, value, sub, numericValue, numericSub, color }: { loading: boolean; icon: React.ReactNode; label: string; value?: string; sub?: string; numericValue?: number; numericSub?: number; color: string }) {
  return (
    <Card className="animate-fade-in transition-all hover:shadow-md" style={{ borderColor: `${color}40` }}>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">{label}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1A` }}>{icon}</span>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-32" />
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
      className="overflow-hidden border-0 text-white"
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



function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

type ChartType = "line" | "bar" | "pie" | "area";

function SwitchableChart({
  title, icon, loading, empty, emptyLabel, types, render,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  empty: boolean;
  emptyLabel: string;
  types: ChartType[];
  render: (type: ChartType) => React.ReactElement;
}) {
  const [type, setType] = useState<ChartType>(types[0]);
  const iconMap: Record<ChartType, React.ReactNode> = {
    line: <LineIcon className="h-3.5 w-3.5" />,
    bar: <BarChart3 className="h-3.5 w-3.5" />,
    pie: <PieIcon className="h-3.5 w-3.5" />,
    area: <AreaIcon className="h-3.5 w-3.5" />,
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
          {types.map((tp) => (
            <Button key={tp} size="icon" variant={type === tp ? "default" : "ghost"} className="h-7 w-7" onClick={() => setType(tp)} aria-label={tp}>
              {iconMap[tp]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-[280px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : empty ? (
          <EmptyChart label={emptyLabel} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {render(type)}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
