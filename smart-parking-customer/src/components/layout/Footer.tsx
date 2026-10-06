import { Link } from "react-router-dom"
import { Car } from "lucide-react"
import { LanguageToggle } from "@/components/theme/LanguageToggle"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { useLanguage } from "@/lib/i18n"

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-border/50 py-8 px-4 sm:px-6 mt-auto bg-card/30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded bg-primary flex items-center justify-center">
            <Car className="size-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Smart Parking</p>
            <p className="text-[10px] text-muted-foreground">Kayin State</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-muted-foreground text-center">
          <p>© {new Date().getFullYear()} {t("footer.subtitle", "Smart Parking Lot Management System. Built for Kayin State.")}</p>
          <Link to="/about" className="hover:text-primary transition-colors font-medium underline-offset-4 hover:underline">
            {t("footer.about_us", "About Us")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
