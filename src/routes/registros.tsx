import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFinwise } from "@/lib/finwise/store";
import type { Transaction } from "@/lib/finwise/types";
import { brl, formatDate } from "@/lib/finwise/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Pencil, Plus, Search, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, History } from "lucide-react";
import { TransactionFormDialog } from "@/components/finwise/TransactionFormDialog";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";

export const Route = createFileRoute("/registros")({
  head: () => ({ meta: [{ title: "Meus Registros — Controle Financeiro" }] }),
  component: Registros,
});

function Registros() {
  const { transactions, categories, filters, setFilters, deleteTransaction } = useFinwise();
  const [page, setPage] = useState(1);
  const [openForm, setOpenForm] = useState(false);
  const [formType, setFormType] = useState<"entrada" | "despesa" | undefined>(undefined);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [confirmDel, setConfirmDel] = useState<Transaction | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "n") { setEditing(null); setFormType(undefined); setOpenForm(true); }
      else if (e.key === "1") navigate({ to: "/" });
      else if (e.key === "2") navigate({ to: "/registros" });
      else if (e.key === "3") navigate({ to: "/perfil" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.categoryId !== "all" && t.categoryId !== filters.categoryId) return false;
      if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filters]);

  const totalIn = useMemo(() => filtered.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalOut = useMemo(() => filtered.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0), [filtered]);
  const saldo = totalIn - totalOut;

  const PAGE_SIZE = 20;
  const paginated = filtered.length > 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = paginated ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filtered;

  const catName = (id?: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Meus Registros</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas entradas e despesas</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            onClick={() => { setEditing(null); setFormType("entrada"); setOpenForm(true); }}
            className="w-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 sm:w-auto"
            variant="secondary"
          >
            <ArrowUpCircle className="h-4 w-4" /> Nova Entrada
          </Button>
          <Button
            onClick={() => { setEditing(null); setFormType("despesa"); setOpenForm(true); }}
            className="w-full bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 sm:w-auto"
            variant="secondary"
          >
            <ArrowDownCircle className="h-4 w-4" /> Nova Despesa
          </Button>
        </div>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="transition-all hover:border-primary/40">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>💰 Entradas</span>
              <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-emerald-400">{brl(totalIn)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{filtered.filter((t) => t.type === "entrada").length} registros</div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:border-primary/40">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>💸 Despesas</span>
              <ArrowDownCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-semibold tracking-tight text-rose-400">{brl(totalOut)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{filtered.filter((t) => t.type === "despesa").length} registros</div>
          </CardContent>
        </Card>
        <Card className="transition-all hover:border-primary/40">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Saldo</span>
              <Wallet className="h-4 w-4 text-sky-400" />
            </div>
            <div className={`text-2xl font-semibold tracking-tight ${saldo >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {brl(saldo)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Balanço do período</div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">📋 Histórico</h2>
        </div>

        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap">
            <div className="relative w-full flex-1 sm:min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="Buscar por descrição… (atalho: /)"
                className="pl-9"
              />
            </div>
            <Select value={filters.type} onValueChange={(v) => setFilters({ type: v as any })}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Apenas entradas</SelectItem>
                <SelectItem value="despesa">Apenas despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.categoryId} onValueChange={(v) => setFilters({ categoryId: v })}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <div className="text-base font-medium">Nenhum registro encontrado</div>
                <p className="text-sm text-muted-foreground">Comece adicionando seu primeiro lançamento.</p>
                <Button onClick={() => { setEditing(null); setFormType(undefined); setOpenForm(true); }}>
                  <Plus className="h-4 w-4" /> Adicionar primeiro registro
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="hidden md:table-cell">Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[140px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(t.date)}</TableCell>
                        <TableCell className="font-medium">{t.description}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{catName(t.categoryId)}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === "entrada" ? "default" : "secondary"} className={t.type === "entrada" ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20" : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/20"}>
                            {t.type === "entrada" ? "Entrada" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`whitespace-nowrap text-right font-medium ${t.type === "entrada" ? "text-emerald-400" : "text-rose-400"}`}>
                          {t.type === "entrada" ? "+" : "−"} {brl(t.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setViewing(t)}><Eye className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setFormType(undefined); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setConfirmDel(t)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {paginated && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      <TransactionFormDialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) { setEditing(null); setFormType(undefined); } }} initial={editing} forcedType={editing ? undefined : formType} />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do registro</DialogTitle></DialogHeader>
          {viewing && (
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <dt className="text-muted-foreground">Data</dt><dd className="col-span-2">{formatDate(viewing.date)}</dd>
              <dt className="text-muted-foreground">Descrição</dt><dd className="col-span-2">{viewing.description}</dd>
              <dt className="text-muted-foreground">Categoria</dt><dd className="col-span-2">{catName(viewing.categoryId)}</dd>
              <dt className="text-muted-foreground">Tipo</dt><dd className="col-span-2 capitalize">{viewing.type}</dd>
              <dt className="text-muted-foreground">Valor</dt><dd className="col-span-2 font-medium">{brl(viewing.amount)}</dd>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDel) {
                  try {
                    await deleteTransaction(confirmDel.id);
                    toast.success("Registro removido.");
                  } catch (err) {
                    toast.error(toUserMessage(err, "Falha ao remover"));
                  }
                }
                setConfirmDel(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
