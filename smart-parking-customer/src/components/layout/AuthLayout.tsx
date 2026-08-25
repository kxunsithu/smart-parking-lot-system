import { Car, ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { LanguageToggle } from "@/components/theme/LanguageToggle"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { Button } from "@/components/ui/button"

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {/* Logo + Brand Name + Toggles */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20">
              <Car className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground font-bold leading-tight">
                Smart Parking
              </p>
              <p className="text-xs text-muted-foreground">Customer Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        {children}
      </div>
    </main>
  )
}
