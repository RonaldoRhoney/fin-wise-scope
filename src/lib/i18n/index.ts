import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "./locales/pt-BR.json";
import enUS from "./locales/en-US.json";
import esES from "./locales/es-ES.json";

export const SUPPORTED_LANGS = [
  { code: "pt-BR", label: "Português", flag: "🇧🇷" },
  { code: "en-US", label: "English", flag: "🇺🇸" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]["code"];

const detectLang = (): string => {
  if (typeof window === "undefined") return "pt-BR";
  try {
    const stored = localStorage.getItem("cf-lang");
    if (stored) return stored;
  } catch {}
  const nav = (typeof navigator !== "undefined" && navigator.language) || "pt-BR";
  const base = nav.toLowerCase().split("-")[0];
  if (base === "pt") return "pt-BR";
  if (base === "es") return "es-ES";
  if (base === "en") return "en-US";
  return "pt-BR";
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      "pt-BR": { translation: ptBR },
      "en-US": { translation: enUS },
      "es-ES": { translation: esES },
    },
    lng: detectLang(),
    fallbackLng: "pt-BR",
    supportedLngs: ["pt-BR", "en-US", "es-ES"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    initImmediate: false,
  } as any);
}

export function setLanguage(lang: LangCode) {
  i18n.changeLanguage(lang);
  try { localStorage.setItem("cf-lang", lang); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

export default i18n;
