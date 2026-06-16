import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
  language: z.enum(["pt-BR", "en-US", "es-ES"]).default("pt-BR"),
});

type Tx = {
  type: string;
  date: string;
  description: string;
  category: string | null;
  amount: number | string;
};

function summarizeTx(transactions: Tx[]) {
  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};
  for (const t of transactions) {
    const amt = typeof t.amount === "string" ? parseFloat(t.amount) : t.amount;
    if (!Number.isFinite(amt)) continue;
    if (t.type === "entrada") income += amt;
    else {
      expense += amt;
      const key = t.category || "sem_categoria";
      byCategory[key] = (byCategory[key] || 0) + amt;
    }
  }
  const top = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => ({ category: k, total: Math.round(v * 100) / 100 }));
  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    balance: Math.round((income - expense) * 100) / 100,
    count: transactions.length,
    topExpenseCategories: top,
  };
}

const SYSTEM_PROMPTS = {
  "pt-BR": `Você é o TipsMoney, um agente financeiro amigável do app Controle Financeiro.
Sua missão é dar dicas práticas, claras e personalizadas com base nos dados reais de entradas e despesas do usuário.
Inclua, quando fizer sentido: educação financeira, controle de gastos, formação de reserva de emergência, quitação de dívidas e ideias de investimento (Tesouro Direto, CDB, fundos de renda fixa, ETFs, ações, FIIs, cripto — citando perfil de risco).
NÃO é recomendação formal de investimento; sempre lembre o usuário de avaliar seu perfil e estudar antes de investir.
Use português brasileiro, tom acolhedor, listas curtas, números aproximados quando útil. Limite respostas a ~250 palavras.
Sempre que sua resposta mencionar investimentos, finalize com uma nova linha contendo exatamente: "Isto não é uma recomendação de investimento."`,
  "en-US": `You are TipsMoney, a friendly financial coach inside the Controle Financeiro app.
Give practical, personalized tips based on the user's real income/expense data.
Cover budgeting, emergency funds, debt payoff, and investment ideas (treasury bonds, CDs, fixed income funds, ETFs, stocks, REITs, crypto — mention risk profile).
This is NOT formal investment advice; remind users to assess their profile and do their own research.
Keep responses warm, concise (~250 words), with short bullet lists.
Whenever your reply discusses investments, end it with a new line containing exactly: "This is not an investment recommendation."`,
  "es-ES": `Eres TipsMoney, un agente financiero amistoso dentro de la app Controle Financeiro.
Da consejos prácticos y personalizados según los datos reales de ingresos y gastos del usuario.
Incluye presupuesto, fondo de emergencia, pago de deudas e ideas de inversión (bonos, depósitos, fondos de renta fija, ETFs, acciones, REITs, cripto — perfil de riesgo).
NO es asesoramiento formal; recuerda evaluar el perfil y estudiar antes de invertir.
Tono cálido, respuestas ~250 palabras, listas breves.
Siempre que tu respuesta mencione inversiones, finalízala con una línea nueva que contenga exactamente: "Esto no es una recomendación de inversión."`,
} as const;

const DISCLAIMERS: Record<keyof typeof SYSTEM_PROMPTS, string> = {
  "pt-BR": "Isto não é uma recomendação de investimento.",
  "en-US": "This is not an investment recommendation.",
  "es-ES": "Esto no es una recomendación de inversión.",
};

const INVESTMENT_PATTERN =
  /invest|renda fixa|renda variável|renda variavel|a[cç][oõ]es|tesouro|cripto|crypto|cdb|etf|fii|bond|stock|portfolio|portif[oó]lio|inversi[oó]n/i;

export const askTipsMoney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Fetch current transactions (joined via current_profile_id via RLS)
    const { data: txs } = await supabase
      .from("transactions")
      .select("type,date,description,category,amount")
      .order("date", { ascending: false })
      .limit(500);

    // Fetch archived monthly reports summaries
    const { data: reports } = await supabase
      .from("monthly_reports")
      .select("year,month,summary")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12);

    const current = summarizeTx((txs as Tx[]) ?? []);
    const history = (reports ?? []).map((r: any) => ({
      period: `${r.year}-${String(r.month).padStart(2, "0")}`,
      summary: r.summary,
    }));

    const recent = ((txs as Tx[]) ?? []).slice(0, 25).map((t) => ({
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description,
      amount: typeof t.amount === "string" ? parseFloat(t.amount) : t.amount,
    }));

    const contextBlock = `DADOS DO USUÁRIO (use para personalizar as dicas, valores em BRL):
Resumo do mês atual: ${JSON.stringify(current)}
Histórico (últimos meses arquivados): ${JSON.stringify(history)}
Últimas transações: ${JSON.stringify(recent)}`;

    const system = SYSTEM_PROMPTS[data.language] ?? SYSTEM_PROMPTS["pt-BR"];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "system", content: contextBlock },
          ...data.messages,
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("rate_limited");
      if (res.status === 402) throw new Error("payment_required");
      console.error("[TipsMoney] gateway error", res.status, errText);
      throw new Error("ai_error");
    }

    const payload = await res.json();
    let reply: string = payload?.choices?.[0]?.message?.content ?? "";
    const lang = (data.language in DISCLAIMERS ? data.language : "pt-BR") as keyof typeof DISCLAIMERS;
    const disclaimer = DISCLAIMERS[lang];
    if (reply && INVESTMENT_PATTERN.test(reply) && !reply.includes(disclaimer)) {
      reply = `${reply.trimEnd()}\n\n${disclaimer}`;
    }
    return { reply, summary: current };
  });
