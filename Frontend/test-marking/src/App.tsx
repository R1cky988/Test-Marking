import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { ThemeProvider, useTheme } from "next-themes";
import i18n from "@/i18n";
import { router } from "./routes";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();
const preferenceStorageKey = "teacher_settings_preferences";

function ThemePreferenceSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(preferenceStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const theme = parsed?.display?.theme;
      if (theme === "light" || theme === "dark" || theme === "system") {
        setTheme(theme);
      }
    } catch {
      return;
    }
    // This is a one-time migration from the settings preference store.
    // Subsequent changes are managed directly by next-themes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function LanguagePreferenceSync() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(preferenceStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const language = parsed?.display?.language;
      if (language === "en" || language === "vi") {
        document.documentElement.lang = language;
        document.documentElement.setAttribute("data-lang", language);
        void i18n.changeLanguage(language);
      }
    } catch {
      return;
    }
  }, []);

  return null;
}

function AppContent() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ThemePreferenceSync />
        <LanguagePreferenceSync />
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
