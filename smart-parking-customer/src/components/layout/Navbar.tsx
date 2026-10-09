import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArrowRight, Menu, X, LogOut, User, CarFront } from "lucide-react"
import appIcon from "@/assets/icon.png"
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const { t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAuthenticated = !!user

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  const navItems = [
    { label: t("nav.home", "Home"), path: "/" },
    { label: t("nav.parking", "Parking"), path: "/dashboard" },
    ...(isAuthenticated ? [{ label: t("nav.sessions", "Sessions"), path: "/sessions" }] : []),
    { label: t("nav.about", "About Us"), path: "/about" },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <button
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="size-9 rounded overflow-hidden shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <img src={appIcon} alt="AI Parking" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight text-foreground">AI Parking</p>
              <p className="text-[10px] text-primary font-semibold uppercase tracking-widest">Kayin State</p>
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-3.5 py-2 text-sm cursor-pointer transition-colors ${isActive
                    ? "font-bold text-primary"
                    : "font-medium text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Avatar trigger */}
                <button
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Profile menu"
                  aria-expanded={profileDropdownOpen}
                >
                  <div className="size-9 rounded-full border-2 border-border hover:border-primary transition-colors overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                    {user.profile_image ? (
                      <img
                        src={user.profile_image}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {getInitials(user.name)}
                      </span>
                    )}
                  </div>
                </button>

                {/* Dropdown panel */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded border border-border bg-card shadow-xl py-1 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
                    {/* User info */}
                    <div className="px-3 py-2.5 border-b border-border">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {/* Profile link */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        navigate("/profile")
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    >
                      <User className="size-4 text-muted-foreground" />
                      {t("nav.profile", "Profile")}
                    </button>
                    {/* My Vehicles link */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        navigate("/cars")
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    >
                      <CarFront className="size-4 text-muted-foreground" />
                      {t("nav.cars", "My Vehicles")}
                    </button>
                    {/* Logout */}
                    <div className="border-t border-border mt-1">
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          setLogoutDialogOpen(true)
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="size-4" />
                        {t("nav.logout", "Logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
            {/* Mobile profile avatar */}
            {isAuthenticated && user && (
              <button
                onClick={() => navigate("/profile")}
                className="size-8 rounded-full border-2 border-border overflow-hidden bg-primary/10 flex items-center justify-center shrink-0"
                aria-label="Go to profile"
              >
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-primary">{getInitials(user.name)}</span>
                )}
              </button>
            )}
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
        <div className="md:hidden border-t p-4 space-y-3 bg-background/95 backdrop-blur-xl">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors rounded ${isActive
                    ? "font-bold text-primary"
                    : "font-medium text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Preferences Row (Language & Dark Mode Toggles inside mobile dropdown) */}
          <div className="pt-2 border-t flex items-center justify-between px-3 py-2.5 rounded bg-muted/40 border border-border/60">
            <span className="text-xs font-semibold text-muted-foreground">
              {t("nav.preferences", "Language & Theme")}
            </span>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="pt-2 border-t space-y-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate("/profile")
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded"
                >
                  <User className="size-4" />
                  {t("nav.profile", "Profile")}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate("/cars")
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded"
                >
                  <CarFront className="size-4" />
                  {t("nav.cars", "My Vehicles")}
                </button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setLogoutDialogOpen(true)
                  }}
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  {t("nav.logout", "Logout")}
                </Button>
              </>
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
