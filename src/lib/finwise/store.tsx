import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Category, Filters, Profile, Transaction } from "./types";
import { SEED_CATEGORIES } from "./seed";

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
      .select("id,name,email")
      .eq("auth_user_id", uid)
      .maybeSingle();
    if (prof) {
      setProfile({ id: prof.id, name: prof.name ?? "", email: prof.email });
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

  const addTransaction: StoreCtx["addTransaction"] = async (t) => {
    if (!profile) throw new Error("Sem perfil");
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
    setTransactions((p) => [rowToTx(data as DbRow), ...p]);
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
    const { error } = await supabase.from("profiles").update({ name }).eq("id", profile.id);
    if (error) throw error;
    setProfile({ ...profile, name });
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const exportJSON = () => JSON.stringify({ profile, transactions }, null, 2);

  const importJSON: StoreCtx["importJSON"] = async (raw) => {
    if (!profile) throw new Error("Sem perfil");
    const parsed = JSON.parse(raw) as { transactions?: Transaction[] };
    const list = parsed.transactions ?? [];
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
