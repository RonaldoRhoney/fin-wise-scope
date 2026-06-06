import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ptBR from "./locales/pt-BR.json";
import enUS from "./locales/en-US.json";
import esES from "./locales/es-ES.json";

export const SUPPORTED_LANGS = [
  { code: "pt-BR", label: "Português", flag: "🇧🇷" },
  { code: "en-US", label: "English", flag: "🇺🇸" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]["code"];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        "pt-BR": { translation: ptBR },
        "en-US": { translation: enUS },
        "es-ES": { translation: esES },
      },
      fallbackLng: "pt-BR",
      supportedLngs: ["pt-BR", "en-US", "es-ES"],
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        lookupLocalStorage: "cf-lang",
        caches: ["localStorage"],
      },
      react: { useSuspense: false },
      initImmediate: false,
    } as any);
}

export default i18n;
