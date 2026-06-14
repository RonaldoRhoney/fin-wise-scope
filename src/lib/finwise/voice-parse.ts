// Portuguese (pt-BR) voice command parser for transactions.

const UNITS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4,
  cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19,
};
const TENS: Record<string, number> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, cinquenta_: 50,
  sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
};
const HUNDREDS: Record<string, number> = {
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};
const SCALES: Record<string, number> = { mil: 1000, milhao: 1_000_000, milhão: 1_000_000, milhoes: 1_000_000, milhões: 1_000_000 };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function wordsToNumber(words: string[]): number | null {
  // Handle decimal "X reais e Y centavos"
  let total = 0;
  let current = 0;
  let found = false;
  for (const wRaw of words) {
    const w = wRaw.toLowerCase();
    if (w === "e") continue;
    if (UNITS[w] !== undefined) { current += UNITS[w]; found = true; }
    else if (TENS[w] !== undefined) { current += TENS[w]; found = true; }
    else if (HUNDREDS[w] !== undefined) { current += HUNDREDS[w]; found = true; }
    else if (SCALES[w] !== undefined) {
      const scale = SCALES[w];
      current = (current || 1) * scale;
      total += current;
      current = 0;
      found = true;
    } else {
      // unknown word — break the number sequence
      break;
    }
  }
  total += current;
  return found ? total : null;
}

export type VoiceParseResult = {
  type: "entrada" | "despesa" | null;
  description: string;
  amount: number | null;
  raw: string;
};

const INCOME_WORDS = ["entrada", "entradas", "receita", "receitas", "recebi", "ganhei", "recebimento"];
const EXPENSE_WORDS = ["saida", "saidas", "despesa", "despesas", "gastei", "paguei", "gasto", "compra", "comprei"];

export function parseVoiceCommand(transcript: string): VoiceParseResult {
  const raw = transcript.trim();
  const lower = norm(raw);
  const tokens = lower.split(/[\s,]+/).filter(Boolean);

  // type detection
  let type: "entrada" | "despesa" | null = null;
  let typeIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (INCOME_WORDS.includes(tokens[i])) { type = "entrada"; typeIdx = i; break; }
    if (EXPENSE_WORDS.includes(tokens[i])) { type = "despesa"; typeIdx = i; break; }
  }

  // amount: try digit number first, else parse trailing words
  let amount: number | null = null;
  let amountStartIdx = -1;
  let amountEndIdx = -1;

  // 1) try numeric like "2000" or "1.500,50" or "1500.50"
  const numRegex = /(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g;
  const numMatches = [...lower.matchAll(numRegex)];
  if (numMatches.length) {
    const last = numMatches[numMatches.length - 1];
    const s = last[0].replace(/\s/g, "");
    let val: number;
    if (s.includes(",")) {
      val = parseFloat(s.replace(/\./g, "").replace(",", "."));
    } else {
      val = parseFloat(s);
    }
    if (!Number.isNaN(val)) {
      amount = val;
      // find token index containing this number
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (/\d/.test(tokens[i])) { amountStartIdx = i; amountEndIdx = i; break; }
      }
    }
  }

  // 2) try spelled-out number (search longest tail of number words)
  if (amount === null) {
    const isNumWord = (w: string) =>
      w === "e" || UNITS[w] !== undefined || TENS[w] !== undefined ||
      HUNDREDS[w] !== undefined || SCALES[w] !== undefined;
    // strip trailing currency words
    const trail = ["reais", "real", "centavos", "centavo"];
    let end = tokens.length;
    while (end > 0 && trail.includes(tokens[end - 1])) end--;
    let start = end;
    while (start > 0 && isNumWord(tokens[start - 1])) start--;
    // drop leading "e"
    while (start < end && tokens[start] === "e") start++;
    if (end > start) {
      const n = wordsToNumber(tokens.slice(start, end));
      if (n !== null) {
        amount = n;
        amountStartIdx = start;
        amountEndIdx = end - 1;
        // include trailing currency words in removed range
        while (amountEndIdx + 1 < tokens.length && trail.includes(tokens[amountEndIdx + 1])) amountEndIdx++;
      }
    }
  } else {
    // include trailing currency words after numeric amount
    const trail = ["reais", "real", "centavos", "centavo"];
    while (amountEndIdx + 1 < tokens.length && trail.includes(tokens[amountEndIdx + 1])) amountEndIdx++;
  }

  // description = tokens between (typeIdx+1) and amountStartIdx-1
  const descStart = typeIdx >= 0 ? typeIdx + 1 : 0;
  const descEnd = amountStartIdx >= 0 ? amountStartIdx : tokens.length;
  const rawTokens = raw.split(/\s+/);
  // map back to original (case-preserving) using same index since we used split similarly
  const desc = rawTokens.slice(descStart, descEnd).join(" ").replace(/[,;]+$/g, "").trim();

  return { type, description: desc, amount, raw };
}
