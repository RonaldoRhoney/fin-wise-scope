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
  categoryId: string;
  search: string;
  type: "all" | "entrada" | "despesa";
};

export type Profile = {
  id: number;
  name: string;
  email: string;
};
