import { supabase } from "@/integrations/supabase/client";

function parseUA(ua: string) {
  const u = ua.toLowerCase();
  const isTablet = /ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua);
  const isMobile = !isTablet && /mobi|iphone|ipod|android.*mobi|opera mini|blackberry|iemobile/i.test(ua);
  const device_type = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let os = "Unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome\//i.test(ua)) browser = "Safari";

  // crude method detection
  let login_method: "google" | "apple" | "password" | "unknown" = "unknown";
  return { device_type, os, browser, login_method };
}

const SESSION_KEY = "finwise:lastAccessLogAt";

export async function logAccessOnce(userId: string, email: string | null, methodHint?: string) {
  try {
    if (typeof window === "undefined") return;
    // throttle: avoid duplicate logs within 5 minutes per tab
    const last = Number(sessionStorage.getItem(SESSION_KEY) ?? 0);
    if (Date.now() - last < 5 * 60 * 1000) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));

    const ua = navigator.userAgent || "";
    const parsed = parseUA(ua);
    const method = (methodHint as any) || parsed.login_method;

    await supabase.from("access_logs").insert({
      user_id: userId,
      user_email: email,
      device_type: parsed.device_type,
      os: parsed.os,
      browser: parsed.browser,
      login_method: method,
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[access-log] failed", e);
  }
}
