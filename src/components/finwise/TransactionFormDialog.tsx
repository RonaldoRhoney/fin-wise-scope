import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinwise } from "@/lib/finwise/store";
import { brl, todayISO } from "@/lib/finwise/format";
import type { Transaction } from "@/lib/finwise/types";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";
import { suggestCategory } from "@/lib/finwise/agents/transactions.functions";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Transaction | null;
  forcedType?: "entrada" | "despesa";
  prefill?: {
    type?: "entrada" | "despesa";
    description?: string;
    amount?: number;
    categoryId?: string;
  } | null;
};

export function TransactionFormDialog({ open, onOpenChange, initial, forcedType, prefill }: Props) {
  const { t } = useTranslation();
  const { categories, addTransaction, updateTransaction } = useFinwise();
  const [type, setType] = useState<"entrada" | "despesa">(forcedType ?? "despesa");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setType(initial.type);
        setDate(initial.date);
        setCategoryId(initial.categoryId);
        setDescription(initial.description);
        setAmount(String(initial.amount));
      } else {
        setType(prefill?.type ?? forcedType ?? "despesa");
        setDate(todayISO());
        setCategoryId(prefill?.categoryId);
        setDescription(prefill?.description ?? "");
        setAmount(prefill?.amount != null ? String(prefill.amount) : "");
      }
    }
  }, [open, initial, forcedType, prefill]);


  const filteredCats = categories.filter((c) => c.kind === type || c.kind === "both");

  // AGENT 2 — Transactions: auto-suggest category by description (debounced, isolated)
  const askSuggest = useServerFn(suggestCategory);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ id: string; name: string; reason: string } | null>(null);
  const userPickedRef = useRef(false);
  useEffect(() => {
    if (!open || initial) return;
    setSuggestion(null);
    const desc = description.trim();
    if (desc.length < 3 || userPickedRef.current) return;
    const handle = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await askSuggest({
          data: {
            description: desc,
            type,
            availableCategories: filteredCats.map((c) => ({ id: c.id, name: c.name })),
          },
        });
        if (res.categoryId && (!categoryId || categoryId !== res.categoryId)) {
          const cat = filteredCats.find((c) => c.id === res.categoryId);
          if (cat) setSuggestion({ id: cat.id, name: cat.name, reason: res.reason });
        }
      } catch { /* isolated: ignore */ }
      finally { setSuggesting(false); }
    }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, type, open]);


  const submit = async () => {
    if (submitLock.current || submitting) return;
    const value = parseFloat(amount.replace(",", "."));
    const errs: string[] = [];
    if (!description.trim()) errs.push(t("form.errors.desc"));
    if (!date) errs.push(t("form.errors.date"));
    if (!value || value <= 0) errs.push(t("form.errors.amount"));
    if (type === "despesa" && !categoryId) errs.push(t("form.errors.category"));
    if (errs.length) { errs.forEach((e) => toast.error(e)); return; }
    submitLock.current = true;
    setSubmitting(true);
    const payload = { type, date, description: description.trim(), categoryId, amount: value };
    try {
      if (initial) {
        await updateTransaction(initial.id, payload);
        toast.success(t("form.updated"));
      } else {
        await addTransaction(payload);
        toast.success(t("form.created"));
      }
      onOpenChange(false);
    } catch (err) {
      const msg = (err as Error)?.message;
      if (msg === "duplicate_transaction") {
        toast.info("Lançamento já registrado.");
        onOpenChange(false);
      } else {
        toast.error(toUserMessage(err, t("form.saveFail")));
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const title = initial
    ? t("form.editRecord")
    : forcedType === "entrada"
    ? t("registros.newIncome")
    : forcedType === "despesa"
    ? t("registros.newExpense")
    : t("form.newRecord");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          {!forcedType && (
            <div className="grid gap-2">
              <Label>{t("form.type")}</Label>
              <Select value={type} onValueChange={(v) => { setType(v as any); setCategoryId(undefined); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">{t("registros.typeIncome")}</SelectItem>
                  <SelectItem value="despesa">{t("registros.typeExpense")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>{t("form.date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{t("form.category")} {type === "entrada" && <span className="text-muted-foreground text-xs">{t("form.optional")}</span>}</Label>
            <Select value={categoryId} onValueChange={(v) => { userPickedRef.current = true; setCategoryId(v); }}>
              <SelectTrigger><SelectValue placeholder={t("form.select")} /></SelectTrigger>
              <SelectContent>
                {filteredCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {suggesting && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Sugerindo categoria…
              </div>
            )}
            {suggestion && !suggesting && (
              <button
                type="button"
                onClick={() => { setCategoryId(suggestion.id); userPickedRef.current = true; setSuggestion(null); }}
                className="flex items-center gap-2 self-start rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 transition hover:bg-violet-500/20"
              >
                <Sparkles className="h-3 w-3" />
                Usar sugestão: <strong className="font-semibold">{suggestion.name}</strong>
              </button>
            )}
          </div>
          <div className="grid gap-2">
            <Label>{t("form.description")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("form.descPlaceholder")} />
          </div>
          <div className="grid gap-2">
            <Label>{t("form.value")}</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0,00"
            />
            <div className="text-xs text-muted-foreground">{brl(parseFloat(amount.replace(",", ".")) || 0)}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={submitting} aria-busy={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? t("common.save") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
