import { useNavigate } from "react-router-dom"
import { Car, History, Home, LogOut, Menu, ParkingCircle, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LanguageToggle } from "@/components/theme/LanguageToggle"
import { useLanguage } from "@/lib/i18n"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/api/auth"
import { toast } from "@/components/ui/toaster"
import { useState } from "react"
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
  const { logout, user } = useAuthStore()
  const { t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1").replace("/api/v1", "")
  const avatarUrl = user?.profile_image
    ? user.profile_image.startsWith("http")
      ? user.profile_image
      : `${API_ORIGIN}${user.profile_image}`
    : undefined

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
    { icon: Home, label: t("nav.home", "Home"), path: "/" },
    { icon: ParkingCircle, label: t("nav.parking", "Parking"), path: "/dashboard" },
    { icon: Car, label: t("nav.cars", "My Cars"), path: "/cars" },
    { icon: History, label: t("nav.sessions", "Sessions"), path: "/sessions" },
    { icon: User, label: t("nav.profile", "Profile"), path: "/profile" },
  ]

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <div className="bg-primary p-2 rounded">
                <Car className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Smart Parking</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            {navItems.map((item) => (
              item.path === "/profile" ? (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className="flex items-center space-x-2"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-5 w-5 rounded-full object-cover ring-1 ring-primary/30"
                    />
                  ) : (
                    <item.icon className="h-4 w-4" />
                  )}
                  <span>{item.label}</span>
                </Button>
              ) : (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  className="flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              )
            ))}
            <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("nav.logout", "Logout")}
            </Button>
          </div>

          {/* Mobile actions container */}
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-2 bg-background">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => {
                navigate(item.path)
                setMobileMenuOpen(false)
              }}
              className="w-full justify-start"
            >
              {item.path === "/profile" && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-4 w-4 mr-2 rounded-full object-cover ring-1 ring-primary/30"
                />
              ) : (
                <item.icon className="h-4 w-4 mr-2" />
              )}
              {item.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              setMobileMenuOpen(false)
              setLogoutDialogOpen(true)
            }}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}

      {/* Logout confirmation dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}
