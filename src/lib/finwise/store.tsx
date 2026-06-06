import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Category, Filters, Profile, Transaction } from "./types";
import { SEED_CATEGORIES } from "./seed";

const MAX_IMPORT_ROWS = 500;
const ImportTxSchema = z.object({
  type: z.enum(["entrada", "despesa"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  description: z.string().trim().max(500, "Descrição muito longa").default(""),
  categoryId: z.string().trim().max(64).optional(),
  amount: z.number().finite().positive("Valor inválido").max(1_000_000_000),
});
const ImportPayloadSchema = z.object({
  transactions: z.array(ImportTxSchema).max(MAX_IMPORT_ROWS, `Limite de ${MAX_IMPORT_ROWS} registros por importação`),
});


type StoreCtx = {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  categories: Category[];
  transactions: Transaction[];
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, t: Omit<Transaction, "id">) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  updateProfileAvatar: (avatarUrl: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  exportJSON: () => string;
  importJSON: (raw: string) => Promise<number>;
};

const Ctx = createContext<StoreCtx | null>(null);

type DbRow = {
  id: number;
  user_id: number;
  type: string;
  date: string;
  description: string;
  category: string | null;
  amount: number | string;
  payment_method: string | null;
  tags: string[];
  recurring: boolean;
  created_at: string;
};

const rowToTx = (r: DbRow): Transaction => ({
  id: String(r.id),
  type: (r.type === "saida" ? "despesa" : r.type) as "entrada" | "despesa",
  date: r.date,
  description: r.description,
  categoryId: r.category ?? undefined,
  amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
});

export function FinwiseProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFiltersState] = useState<Filters>({
    period: "30d",
    categoryId: "all",
    search: "",
    type: "all",
  });

  const loadProfileAndData = useCallback(async (uid: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id,name,email,avatar_url")
      .eq("auth_user_id", uid)
      .maybeSingle();
    if (prof) {
      setProfile({ id: prof.id, name: prof.name ?? "", email: prof.email, avatarUrl: (prof as { avatar_url?: string | null }).avatar_url ?? null });
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      setTransactions(((tx as DbRow[] | null) ?? []).map(rowToTx));
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.user) return;
    await loadProfileAndData(session.user.id);
  }, [session, loadProfileAndData]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => { loadProfileAndData(s.user.id); }, 0);
      } else {
        setProfile(null);
        setTransactions([]);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfileAndData(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfileAndData]);

  const archivePreviousMonths = useCallback(async (uid: string) => {
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    const { data: rows } = await supabase.from("transactions").select("*");
    const all = ((rows as DbRow[] | null) ?? []);
    const past = all.filter((r) => {
      const [y, m] = r.date.split("-").map(Number);
      return y < cy || (y === cy && m < cm);
    });
    if (!past.length) return;
    const groups = new Map<string, DbRow[]>();
    for (const r of past) {
      const key = r.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    for (const [key, list] of groups) {
      const [y, m] = key.split("-").map(Number);
      const txs = list.map(rowToTx);
      const totalIn = txs.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
      const totalOut = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
      const summary = { totalIn, totalOut, balance: totalIn - totalOut, count: txs.length };
      const { data: existing } = await supabase
        .from("monthly_reports")
        .select("id,transactions")
        .eq("auth_user_id", uid).eq("year", y).eq("month", m).maybeSingle();
      if (existing) {
        const merged = [...((existing.transactions as unknown as Transaction[]) ?? []), ...txs];
        await supabase.from("monthly_reports").update({
          transactions: merged as never,
          summary: summary as never,
        }).eq("id", existing.id);
      } else {
        await supabase.from("monthly_reports").insert({
          auth_user_id: uid, year: y, month: m,
          transactions: txs as never, summary: summary as never,
        });
      }
    }
    const ids = past.map((r) => r.id);
    await supabase.from("transactions").delete().in("id", ids);
  }, []);

  const addTransaction: StoreCtx["addTransaction"] = async (t) => {
    if (!profile || !session?.user) throw new Error("Sem perfil");
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: profile.id,
        type: t.type,
        date: t.date,
        description: t.description,
        category: t.categoryId ?? null,
        amount: t.amount,
      })
      .select()
      .single();
    if (error) throw error;
    const now = new Date();
    const [y, m] = t.date.split("-").map(Number);
    const isCurrent = y === now.getFullYear() && m === now.getMonth() + 1;
    if (isCurrent) {
      await archivePreviousMonths(session.user.id);
      await loadProfileAndData(session.user.id);
    } else {
      setTransactions((p) => [rowToTx(data as DbRow), ...p]);
    }
  };


  const updateTransaction: StoreCtx["updateTransaction"] = async (id, t) => {
    const { data, error } = await supabase
      .from("transactions")
      .update({
        type: t.type,
        date: t.date,
        description: t.description,
        category: t.categoryId ?? null,
        amount: t.amount,
      })
      .eq("id", Number(id))
      .select()
      .single();
    if (error) throw error;
    setTransactions((p) => p.map((x) => (x.id === id ? rowToTx(data as DbRow) : x)));
  };

  const deleteTransaction: StoreCtx["deleteTransaction"] = async (id) => {
    const { error } = await supabase.from("transactions").delete().eq("id", Number(id));
    if (error) throw error;
    setTransactions((p) => p.filter((x) => x.id !== id));
  };

  const updateProfileName: StoreCtx["updateProfileName"] = async (name) => {
    if (!profile) return;
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Nome obrigatório");
    if (trimmed.length > 200) throw new Error("Nome muito longo (máx. 200)");
    const { error } = await supabase.from("profiles").update({ name: trimmed }).eq("id", profile.id);
    if (error) throw error;
    setProfile({ ...profile, name: trimmed });
  };

  const updateProfileAvatar: StoreCtx["updateProfileAvatar"] = async (avatarUrl) => {
    if (!profile) return;
    if (avatarUrl && avatarUrl.length > 400_000) throw new Error("Imagem muito grande (máx. ~300KB)");
    const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
    if (error) throw error;
    setProfile({ ...profile, avatarUrl });
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const exportJSON = () => JSON.stringify({ profile, transactions }, null, 2);

  const importJSON: StoreCtx["importJSON"] = async (raw) => {
    if (!profile) throw new Error("Sem perfil");
    let json: unknown;
    try { json = JSON.parse(raw); } catch { throw new Error("Arquivo JSON inválido"); }
    const result = ImportPayloadSchema.safeParse(json);
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Arquivo de importação inválido");
    }
    const list = result.data.transactions;
    if (!list.length) return 0;
    const rows = list.map((t) => ({
      user_id: profile.id,
      type: t.type,
      date: t.date,
      description: t.description,
      category: t.categoryId ?? null,
      amount: t.amount,
    }));
    const { data, error } = await supabase.from("transactions").insert(rows).select();
    if (error) throw error;
    setTransactions((p) => [...((data as DbRow[]) ?? []).map(rowToTx), ...p]);
    return data?.length ?? 0;
  };

  const value = useMemo<StoreCtx>(() => ({
    loading,
    session,
    profile,
    categories: SEED_CATEGORIES,
    transactions,
    filters,
    setFilters: (f) => setFiltersState((p) => ({ ...p, ...f })),
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateProfileName,
    updateProfileAvatar,
    signOut,
    refresh,
    exportJSON,
    importJSON,
  }), [loading, session, profile, transactions, filters, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFinwise = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("FinwiseProvider missing");
  return c;
};
