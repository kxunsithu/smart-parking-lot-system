import { Car } from "lucide-react"
import { LanguageToggle } from "@/components/theme/LanguageToggle"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-8 px-4 sm:px-6 mt-auto bg-card/30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <Car className="size-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Smart Parking</p>
            <p className="text-[10px] text-muted-foreground">Myanmar Parking System</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Smart Parking Lot Management System. Built for Myanmar.
        </p>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
