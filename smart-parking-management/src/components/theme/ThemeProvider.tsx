import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "smart-parking-theme"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system"
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system"
  })

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
  }, [resolvedTheme])

  useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      document.documentElement.classList.toggle("dark", media.matches)
    }
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [theme])

  function setTheme(value: Theme) {
    setThemeState(value)
    localStorage.setItem(STORAGE_KEY, value)
  }

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
