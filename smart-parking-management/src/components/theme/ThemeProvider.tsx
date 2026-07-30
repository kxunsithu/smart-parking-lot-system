import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export { useTheme }
