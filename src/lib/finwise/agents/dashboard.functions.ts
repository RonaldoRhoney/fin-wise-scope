// AGENT 1 — Dashboard Insights Agent
// ISOLATED: only reads transactions in the selected period. No goals, no reports.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAgent, pickLang } from "./_shared";

const InputSchema = z.object({
  period: z.enum(["7d", "30d", "all"]).default("30d"),
  language: z.string().optional(),
});

const SYSTEM = {
  "pt-BR": `Você é o Agente Dashboard do Controle Financeiro. Sua única função é analisar entradas, saídas e saldo do período informado e gerar de 3 a 5 INSIGHTS curtos, objetivos e acionáveis em português brasileiro.
Regras:
- Cada insight em uma linha, começando com um emoji curto.
- Aponte categoria de maior gasto, ritmo diário, picos e alertas.
- NÃO invente valores: use somente os dados fornecidos.
- Se mencionar investimentos, finalize com "Isto não é uma recomendação de investimento."`,
  "en-US": `You are the Dashboard Agent of Controle Financeiro. Analyze income, expenses and balance of the given period and produce 3-5 short, actionable INSIGHTS.
- One per line, leading emoji. Highlight top category, daily pace, peaks and alerts.
- Use ONLY the data provided.
- If you mention investments, end with "This is not an investment recommendation."`,
  "es-ES": `Eres el Agente Dashboard de Controle Financeiro. Analiza ingresos, gastos y saldo del periodo y genera 3-5 INSIGHTS cortos y accionables.
- Uno por línea con emoji. Destaca categoría principal, ritmo diario, picos y alertas.
- Usa SOLO los datos provistos.
- Si mencionas inversiones, termina con "Esto no es una recomendación de inversión."`,
};

function rangeFor(period: "7d" | "30d" | "all") {
  const now = new Date();
  if (period === "all") return { from: null, days: 0 };
  const days = period === "7d" ? 7 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), days };
}

export const getDashboardInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { from } = rangeFor(data.period);
    let q = supabase
      .from("transactions")
      .select("type,date,description,category,amount")
      .order("date", { ascending: false })
      .limit(400);
    if (from) q = q.gte("date", from);
    const { data: txs } = await q;

    let income = 0, expense = 0;
    const byCat: Record<string, number> = {};
    const daily: Record<string, number> = {};
    for (const t of (txs ?? []) as any[]) {
      const a = typeof t.amount === "string" ? parseFloat(t.amount) : t.amount;
      if (!Number.isFinite(a)) continue;
      if (t.type === "entrada") income += a;
      else {
        expense += a;
        const k = t.category || "sem_categoria";
        byCat[k] = (byCat[k] || 0) + a;
        daily[t.date] = (daily[t.date] || 0) + a;
      }
    }
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const peakDay = Object.entries(daily).sort((a, b) => b[1] - a[1])[0];

    const ctx = `Período: ${data.period}
Resumo: ${JSON.stringify({
      income: +income.toFixed(2),
      expense: +expense.toFixed(2),
      balance: +(income - expense).toFixed(2),
      count: txs?.length ?? 0,
    })}
Top categorias de despesa: ${JSON.stringify(top)}
Dia de pico de despesa: ${JSON.stringify(peakDay ?? null)}`;

    const lang = pickLang(data.language);
    const sys = SYSTEM[lang] ?? SYSTEM["pt-BR"];
    return runAgent({
      systemPrompt: sys,
      contextBlock: ctx,
      userPrompt: "Gere os insights agora.",
      language: lang,
      agentTag: "Agent:Dashboard",
    });
  });
