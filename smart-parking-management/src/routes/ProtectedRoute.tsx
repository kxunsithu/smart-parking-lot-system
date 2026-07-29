import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import type { RoleName } from "@/types"

interface ProtectedRouteProps {
  allowedRoles?: RoleName[]
  allowUnverified?: boolean
}

export function ProtectedRoute({ allowedRoles, allowUnverified = false }: ProtectedRouteProps) {
  const { isAuthenticated, role, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Check email verification (except on the verify-email page itself)
  if (!allowUnverified && !user?.is_verified && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace state={{ from: location }} />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export function AuthOnlyRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { isAuthenticated, role } = useAuth()
  if (isAuthenticated && role) {
    return <Navigate to={homePath(role)} replace />
  }
  return <Outlet />
}

function homePath(role: RoleName): string {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "OWNER":
      return "/owner"
    case "STAFF":
      return "/staff"
    default:
      return "/"
  }
}
