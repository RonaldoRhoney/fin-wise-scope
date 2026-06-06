import i18n from "@/lib/i18n";

// Maps backend/database errors to safe, generic user-facing messages.
export function toUserMessage(err: unknown, fallback?: string): string {
  if (import.meta.env.DEV) console.error("[error]", err);
  const t = (k: string) => i18n.t(k);
  const e = err as { code?: string; status?: number } | null;
  const code = e?.code;
  const status = e?.status;
  if (code === "23505") return t("errors.duplicate");
  if (code === "23503") return t("errors.invalidRef");
  if (code === "23514" || code === "22P02" || code === "22008") return t("errors.invalidData");
  if (code === "23502") return t("errors.missingRequired");
  if (code === "42501" || status === 401 || status === 403) return t("errors.noPermission");
  if (status === 404) return t("errors.notFound");
  if (status === 429) return t("errors.tooMany");
  return fallback ?? t("errors.generic");
}
