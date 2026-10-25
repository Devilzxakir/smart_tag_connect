/**
 * Design tokens for the mobile app.
 *
 * Same brand language as the web app (`src/styles.css`): deep navy background
 * with a teal accent, plus a light palette for daylight use.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Palette = {
  name: "light" | "dark";
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  inputBackground: string;
  tabBar: string;
  qrBackground: string;
};

const dark: Palette = {
  name: "dark",
  background: "#080F1E",
  surface: "#111B30",
  surfaceAlt: "#16233C",
  border: "#1F2F4C",
  text: "#F3F7FF",
  textMuted: "#93A6C6",
  primary: "#1FB6C9",
  primarySoft: "rgba(31, 182, 201, 0.16)",
  onPrimary: "#03151B",
  success: "#2ED3A0",
  successSoft: "rgba(46, 211, 160, 0.14)",
  warning: "#F5B443",
  warningSoft: "rgba(245, 180, 67, 0.14)",
  danger: "#F76C6C",
  dangerSoft: "rgba(247, 108, 108, 0.14)",
  inputBackground: "#0C1526",
  tabBar: "#0A1425",
  qrBackground: "#FFFFFF",
};

const light: Palette = {
  name: "light",
  background: "#F2F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EAF3F7",
  border: "#D8E5EE",
  text: "#0D1F33",
  textMuted: "#5A7291",
  primary: "#0E93A8",
  primarySoft: "rgba(14, 147, 168, 0.12)",
  onPrimary: "#FFFFFF",
  success: "#12996F",
  successSoft: "rgba(18, 153, 111, 0.12)",
  warning: "#B7791F",
  warningSoft: "rgba(183, 121, 31, 0.14)",
  danger: "#D64545",
  dangerSoft: "rgba(214, 69, 69, 0.12)",
  inputBackground: "#FFFFFF",
  tabBar: "#FFFFFF",
  qrBackground: "#FFFFFF",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

const STORAGE_KEY = "smart-tag-connect:theme";

type ThemeContextValue = {
  palette: Palette;
  preference: "system" | "light" | "dark";
  setPreference: (next: "system" | "light" | "dark") => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<"system" | "light" | "dark">("system");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: "system" | "light" | "dark") => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const palette = useMemo(() => {
    const resolved = preference === "system" ? (system === "light" ? "light" : "dark") : preference;
    return resolved === "light" ? light : dark;
  }, [preference, system]);

  const toggle = useCallback(() => {
    setPreference(palette.name === "dark" ? "light" : "dark");
  }, [palette.name, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ palette, preference, setPreference, toggle }),
    [palette, preference, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/** Semantic colours for tag status / record kinds. */
export function statusTone(palette: Palette, status: string) {
  switch (status) {
    case "written":
      return { fg: palette.success, bg: palette.successSoft };
    case "demo":
      return { fg: palette.warning, bg: palette.warningSoft };
    case "failed":
      return { fg: palette.danger, bg: palette.dangerSoft };
    default:
      return { fg: palette.textMuted, bg: palette.surfaceAlt };
  }
}
