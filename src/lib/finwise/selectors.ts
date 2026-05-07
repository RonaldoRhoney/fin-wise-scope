import type { Category, Filters, Transaction } from "./types";

export function periodRange(period: Filters["period"], txs: Transaction[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === "7d" || period === "30d") {
    const days = period === "7d" ? 7 : 30;
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));
    return { start, end: today, days };
  }
  if (txs.length === 0) return { start: today, end: today, days: 1 };
  const dates = txs.map((t) => new Date(t.date + "T00:00:00").getTime());
  const start = new Date(Math.min(...dates));
  const end = new Date(Math.max(...dates));
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return { start, end, days };
}

export function applyFilters(txs: Transaction[], filters: Filters) {
  const { start, end } = periodRange(filters.period, txs);
  return txs.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    if (d < start || d > end) return false;
    if (filters.categoryId !== "all" && t.categoryId !== filters.categoryId) return false;
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

export function dailyExpenses(txs: Transaction[], filters: Filters) {
  const { start, days } = periodRange(filters.period, txs);
  const buckets: { date: string; label: string; total: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ date: iso, label, total: 0 });
  }
  txs
    .filter((t) => t.type === "despesa")
    .forEach((t) => {
      const b = buckets.find((x) => x.date === t.date);
      if (b) b.total += t.amount;
    });
  return buckets;
}

export function expensesByCategory(txs: Transaction[], categories: Category[]) {
  const map = new Map<string, number>();
  txs.filter((t) => t.type === "despesa").forEach((t) => {
    const k = t.categoryId || "sem";
    map.set(k, (map.get(k) ?? 0) + t.amount);
  });
  return Array.from(map.entries())
    .map(([id, total]) => ({
      id,
      name: categories.find((c) => c.id === id)?.name ?? "Sem categoria",
      color: categories.find((c) => c.id === id)?.color ?? "#64748b",
      total,
    }))
    .sort((a, b) => b.total - a.total);
}
