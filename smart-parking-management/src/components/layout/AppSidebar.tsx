import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, LogOut, ParkingSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_CONFIG, ROLE_LABELS } from "@/utils/navConfig"
import type { RoleName } from "@/types"
import { useAuth } from "@/hooks/useAuth"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/stores/authStore"

interface AppSidebarProps {
  role: RoleName
  onNavigate?: () => void
  collapsible?: boolean
}

export function AppSidebar({ role, onNavigate, collapsible = true }: AppSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const items = NAV_CONFIG[role]

  const expanded = collapsible ? isOpen : true

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
    <aside
      className={cn(
        "relative shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col min-h-screen transition-all duration-300 ease-in-out",
        expanded ? "w-72" : "w-16",
      )}
    >
      {/* Logo + Brand Name */}
      <div
        className={cn(
          "px-3 py-4 border-b border-sidebar-border flex items-center",
          expanded ? "justify-between gap-2.5" : "justify-center",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 overflow-hidden",
            expanded ? "flex-1 min-w-0" : "hidden",
          )}
        >
          <div className="size-9 rounded-full overflow-hidden shrink-0 border border-sidebar-border bg-primary/10 flex items-center justify-center">
            <ParkingSquare className="size-5 text-primary" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight truncate">
              Smart Parking
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>

        {/* Logo (collapsed) */}
        {!expanded && (
          <div className="size-9 rounded-full overflow-hidden border border-sidebar-border bg-primary/10 flex items-center justify-center">
            <ParkingSquare className="size-5 text-primary" />
          </div>
        )}
      </div>

      {/* Toggle Button — anchored to the sidebar itself, consistent position in both states */}
      {collapsible && (
        <button
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="absolute top-5 -right-3 z-10 flex items-center justify-center size-7 rounded-full border border-sidebar-border bg-sidebar text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm transition-colors duration-150"
        >
          {isOpen ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={!expanded ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                      expanded ? "px-4" : "px-0 justify-center",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  {expanded && (
                    <span className="leading-tight text-nowrap">{item.label}</span>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={handleLogout}
          title={!expanded ? "Log out" : undefined}
          className={cn(
            "flex items-center gap-2.5 w-full py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors duration-150",
            expanded ? "px-4" : "justify-center px-0",
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {expanded && <span>Log out</span>}
        </button>
      </div>
    </aside>
  )
}
