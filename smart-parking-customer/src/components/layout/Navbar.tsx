import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArrowRight, Car, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LanguageToggle } from "@/components/theme/LanguageToggle"
import { useLanguage } from "@/lib/i18n"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { toast } from "@/components/ui/toaster"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const { t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const isAuthenticated = !!user

  const handleLogout = async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch (error) {
      console.error("Logout API call failed, clearing local state anyway", error)
    }
    logout()
    setLogoutDialogOpen(false)
    toast.success("Logged out successfully")
    navigate("/login")
  }

  const navItems = isAuthenticated
    ? [
        { label: t("nav.home", "Home"), path: "/" },
        { label: t("nav.parking", "Parking"), path: "/dashboard" },
        { label: t("nav.cars", "My Cars"), path: "/cars" },
        { label: t("nav.sessions", "Sessions"), path: "/sessions" },
        { label: t("nav.profile", "Profile"), path: "/profile" },
      ]
    : []

  return (
    <nav className="sticky top-0 z-50 w-full shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <button
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="size-9 rounded bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Car className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight text-foreground">Smart Parking</p>
              <p className="text-[10px] text-primary font-semibold uppercase tracking-widest">Myanmar</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Button
                  key={item.path}
                  variant={isActive ? "secondary" : "ghost"}
                  onClick={() => navigate(item.path)}
                  className={`text-sm ${isActive ? "font-semibold" : ""}`}
                >
                  {item.label}
                </Button>
              )
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            {isAuthenticated ? (
              <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
                {t("nav.logout", "Logout")}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  {t("nav.login", "Log in")}
                </Button>
                <Button size="sm" onClick={() => navigate("/register")} className="gap-1.5">
                  {t("nav.register", "Register")}
                  <ArrowRight className="size-3.5" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-2 bg-background/95 backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                onClick={() => {
                  navigate(item.path)
                  setMobileMenuOpen(false)
                }}
                className="w-full justify-start"
              >
                {item.label}
              </Button>
            )
          })}

          <div className="pt-2 border-t space-y-2">
            {isAuthenticated ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setLogoutDialogOpen(true)
                }}
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {t("nav.logout", "Logout")}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); navigate("/login") }}>
                  {t("nav.login", "Log in")}
                </Button>
                <Button className="w-full gap-1.5" onClick={() => { setMobileMenuOpen(false); navigate("/register") }}>
                  {t("nav.register", "Register")}
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout confirmation dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("nav.logout_title", "Are you sure you want to logout?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("nav.logout_desc", "You will need to sign in again to access your account.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>{t("nav.logout_confirm", "Logout")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}
