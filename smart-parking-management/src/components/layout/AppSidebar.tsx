import { NavLink } from "react-router-dom"
import { ParkingSquare, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_CONFIG, ROLE_LABELS } from "@/utils/navConfig"
import type { RoleName } from "@/types"

interface AppSidebarProps {
  role: RoleName
  onNavigate?: () => void
  hasSubscription?: boolean
}

export function AppSidebar({ role, onNavigate, hasSubscription }: AppSidebarProps) {
  const items = NAV_CONFIG[role]

  // Check if navigation item should be disabled for owners without subscription
  const isItemDisabled = (to: string) => {
    if (role !== "OWNER" || hasSubscription) return false
    // Disable parking lots and staff management for owners without subscription
    return to.startsWith("/owner/lots") || to.startsWith("/owner/staff")
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ParkingSquare className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Smart Parking</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const disabled = isItemDisabled(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={disabled ? (e) => e.preventDefault() : onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  disabled
                    ? "opacity-50 cursor-not-allowed text-muted-foreground"
                    : isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
              title={disabled ? "Requires active subscription" : undefined}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
              {disabled && <Lock className="ml-auto size-3" />}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        Smart Parking Lot System v1.0
      </div>
    </div>
  )
}
