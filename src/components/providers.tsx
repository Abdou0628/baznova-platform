"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ReactNode, useEffect } from "react"
import { useCVStore } from "@/store/cv-store"

function LangUpdater() {
  const language = useCVStore((s) => s.language)
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LangUpdater />
      {children}
    </NextThemesProvider>
  )
}
