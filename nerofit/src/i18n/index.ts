import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import en from "./locales/en.json";
import uz from "./locales/uz.json";
import ru from "./locales/ru.json";

export const SUPPORTED_LOCALES = ["en", "uz", "ru"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function pickInitialLocale(): SupportedLocale {
  const tag = getLocales()[0]?.languageCode;
  if (tag && (SUPPORTED_LOCALES as readonly string[]).includes(tag)) {
    return tag as SupportedLocale;
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    uz: { translation: uz },
    ru: { translation: ru },
  },
  lng: pickInitialLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
  compatibilityJSON: "v4",
});

export default i18n;
