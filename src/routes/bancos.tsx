import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Building2, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFinwise } from "@/lib/finwise/store";
import type { Transaction } from "@/lib/finwise/types";

export const Route = createFileRoute("/bancos")({
  component: BancosPage,
});

type Bank = {
  id: string;
  name: string;
  color: string;
  initials: string;
  formats: ("OFX" | "CSV")[];
};

const BANKS: Bank[] = [
  { id: "nubank", name: "Nubank", color: "#820ad1", initials: "Nu", formats: ["OFX", "CSV"] },
  { id: "inter", name: "Banco Inter", color: "#ff7a00", initials: "IN", formats: ["OFX", "CSV"] },
  { id: "bb", name: "Banco do Brasil", color: "#fae128", initials: "BB", formats: ["OFX"] },
  { id: "itau", name: "Itaú", color: "#ec7000", initials: "IT", formats: ["OFX"] },
  { id: "bradesco", name: "Bradesco", color: "#cc092f", initials: "BR", formats: ["OFX"] },
  { id: "santander", name: "Santander", color: "#ec0000", initials: "SA", formats: ["OFX", "CSV"] },
  { id: "caixa", name: "Caixa Econômica", color: "#0070af", initials: "CX", formats: ["OFX"] },
  { id: "c6", name: "C6 Bank", color: "#1a1a1a", initials: "C6", formats: ["OFX", "CSV"] },
  { id: "btg", name: "BTG Pactual", color: "#0a2540", initials: "BT", formats: ["OFX", "CSV"] },
  { id: "next", name: "Next", color: "#00ff5f", initials: "NX", formats: ["OFX"] },
  { id: "pagbank", name: "PagBank", color: "#179c47", initials: "PG", formats: ["OFX", "CSV"] },
  { id: "outro", name: "Outro banco", color: "#64748b", initials: "??", formats: ["OFX", "CSV"] },
];

type ParsedTx = Omit<Transaction, "id">;

function parseOFX(text: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  for (const b of blocks) {
    const get = (tag: string) => {
      const m = b.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return m?.[1]?.trim();
    };
    const dtRaw = get("DTPOSTED");
    const amtRaw = get("TRNAMT");
    const memo = get("MEMO") ?? get("NAME") ?? "Lançamento bancário";
    if (!dtRaw || !amtRaw) continue;
    const y = dtRaw.slice(0, 4), mo = dtRaw.slice(4, 6), d = dtRaw.slice(6, 8);
    if (!y || !mo || !d) continue;
    const amount = parseFloat(amtRaw.replace(",", "."));
    if (!isFinite(amount) || amount === 0) continue;
    txs.push({
      type: amount >= 0 ? "entrada" : "despesa",
      date: `${y}-${mo}-${d}`,
      description: memo.slice(0, 200),
      amount: Math.abs(amount),
    });
  }
  return txs;
}

function parseCSV(text: string): ParsedTx[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(/[,;]/).map((h) => h.trim().replace(/"/g, ""));
  const idx = {
    date: header.findIndex((h) => /data|date/.test(h)),
    desc: header.findIndex((h) => /desc|hist|memo|lançamento|lancamento/.test(h)),
    amount: header.findIndex((h) => /valor|amount|montante/.test(h)),
    type: header.findIndex((h) => /tipo|type/.test(h)),
  };
  if (idx.date < 0 || idx.amount < 0) return [];
  const txs: ParsedTx[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const dateRaw = cols[idx.date];
    const amtRaw = cols[idx.amount];
    if (!dateRaw || !amtRaw) continue;
    // Date: dd/mm/yyyy or yyyy-mm-dd
    let date = "";
    const br = dateRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const iso = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (br) date = `${br[3]}-${br[2]}-${br[1]}`;
    else if (iso) date = dateRaw;
    else continue;
    const amount = parseFloat(amtRaw.replace(/\./g, "").replace(",", "."));
    if (!isFinite(amount) || amount === 0) continue;
    const typeCol = idx.type >= 0 ? cols[idx.type]?.toLowerCase() ?? "" : "";
    const type: "entrada" | "despesa" =
      typeCol.includes("entrada") || typeCol.includes("credit") || typeCol === "c"
        ? "entrada"
        : typeCol.includes("despesa") || typeCol.includes("debit") || typeCol === "d"
          ? "despesa"
          : amount >= 0 ? "entrada" : "despesa";
    txs.push({
      type,
      date,
      description: (idx.desc >= 0 ? cols[idx.desc] : "Lançamento bancário").slice(0, 200) || "Lançamento bancário",
      amount: Math.abs(amount),
    });
  }
  return txs;
}

function BancosPage() {
  const { t } = useTranslation();
  const { importJSON, refresh } = useFinwise();
  const [selected, setSelected] = useState<Bank | null>(null);
  const [preview, setPreview] = useState<ParsedTx[] | null>(null);
  const [connected, setConnected] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("finwise.bancos.connected") ?? "[]"); } catch { return []; }
  });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  const onPickFile = async (file: File) => {
    const text = await file.text();
    const parsed = file.name.toLowerCase().endsWith(".csv") ? parseCSV(text) : parseOFX(text);
    if (!parsed.length) {
      toast.error(t("bancos.parseFail"));
      return;
    }
    setPreview(parsed);
  };

  const confirmImport = async () => {
    if (!preview || !selected) return;
    setImporting(true);
    try {
      const payload = JSON.stringify({ transactions: preview });
      const count = await importJSON(payload);
      const next = Array.from(new Set([...connected, selected.id]));
      setConnected(next);
      try { localStorage.setItem("finwise.bancos.connected", JSON.stringify(next)); } catch { /* noop */ }
      toast.success(t("bancos.imported", { count }));
      setPreview(null);
      setSelected(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("bancos.importFail"));
    } finally {
      setImporting(false);
    }
  };

  const totals = useMemo(() => {
    if (!preview) return { count: 0, inc: 0, exp: 0 };
    return preview.reduce(
      (acc, t) => ({
        count: acc.count + 1,
        inc: acc.inc + (t.type === "entrada" ? t.amount : 0),
        exp: acc.exp + (t.type === "despesa" ? t.amount : 0),
      }),
      { count: 0, inc: 0, exp: 0 },
    );
  }, [preview]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("bancos.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("bancos.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("bancos.howTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. {t("bancos.step1")}</p>
          <p>2. {t("bancos.step2")}</p>
          <p>3. {t("bancos.step3")}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {BANKS.map((b) => {
          const isConnected = connected.includes(b.id);
          return (
            <button
              key={b.id}
              onClick={() => { setSelected(b); setPreview(null); }}
              className="group relative flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: b.color }}
              >
                {b.initials}
              </div>
              <div className="space-y-1">
                <div className="font-medium text-sm">{b.name}</div>
                <div className="flex gap-1">
                  {b.formats.map((f) => (
                    <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
                  ))}
                </div>
              </div>
              {isConnected && (
                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-green-500" />
              )}
            </button>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setPreview(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white"
                  style={{ background: selected.color }}
                >{selected.initials}</span>
              )}
              {t("bancos.connect", { name: selected?.name ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("bancos.dialogDesc")}</DialogDescription>
          </DialogHeader>

          {!preview ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("bancos.uploadHint", { formats: selected?.formats.join(" / ") ?? "" })}
                </p>
                <Button className="mt-4" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("bancos.selectFile")}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".ofx,.csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{t("bancos.found")}</div>
                  <div className="text-lg font-semibold">{totals.count}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{t("registros.income")}</div>
                  <div className="text-lg font-semibold text-green-500">+{totals.inc.toFixed(2)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{t("registros.expense")}</div>
                  <div className="text-lg font-semibold text-red-500">-{totals.exp.toFixed(2)}</div>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border text-xs">
                {preview.slice(0, 50).map((tx, i) => (
                  <div key={i} className="flex justify-between border-b px-3 py-1.5 last:border-b-0">
                    <span className="truncate pr-2">{tx.date} · {tx.description}</span>
                    <span className={tx.type === "entrada" ? "text-green-500" : "text-red-500"}>
                      {tx.type === "entrada" ? "+" : "-"}{tx.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {preview && (
              <>
                <Button variant="outline" onClick={() => setPreview(null)} disabled={importing}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={confirmImport} disabled={importing}>
                  {importing ? t("common.loading") : t("bancos.importAll", { count: totals.count })}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
