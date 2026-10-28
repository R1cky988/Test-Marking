import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./en.json";
import vi from "./vi.json";

const preferenceStorageKey = "teacher_settings_preferences";

function getInitialLanguage(): "vi" | "en" {
  if (typeof window === "undefined") return "vi";
  try {
    const raw = localStorage.getItem(preferenceStorageKey);
    if (!raw) return "vi";
    const parsed = JSON.parse(raw);
    return parsed?.display?.language === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: "vi",
  resources: {
    en: { translation: en },
    vi: { translation: vi },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
