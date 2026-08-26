import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import { StaffNavbar } from "@/components/layout/StaffNavbar"
import { Breadcrumbs } from "@/components/common/Breadcrumbs"
import { useAuth } from "@/hooks/useAuth"

export function DashboardLayout() {
  const { role } = useAuth()

  if (!role) return null

  // Staff uses top Navigation Bar layout without sidebar
  if (role === "STAFF") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <StaffNavbar />
        <main className="flex-1 py-6">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-4 sm:px-6">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    )
  }

  // Admin & Owner use Sidebar + Header layout
  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <div className="hidden lg:block">
        <AppSidebar role={role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader role={role} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
