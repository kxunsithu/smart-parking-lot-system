import { useState, useEffect } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { LogOut, User as UserIcon, ParkingSquare, Menu, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { useAuth } from "@/hooks/useAuth"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/stores/authStore"
import { initials } from "@/utils/formatters"
import { NAV_CONFIG } from "@/utils/navConfig"
import { API_ORIGIN } from "@/api/client"

export function StaffNavbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = NAV_CONFIG.STAFF
  const [mobileOpen, setMobileOpen] = useState(false)

  const avatarUrl = user?.profile_image
    ? user.profile_image.startsWith("http")
      ? user.profile_image
      : `${API_ORIGIN}${user.profile_image}`
    : undefined

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  async function handleLogout() {
    const refreshToken = useAuthStore.getState().refreshToken
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // Ignore network errors on logout
    } finally {
      logout()
      navigate("/login", { replace: true })
    }
  }

  return (
    <>
      {/* ── Top Navbar Bar (z-40) ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

          {/* ── Left: Brand + Desktop Nav ── */}
          <div className="flex items-center gap-2 sm:gap-6">
            {/* Brand */}
            <NavLink
              to="/staff"
              className="flex items-center gap-2.5 group shrink-0"
              onClick={() => setMobileOpen(false)}
            >
              <div className="size-9 rounded bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-150">
                <ParkingSquare className="size-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <p className="font-extrabold text-sm leading-tight tracking-tight text-foreground">Smart Parking</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Staff Portal</p>
              </div>
            </NavLink>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-4">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold transition-all duration-150 ${isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* ── Right: Theme Toggle + User Menu + Hamburger ── */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            {/* Desktop User Dropdown */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3 rounded hover:bg-muted h-9">
                    <Avatar className="size-8 border-2 border-primary/20 shrink-0">
                      <AvatarImage src={avatarUrl} alt={user?.name ?? "Avatar"} className="object-cover" />
                      <AvatarFallback className="bg-primary/10 text-primary font-extrabold text-xs">
                        {initials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left max-w-[120px]">
                      <p className="text-xs font-bold leading-tight text-foreground truncate">{user?.name}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Staff Member</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded shadow-lg">
                  <DropdownMenuGroup>
                    <div className="px-3 py-2.5">
                      <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                  </DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="text-xs gap-2 cursor-pointer">
                    <UserIcon className="size-4" />
                    Profile & Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout} className="text-xs gap-2 cursor-pointer">
                    <LogOut className="size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Hamburger — only visible on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Full-Screen Mobile Nav Overlay (z-50, above header) ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        aria-hidden={!mobileOpen}
      >
        {/* Dark backdrop — click to close */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-in Panel */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[82vw] max-w-[320px] bg-background flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          {/* Panel Top Bar: Brand + Close Button */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded bg-primary flex items-center justify-center shadow-sm shrink-0">
                <ParkingSquare className="size-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-extrabold text-sm leading-tight text-foreground">Smart Parking</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Staff Portal</p>
              </div>
            </div>

            {/* Panel Top Bar Actions: ThemeToggle + Close Button */}
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded hover:bg-muted shrink-0"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 py-5 flex flex-col gap-1 overflow-y-auto">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Navigation</p>
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3 mb-3 rounded text-sm font-semibold transition-all duration-150 group ${isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`size-8 rounded flex items-center justify-center shrink-0 transition-colors ${isActive ? "bg-primary-foreground/20" : "bg-muted group-hover:bg-background"
                          }`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {!isActive && <ChevronRight className="size-3.5 opacity-40" />}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Panel Footer — User info + actions */}
          <div className="px-4 py-5 border-t border-border/50 space-y-2 shrink-0">
            {/* User Info Card */}
            <div className="flex items-center gap-3 p-3 rounded bg-muted/60">
              <Avatar className="size-10 border-2 border-primary/20 shrink-0">
                <AvatarImage src={avatarUrl} alt={user?.name ?? "Avatar"} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-extrabold text-sm">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => { setMobileOpen(false); navigate("/profile") }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
            >
              <UserIcon className="size-4 shrink-0" />
              Profile & Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-150"
            >
              <LogOut className="size-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
