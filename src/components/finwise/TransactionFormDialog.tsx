import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinwise } from "@/lib/finwise/store";
import { brl, todayISO } from "@/lib/finwise/format";
import type { Transaction } from "@/lib/finwise/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Transaction | null;
};

export function TransactionFormDialog({ open, onOpenChange, initial }: Props) {
  const { categories, addTransaction, updateTransaction } = useFinwise();
  const [type, setType] = useState<"entrada" | "despesa">("despesa");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");

  useEffect(() => {
    if (open) {
      if (initial) {
        setType(initial.type);
        setDate(initial.date);
        setCategoryId(initial.categoryId);
        setDescription(initial.description);
        setAmount(String(initial.amount));
      } else {
        setType("despesa");
        setDate(todayISO());
        setCategoryId(undefined);
        setDescription("");
        setAmount("");
      }
    }
  }, [open, initial]);

  const filteredCats = categories.filter((c) => c.kind === type);

  const submit = async () => {
    const value = parseFloat(amount.replace(",", "."));
    const errs: string[] = [];
    if (!description.trim()) errs.push("Descrição é obrigatória");
    if (!date) errs.push("Data inválida");
    if (!value || value <= 0) errs.push("Valor deve ser maior que zero");
    if (type === "despesa" && !categoryId) errs.push("Categoria obrigatória para despesas");
    if (errs.length) {
      errs.forEach((e) => toast.error(e));
      return;
    }
    const payload = { type, date, description: description.trim(), categoryId, amount: value };
    try {
      if (initial) {
        await updateTransaction(initial.id, payload);
        toast.success("Registro atualizado com sucesso.");
      } else {
        await addTransaction(payload);
        toast.success("Registro criado com sucesso.");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao salvar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar registro" : "Novo registro"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => { setType(v as any); setCategoryId(undefined); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Categoria {type === "entrada" && <span className="text-muted-foreground text-xs">(opcional)</span>}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {filteredCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado" />
          </div>
          <div className="grid gap-2">
            <Label>Valor</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{initial ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
