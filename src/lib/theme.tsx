import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark";
export type Font = "inter" | "poppins" | "roboto" | "system";

interface ThemeContextType {
  theme: Theme;
  font: Font;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setFont: (font: Font) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FONTS: Record<Font, string> = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  poppins: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  roboto: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start from the server-safe defaults so the first client render
  // matches the SSR HTML. Reading localStorage during render would make the
  // client's first render differ from the server's and break hydration.
  // The persisted values are applied after mount instead.
  const [theme, setThemeState] = useState<Theme>("light");
  const [font, setFontState] = useState<Font>("inter");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const storedFont = localStorage.getItem("font");
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeState(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }
    if (storedFont && storedFont in FONTS) {
      setFontState(storedFont as Font);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.setProperty("--font-family", FONTS[font]);
    localStorage.setItem("theme", theme);
  }, [theme, font]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setThemeState(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  const setTheme = (t: Theme) => setThemeState(t);
  const setFont = (f: Font) => setFontState(f);

  return (
    <ThemeContext.Provider value={{ theme, font, toggleTheme, setTheme, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
