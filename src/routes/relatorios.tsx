import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useFinwise } from "@/lib/finwise/store";
import type { Transaction } from "@/lib/finwise/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { brl, formatDate } from "@/lib/finwise/format";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Controle Financeiro" }] }),
  component: Relatorios,
});

type Summary = { totalIn: number; totalOut: number; balance: number; count: number };
type Report = {
  id: number;
  year: number;
  month: number;
  summary: Summary;
  transactions: Transaction[];
  created_at: string;
};

function Relatorios() {
  const { t } = useTranslation();
  const { session, categories } = useFinwise();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const months = t("relatorios.months", { returnObjects: true }) as string[];

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select("id,year,month,summary,transactions,created_at")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) {
        toast.error(toUserMessage(error, t("relatorios.loadFail")));
      } else {
        setReports((data ?? []) as unknown as Report[]);
      }
      setLoading(false);
    })();
  }, [session, t]);

  const exportXlsx = (r: Report) => {
    const catName = (id?: string) => categories.find((c) => c.id === id)?.name ?? "—";
    const summaryRows = [
      [t("relatorios.xlsx.month"), `${months[r.month - 1]} ${r.year}`],
      [t("relatorios.xlsx.totalIn"), r.summary.totalIn],
      [t("relatorios.xlsx.totalOut"), r.summary.totalOut],
      [t("relatorios.xlsx.balance"), r.summary.balance],
      [t("relatorios.xlsx.count"), r.summary.count],
    ];
    const txRows = [
      [t("relatorios.xlsx.date"), t("relatorios.xlsx.type"), t("relatorios.xlsx.category"), t("relatorios.xlsx.description"), t("relatorios.xlsx.value")],
      ...r.transactions.map((tx) => [
        tx.date,
        tx.type === "entrada" ? t("relatorios.xlsx.income") : t("relatorios.xlsx.expense"),
        catName(tx.categoryId),
        tx.description,
        tx.amount,
      ]),
    ];
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, t("relatorios.xlsx.summary"));
    const wsTx = XLSX.utils.aoa_to_sheet(txRows);
    wsTx["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTx, t("relatorios.xlsx.transactions"));
    XLSX.writeFile(wb, `relatorio-${r.year}-${String(r.month).padStart(2, "0")}.xlsx`);
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("relatorios.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("relatorios.subtitle")}</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("relatorios.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">{months[r.month - 1]} {r.year}</CardTitle>
                <p className="text-xs text-muted-foreground">{t("relatorios.archivedOn", { date: formatDate(r.created_at.slice(0, 10)) })}</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Stat icon={<ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />} label={t("relatorios.income")} value={brl(r.summary.totalIn)} />
                  <Stat icon={<ArrowDownCircle className="h-3.5 w-3.5 text-rose-400" />} label={t("relatorios.expenses")} value={brl(r.summary.totalOut)} />
                  <Stat icon={<Wallet className="h-3.5 w-3.5 text-sky-400" />} label={t("relatorios.balance")} value={brl(r.summary.balance)} />
                </div>
                <p className="text-xs text-muted-foreground">{t("relatorios.recordsCount", { count: r.summary.count })}</p>
                <Button size="sm" variant="outline" onClick={() => exportXlsx(r)}>
                  <Download className="h-4 w-4" /> {t("relatorios.exportXlsx")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
