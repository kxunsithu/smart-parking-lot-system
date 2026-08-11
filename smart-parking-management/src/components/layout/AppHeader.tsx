import { useNavigate } from "react-router-dom"
import { LogOut, Menu, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { useAuth } from "@/hooks/useAuth"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/stores/authStore"
import { initials } from "@/utils/formatters"
import { ROLE_LABELS } from "@/utils/navConfig"
import type { RoleName } from "@/types"
import { useState } from "react"
import { API_ORIGIN } from "@/api/client"

export function AppHeader({ role }: { role: RoleName }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const avatarUrl = user?.profile_image
    ? user.profile_image.startsWith("http")
      ? user.profile_image
      : `${API_ORIGIN}${user.profile_image}`
    : undefined

  async function handleLogout() {
    const refreshToken = useAuthStore.getState().refreshToken
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // Ignore network errors on logout; clear local session regardless.
    } finally {
      logout()
      navigate("/login", { replace: true })
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppSidebar role={role} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-foreground">Welcome back, {user?.name?.split(" ")[0]}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-8">
                <AvatarImage src={avatarUrl} alt={user?.name ?? "Avatar"} className="object-cover" />
                <AvatarFallback className="bg-primary/15 text-primary">
                  {initials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserIcon className="size-4" />
              Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
