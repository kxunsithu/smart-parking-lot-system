import {
  Building2,
  LayoutDashboard,
  LayoutGrid,
  Package,
  ParkingSquare,
  Shield,
  Users,
  UserCog,
  Timer,
  Repeat2,
} from "lucide-react"
import type { RoleName } from "@/types"

export interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
  end?: boolean
}

export const NAV_CONFIG: Record<RoleName, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
    { label: "Parking Lots", to: "/admin/lots", icon: ParkingSquare },
    { label: "Parking Owners", to: "/admin/owners", icon: Building2 },
    { label: "Customers", to: "/admin/users", icon: Users },
    { label: "Packages", to: "/admin/packages", icon: Package },
    { label: "Subscriptions", to: "/admin/subscriptions", icon: Repeat2 },
  ],
  OWNER: [
    { label: "Dashboard", to: "/owner", icon: LayoutDashboard, end: true },
    { label: "Subscription", to: "/owner/subscription", icon: Package },
    { label: "Parking Lots", to: "/owner/lots", icon: ParkingSquare },
    { label: "Staff", to: "/owner/staff", icon: UserCog },
    { label: "Sessions", to: "/owner/sessions", icon: Timer },
  ],
  STAFF: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard, end: true },
    { label: "Slots", to: "/staff/slots", icon: LayoutGrid },
    { label: "Sessions", to: "/staff/sessions", icon: Timer },
  ],
  CUSTOMER: [],
}


export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: "System Admin",
  OWNER: "Parking Owner",
  STAFF: "Parking Staff",
  CUSTOMER: "Customer",
}

export const ROLE_ICONS: Record<RoleName, typeof Shield> = {
  ADMIN: Shield,
  OWNER: Building2,
  STAFF: UserCog,
  CUSTOMER: Users,
}

export function homePathForRole(role: RoleName): string {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "OWNER":
      return "/owner"
    case "STAFF":
      return "/staff"
    case "CUSTOMER":
      return "/"
  }
}
