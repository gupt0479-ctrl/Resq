export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "opspilot-theme"

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
        root.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    })();
  `
}
