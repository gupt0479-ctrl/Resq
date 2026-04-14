"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"

import { THEME_STORAGE_KEY, type Theme, sanitizeTheme } from "./theme-shared"

type ThemeContextValue = {
  mounted: boolean
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
}

function getInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark") ? "dark" : "light"
  }

  if (typeof window !== "undefined") {
    return sanitizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  }

  return "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage write failures and keep the in-memory theme active.
    }
  }, [theme])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return
      }

      setThemeState(sanitizeTheme(event.newValue))
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const setTheme = useCallback((nextTheme: Theme) => {
    const sanitizedTheme = sanitizeTheme(nextTheme)
    setThemeState(sanitizedTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [setTheme, theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mounted,
      resolvedTheme: theme,
      setTheme,
      toggleTheme,
    }),
    [mounted, setTheme, theme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
