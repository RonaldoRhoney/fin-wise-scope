import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Category, Filters, Profile, Transaction } from "./types";
import { DEFAULT_PROFILE, SEED_CATEGORIES, SEED_TRANSACTIONS } from "./seed";

const STORAGE_KEY = "finwise_data_v1";

type StoreState = {
  categories: Category[];
  transactions: Transaction[];
  profile: Profile;
};

type StoreCtx = StoreState & {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, t: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  resetSeed: () => void;
  updateProfile: (p: Partial<Profile>) => void;
  logout: () => void;
  loginAgain: () => void;
};

const Ctx = createContext<StoreCtx | null>(null);

const initialState = (): StoreState => {
  if (typeof window === "undefined") {
    return { categories: SEED_CATEGORIES, transactions: SEED_TRANSACTIONS, profile: DEFAULT_PROFILE };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { categories: SEED_CATEGORIES, transactions: SEED_TRANSACTIONS, profile: DEFAULT_PROFILE };
};

export function FinwiseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(initialState);
  const [filters, setFiltersState] = useState<Filters>({
    period: "30d",
    categoryId: "all",
    search: "",
    type: "all",
  });

  useEffect(() => {
    if (state.profile.persistLocal) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {}
    }
  }, [state]);

  const value = useMemo<StoreCtx>(
    () => ({
      ...state,
      filters,
      setFilters: (f) => setFiltersState((p) => ({ ...p, ...f })),
      addTransaction: (t) =>
        setState((s) => ({ ...s, transactions: [{ ...t, id: Math.random().toString(36).slice(2, 10) }, ...s.transactions] })),
      updateTransaction: (id, t) =>
        setState((s) => ({ ...s, transactions: s.transactions.map((x) => (x.id === id ? { ...t, id } : x)) })),
      deleteTransaction: (id) =>
        setState((s) => ({ ...s, transactions: s.transactions.filter((x) => x.id !== id) })),
      resetSeed: () =>
        setState((s) => ({ ...s, categories: SEED_CATEGORIES, transactions: SEED_TRANSACTIONS })),
      updateProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      logout: () =>
        setState((s) => {
          if (s.profile.clearOnLogout) {
            try { localStorage.removeItem(STORAGE_KEY); } catch {}
            return { categories: SEED_CATEGORIES, transactions: SEED_TRANSACTIONS, profile: { ...DEFAULT_PROFILE, loggedIn: false } };
          }
          return { ...s, profile: { ...s.profile, loggedIn: false } };
        }),
      loginAgain: () => setState((s) => ({ ...s, profile: { ...s.profile, loggedIn: true } })),
    }),
    [state, filters],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFinwise = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("FinwiseProvider missing");
  return c;
};
