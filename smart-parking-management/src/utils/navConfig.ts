import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  ParkingSquare,
  Shield,
  Timer,
  Users,
  UserCog,
  CalendarCheck,
  Crown,
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
    { label: "Parking Owners", to: "/admin/owners", icon: Building2 },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Subscription Plans", to: "/admin/subscription-plans", icon: Crown },
  ],
  OWNER: [
    { label: "Dashboard", to: "/owner", icon: LayoutDashboard, end: true },
    { label: "Subscription", to: "/owner/subscription", icon: Crown },
    { label: "Parking Lots", to: "/owner/lots", icon: ParkingSquare },
    { label: "Staff", to: "/owner/staff", icon: UserCog },
    { label: "Reservations", to: "/owner/reservations", icon: CalendarCheck },
    { label: "Sessions", to: "/owner/sessions", icon: Timer },
    { label: "Payments", to: "/owner/payments", icon: CreditCard },
  ],
  STAFF: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard, end: true },
    { label: "Slots", to: "/staff/slots", icon: LayoutGrid },
    { label: "Reservations", to: "/staff/reservations", icon: CalendarCheck },
    { label: "Sessions", to: "/staff/sessions", icon: Timer },
  ],
}

export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: "System Admin",
  OWNER: "Parking Owner",
  STAFF: "Parking Staff",
}

export const ROLE_ICONS: Record<RoleName, typeof Shield> = {
  ADMIN: Shield,
  OWNER: Building2,
  STAFF: UserCog,
}

export function homePathForRole(role: RoleName): string {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "OWNER":
      return "/owner"
    case "STAFF":
      return "/staff"
  }
}
