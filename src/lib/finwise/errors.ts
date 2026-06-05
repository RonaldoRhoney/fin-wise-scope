// Maps backend/database errors to safe, generic user-facing messages.
// Full error details are kept in the browser console for debugging only.
export function toUserMessage(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (import.meta.env.DEV) console.error("[error]", err);
  const e = err as { code?: string; status?: number } | null;
  const code = e?.code;
  const status = e?.status;
  if (code === "23505") return "Registro duplicado.";
  if (code === "23503") return "Operação inválida: referência não encontrada.";
  if (code === "23514" || code === "22P02" || code === "22008") return "Dados inválidos.";
  if (code === "23502") return "Preencha todos os campos obrigatórios.";
  if (code === "42501" || status === 401 || status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Registro não encontrado.";
  if (status === 429) return "Muitas tentativas. Aguarde alguns instantes.";
  return fallback;
}
