export type Category = {
  id: string;
  name: string;
  kind: "despesa" | "entrada";
  color?: string;
};

export type Transaction = {
  id: string;
  type: "entrada" | "despesa";
  date: string; // YYYY-MM-DD
  description: string;
  categoryId?: string;
  amount: number;
};

export type Filters = {
  period: "7d" | "30d" | "all";
  categoryId: string; // "all" or id
  search: string;
  type: "all" | "entrada" | "despesa";
};

export type Profile = {
  name: string;
  email: string;
  currency: string;
  locale: string;
  persistLocal: boolean;
  clearOnLogout: boolean;
  loggedIn: boolean;
};
