export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "resq-theme"

export function sanitizeTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light"
}

export function getThemeInitScript() {
  return `
    (function() {
      try {
        var storageKey = "${THEME_STORAGE_KEY}";
        var rawTheme = window.localStorage.getItem(storageKey);
        var theme = rawTheme === "dark" ? "dark" : "light";
        var root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
      } catch (error) {
        document.documentElement.classList.remove("dark");
      }
    })();
  `
}
