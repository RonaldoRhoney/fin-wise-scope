import type { Category, Transaction } from "./types";

export const SEED_CATEGORIES: Category[] = [
  { id: "cat_alimentacao", name: "Alimentação", kind: "despesa", color: "#f59e0b" },
  { id: "cat_transporte", name: "Transporte", kind: "despesa", color: "#3b82f6" },
  { id: "cat_moradia", name: "Moradia", kind: "despesa", color: "#10b981" },
  { id: "cat_lazer", name: "Lazer", kind: "despesa", color: "#a855f7" },
  { id: "cat_saude", name: "Saúde", kind: "despesa", color: "#ef4444" },
  { id: "cat_educacao", name: "Educação", kind: "despesa", color: "#06b6d4" },
  { id: "cat_assinaturas", name: "Assinaturas", kind: "despesa", color: "#ec4899" },
  { id: "cat_salario", name: "Salário", kind: "entrada", color: "#22c55e" },
  { id: "cat_freela", name: "Freelance", kind: "entrada", color: "#84cc16" },
  { id: "cat_outros", name: "Outros", kind: "both", color: "#6b7280" },
];

export const SEED_TRANSACTIONS: Transaction[] = [
  { id: "t1", type: "entrada", date: "2025-09-01", description: "Salário", categoryId: "cat_salario", amount: 8000 },
  { id: "t2", type: "entrada", date: "2025-09-15", description: "Freelance app", categoryId: "cat_freela", amount: 1200 },
  { id: "t3", type: "despesa", date: "2025-09-02", description: "Mercado", categoryId: "cat_alimentacao", amount: 320 },
  { id: "t4", type: "despesa", date: "2025-09-03", description: "Almoço", categoryId: "cat_alimentacao", amount: 48 },
  { id: "t5", type: "despesa", date: "2025-09-05", description: "UBER", categoryId: "cat_transporte", amount: 36 },
  { id: "t6", type: "despesa", date: "2025-09-06", description: "Aluguel", categoryId: "cat_moradia", amount: 2500 },
  { id: "t7", type: "despesa", date: "2025-09-08", description: "Streaming", categoryId: "cat_assinaturas", amount: 39 },
  { id: "t8", type: "despesa", date: "2025-09-10", description: "Cinema", categoryId: "cat_lazer", amount: 55 },
  { id: "t9", type: "despesa", date: "2025-09-12", description: "Remédio", categoryId: "cat_saude", amount: 68 },
  { id: "t10", type: "despesa", date: "2025-09-14", description: "Gasolina", categoryId: "cat_transporte", amount: 220 },
  { id: "t11", type: "entrada", date: "2025-09-20", description: "Freelance site", categoryId: "cat_freela", amount: 900 },
  { id: "t12", type: "despesa", date: "2025-09-21", description: "Supermercado", categoryId: "cat_alimentacao", amount: 410 },
  { id: "t13", type: "despesa", date: "2025-09-22", description: "Plano de saúde", categoryId: "cat_saude", amount: 350 },
  { id: "t14", type: "despesa", date: "2025-09-23", description: "Curso online", categoryId: "cat_educacao", amount: 199 },
  { id: "t15", type: "despesa", date: "2025-09-25", description: "Pizza", categoryId: "cat_alimentacao", amount: 79 },
  { id: "t16", type: "despesa", date: "2025-09-27", description: "UBER", categoryId: "cat_transporte", amount: 28 },
  { id: "t17", type: "despesa", date: "2025-09-29", description: "Internet", categoryId: "cat_moradia", amount: 120 },
  { id: "t18", type: "entrada", date: "2025-10-01", description: "Salário", categoryId: "cat_salario", amount: 8000 },
  { id: "t19", type: "despesa", date: "2025-10-02", description: "Mercado", categoryId: "cat_alimentacao", amount: 340 },
  { id: "t20", type: "despesa", date: "2025-10-03", description: "Farmácia", categoryId: "cat_saude", amount: 95 },
  { id: "t21", type: "despesa", date: "2025-10-04", description: "Assinatura SaaS", categoryId: "cat_assinaturas", amount: 59 },
  { id: "t22", type: "despesa", date: "2025-10-05", description: "Passeio", categoryId: "cat_lazer", amount: 120 },
  { id: "t23", type: "despesa", date: "2025-10-06", description: "Metrô", categoryId: "cat_transporte", amount: 12 },
  { id: "t24", type: "despesa", date: "2025-10-07", description: "Gasolina", categoryId: "cat_transporte", amount: 210 },
];

export const DEFAULT_PROFILE = {
  name: "Usuário Controle Financeiro",
  email: "user@finwise.app",
  currency: "BRL",
  locale: "pt-BR",
  persistLocal: true,
  clearOnLogout: false,
  loggedIn: true,
};
