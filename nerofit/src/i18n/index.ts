import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import uz from "./locales/uz.json";
import ru from "./locales/ru.json";

export const SUPPORTED_LOCALES = ["en", "uz", "ru"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_KEY = "app-locale";

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

// Restore a previously chosen locale (overrides the device default).
void AsyncStorage.getItem(LOCALE_KEY).then((saved) => {
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
    void i18n.changeLanguage(saved);
  }
});

// Change the active locale and remember it across launches.
export function setLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
  void AsyncStorage.setItem(LOCALE_KEY, locale);
}

export default i18n;
