import { useLocation, Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useAuth } from "@/hooks/useAuth"

const BREADCRUMB_CONFIG: Record<string, { label: string; parent?: string }> = {
  "/admin": { label: "Dashboard" },
  "/admin/owners": { label: "Owners", parent: "/admin" },
  "/admin/users": { label: "Users", parent: "/admin" },
  "/owner": { label: "Dashboard" },
  "/owner/lots": { label: "Parking Lots", parent: "/owner" },
  "/owner/staff": { label: "Staff", parent: "/owner" },
  "/owner/sessions": { label: "Sessions", parent: "/owner" },
  "/staff": { label: "Dashboard" },
  "/staff/slots": { label: "Slots Board", parent: "/staff" },
  "/staff/sessions": { label: "Sessions", parent: "/staff" },
  "/profile": { label: "Profile" },
}

function getBreadcrumbs(pathname: string, role?: string): Array<{ label: string; href?: string }> {
  // Handle dynamic routes
  const lotDetailMatch = pathname.match(/^\/(admin|owner)\/lots\/(\d+)$/)
  if (lotDetailMatch) {
    const prefix = lotDetailMatch[1]
    return [
      { label: "Dashboard", href: role === "OWNER" ? "/owner" : role === "ADMIN" ? "/admin" : "/staff" },
      { label: "Parking Lots", href: `/${prefix}/lots` },
      { label: "Lot Details" },
    ]
  }

  const mapMatch = pathname.match(/^\/map\/(\d+)$/)
  if (mapMatch) {
    return [
      { label: "Dashboard", href: role === "OWNER" ? "/owner" : role === "ADMIN" ? "/admin" : "/staff" },
      { label: "Map View" },
    ]
  }

  const threeDMatch = pathname.match(/^\/3d\/(\d+)$/)
  if (threeDMatch) {
    return [
      { label: "Dashboard", href: role === "OWNER" ? "/owner" : role === "ADMIN" ? "/admin" : "/staff" },
      { label: "3D View" },
    ]
  }

  // Handle static routes from config
  const config = BREADCRUMB_CONFIG[pathname]
  if (config) {
    const breadcrumbs: Array<{ label: string; href?: string }> = []
    
    if (config.parent) {
      const parentConfig = BREADCRUMB_CONFIG[config.parent]
      if (parentConfig) {
        breadcrumbs.push({ label: parentConfig.label, href: config.parent })
      }
    }
    
    breadcrumbs.push({ label: config.label })
    return breadcrumbs
  }

  // Fallback for unknown routes
  return [{ label: "Home" }]
}

export function Breadcrumbs() {
  const location = useLocation()
  const { role } = useAuth()
  const breadcrumbs = getBreadcrumbs(location.pathname, role ?? undefined)

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <BreadcrumbLink render={<Link to={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator />
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
