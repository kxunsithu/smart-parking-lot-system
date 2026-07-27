import { NavLink } from "react-router-dom"
import { ParkingSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_CONFIG, ROLE_LABELS } from "@/utils/navConfig"
import type { RoleName } from "@/types"

interface AppSidebarProps {
  role: RoleName
  onNavigate?: () => void
}

export function AppSidebar({ role, onNavigate }: AppSidebarProps) {
  const items = NAV_CONFIG[role]

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
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
        Smart Parking Lot System v1.0
      </div>
    </div>
  )
}
