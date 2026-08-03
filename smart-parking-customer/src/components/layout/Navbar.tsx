import { useNavigate } from "react-router-dom"
import { Car, History, LogOut, Menu, ParkingCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
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
  const { logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

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
    { icon: ParkingCircle, label: "Parking", path: "/dashboard" },
    { icon: Car, label: "My Cars", path: "/cars" },
    { icon: History, label: "Sessions", path: "/sessions" },
    { icon: User, label: "Profile", path: "/profile" },
  ]

  return (
    <nav className="sticky top-0 z-40 border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2"
            >
              <div className="bg-primary p-2 rounded">
                <Car className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Smart Parking</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="fixed right-4 top-3 z-50">
              <ThemeToggle />
            </div>
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className="flex items-center space-x-2"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            ))}
            <Button variant="ghost" onClick={() => setLogoutDialogOpen(true)}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <div className="fixed right-4 top-3 z-50">
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4 space-y-2">
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
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => setLogoutDialogOpen(true)}
            className="w-full justify-start"
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
