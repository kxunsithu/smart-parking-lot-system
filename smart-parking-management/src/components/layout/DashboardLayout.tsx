import { Outlet } from "react-router-dom"
import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import { useAuth } from "@/hooks/useAuth"
import { subscriptionApi } from "@/api/subscription"

export function DashboardLayout() {
  const { role } = useAuth()
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)

  useEffect(() => {
    if (role === "OWNER") {
      subscriptionApi.getMySubscriptionStatus()
        .then(status => setHasSubscription(status.has_subscription))
        .catch(() => setHasSubscription(false))
    } else {
      setHasSubscription(true) // Non-owners always have access
    }
  }, [role])

  if (!role) return null

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <div className="hidden lg:block">
        <AppSidebar role={role} hasSubscription={hasSubscription ?? false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader role={role} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
