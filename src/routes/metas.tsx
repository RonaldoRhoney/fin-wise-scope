import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useFinwise } from "@/lib/finwise/store";
import { brl } from "@/lib/finwise/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/finwise/errors";
import {
  Plane, Car, Bike, Laptop, Home, GraduationCap, Heart, PiggyBank, Plus, Trash2, Wallet,
} from "lucide-react";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [{ title: "Metas" }] }),
  component: MetasPage,
});

type Goal = {
  id: number;
  title: string;
  category: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  color: string;
};

const CATEGORIES = [
  { id: "viagem", icon: Plane, color: "#06b6d4" },
  { id: "carro", icon: Car, color: "#ef4444" },
  { id: "moto", icon: Bike, color: "#f97316" },
  { id: "notebook", icon: Laptop, color: "#8b5cf6" },
  { id: "casa", icon: Home, color: "#10b981" },
  { id: "educacao", icon: GraduationCap, color: "#3b82f6" },
  { id: "saude", icon: Heart, color: "#ec4899" },
  { id: "outros", icon: PiggyBank, color: "#64748b" },
];

const iconFor = (cat: string) => CATEGORIES.find((c) => c.id === cat) ?? CATEGORIES[CATEGORIES.length - 1];

function MetasPage() {
  const { t } = useTranslation();
  const { session } = useFinwise();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("savings_goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(toUserMessage(error, t("errors.generic")));
    setGoals(((data as Goal[] | null) ?? []).map((g) => ({
      ...g,
      target_amount: Number(g.target_amount),
      saved_amount: Number(g.saved_amount),
    })));
    setLoading(false);
  };

  useEffect(() => { if (session) load(); }, [session]);

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("metas.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("metas.subtitle")}</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> {t("metas.newGoal")}</Button>
          </DialogTrigger>
          <GoalDialog onClose={() => { setOpenNew(false); load(); }} />
        </Dialog>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("metas.totalTarget")}</div>
            <div className="mt-2 text-2xl font-semibold text-purple-500">{brl(totalTarget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("metas.totalSaved")}</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-500">{brl(totalSaved)}</div>
          </CardContent>
        </Card>
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("metas.empty")}</p>
            <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4" /> {t("metas.newGoal")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => <GoalCard key={g.id} goal={g} onChange={load} />)}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onChange }: { goal: Goal; onChange: () => void }) {
  const { t } = useTranslation();
  const meta = iconFor(goal.category);
  const Icon = meta.icon;
  const pct = Math.min(100, (goal.saved_amount / goal.target_amount) * 100);
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const addAmount = async () => {
    const v = parseFloat(amount.replace(",", "."));
    if (!v || v <= 0) return toast.error(t("metas.invalidAmount"));
    const { error } = await supabase
      .from("savings_goals")
      .update({ saved_amount: goal.saved_amount + v })
      .eq("id", goal.id);
    if (error) return toast.error(toUserMessage(error, t("errors.generic")));
    toast.success(t("metas.amountAdded"));
    setAddOpen(false); setAmount(""); onChange();
  };

  const remove = async () => {
    if (!confirm(t("metas.confirmDelete"))) return;
    const { error } = await supabase.from("savings_goals").delete().eq("id", goal.id);
    if (error) return toast.error(toUserMessage(error, t("errors.generic")));
    toast.success(t("metas.deleted")); onChange();
  };

  return (
    <Card className="overflow-hidden transition-all hover:border-primary/50">
      <div className="h-1" style={{ background: goal.color }} />
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${goal.color}20`, color: goal.color }}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <div className="font-semibold">{goal.title}</div>
              <div className="text-xs text-muted-foreground">{t(`metas.categories.${goal.category}`)}</div>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
        <Progress value={pct} />
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-muted-foreground">{brl(goal.saved_amount)}</span>
          <span className="font-medium">{pct.toFixed(0)}%</span>
          <span className="text-muted-foreground">{brl(goal.target_amount)}</span>
        </div>
        {goal.target_date && (
          <div className="mt-2 text-xs text-muted-foreground">{t("metas.until")}: {new Date(goal.target_date + "T00:00:00").toLocaleDateString()}</div>
        )}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="mt-3 w-full">
              <Plus className="h-3 w-3" /> {t("metas.addMoney")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("metas.addMoney")}</DialogTitle></DialogHeader>
            <Label>{t("metas.amount")}</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={addAmount}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function GoalDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { session } = useFinwise();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("viagem");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!session?.user) return;
    const tv = parseFloat(target.replace(",", "."));
    if (!title.trim()) return toast.error(t("metas.titleRequired"));
    if (!tv || tv <= 0) return toast.error(t("metas.invalidAmount"));
    setSaving(true);
    const color = iconFor(category).color;
    const { error } = await supabase.from("savings_goals").insert({
      auth_user_id: session.user.id,
      title: title.trim(),
      category,
      target_amount: tv,
      saved_amount: parseFloat(saved.replace(",", ".")) || 0,
      target_date: date || null,
      color,
    });
    setSaving(false);
    if (error) return toast.error(toUserMessage(error, t("errors.generic")));
    toast.success(t("metas.created"));
    onClose();
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{t("metas.newGoal")}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label>{t("metas.titleField")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("metas.titlePlaceholder")} />
        </div>
        <div>
          <Label>{t("metas.category")}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{t(`metas.categories.${c.id}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("metas.targetAmount")}</Label>
            <Input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>{t("metas.savedAmount")}</Label>
            <Input type="number" step="0.01" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div>
          <Label>{t("metas.targetDate")} ({t("form.optional")})</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
        <Button onClick={submit} disabled={saving}>{t("common.create")}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
