import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
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
  head: () => ({ meta: [{ title: "Relatórios — Controle Financeiro" }] }),
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

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function Relatorios() {
  const { session, categories } = useFinwise();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const { data, error } = await supabase
        .from("monthly_reports")
        .select("id,year,month,summary,transactions,created_at")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) {
        toast.error(toUserMessage(error, "Falha ao carregar relatórios"));
      } else {
        setReports((data ?? []) as unknown as Report[]);
      }
      setLoading(false);
    })();
  }, [session]);

  const exportXlsx = (r: Report) => {
    const catName = (id?: string) => categories.find((c) => c.id === id)?.name ?? "—";
    const summaryRows = [
      ["Mês", `${MONTHS[r.month - 1]} ${r.year}`],
      ["Total de Entradas", r.summary.totalIn],
      ["Total de Despesas", r.summary.totalOut],
      ["Saldo", r.summary.balance],
      ["Quantidade de registros", r.summary.count],
    ];
    const txRows = [
      ["Data", "Tipo", "Categoria", "Descrição", "Valor"],
      ...r.transactions.map((t) => [
        t.date,
        t.type === "entrada" ? "Entrada" : "Despesa",
        catName(t.categoryId),
        t.description,
        t.amount,
      ]),
    ];
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 28 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");
    const wsTx = XLSX.utils.aoa_to_sheet(txRows);
    wsTx["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTx, "Transações");
    XLSX.writeFile(wb, `relatorio-${r.year}-${String(r.month).padStart(2, "0")}.xlsx`);
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Meses anteriores arquivados automaticamente.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum mês arquivado ainda. Quando você registrar uma transação em um novo mês, o anterior será arquivado aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">{MONTHS[r.month - 1]} {r.year}</CardTitle>
                <p className="text-xs text-muted-foreground">Arquivado em {formatDate(r.created_at.slice(0, 10))}</p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Stat icon={<ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />} label="Entradas" value={brl(r.summary.totalIn)} />
                  <Stat icon={<ArrowDownCircle className="h-3.5 w-3.5 text-rose-400" />} label="Despesas" value={brl(r.summary.totalOut)} />
                  <Stat icon={<Wallet className="h-3.5 w-3.5 text-sky-400" />} label="Saldo" value={brl(r.summary.balance)} />
                </div>
                <p className="text-xs text-muted-foreground">{r.summary.count} registro(s)</p>
                <Button size="sm" variant="outline" onClick={() => exportXlsx(r)}>
                  <Download className="h-4 w-4" /> Exportar .xlsx
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
