import { useState, useEffect } from "react"
import { CalendarCheck, CreditCard, Crown, ParkingSquare, Timer, UserCog, Warehouse } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { PageHeader } from "@/components/common/PageHeader"
import { StatCard } from "@/components/common/StatCard"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { dashboardApi } from "@/api/dashboard"
import { subscriptionApi } from "@/api/subscription"
import type { OwnerDashboardOut } from "@/types"
import { formatCurrency } from "@/utils/formatters"
import { Link } from "react-router-dom"

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)"]

export function OwnerDashboardPage() {
  const [data, setData] = useState<OwnerDashboardOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{ has_subscription: boolean; status: string; message: string } | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardData, subStatus] = await Promise.all([
          dashboardApi.owner(),
          subscriptionApi.getMySubscriptionStatus(),
        ])
        setData(dashboardData)
        setSubscriptionStatus(subStatus)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const slotData = data
    ? [
        { name: "Available", value: data.available_slots },
        { name: "Occupied", value: data.occupied_slots },
        { name: "Reserved", value: data.reserved_slots },
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader title="Owner Dashboard" description="An overview of your parking lots and operations." />

      {subscriptionStatus && !subscriptionStatus.has_subscription && (
        <Alert variant="destructive">
          <Crown className="size-4" />
          <AlertTitle>No Active Subscription</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{subscriptionStatus.message}. Parking lots and staff management are disabled.</span>
            <Button asChild variant="outline" size="sm" className="ml-4">
              <Link to="/owner/subscription">Purchase Plan</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading || !data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Parking Lots" value={data.total_parking_lots} icon={Warehouse} />
          <StatCard label="Floors" value={data.total_floors} icon={ParkingSquare} />
          <StatCard label="Total Slots" value={data.total_slots} icon={ParkingSquare} />
          <StatCard label="Staff" value={data.total_staff} icon={UserCog} />
          <StatCard label="Total Reservations" value={data.total_reservations} icon={CalendarCheck} />
          <StatCard label="Active Sessions" value={data.active_sessions} icon={Timer} />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(data.total_revenue)}
            icon={CreditCard}
            className="sm:col-span-2"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Slot status breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slotData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {slotData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Available slots</span>
              <span className="font-medium">{data?.available_slots ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Occupied slots</span>
              <span className="font-medium">{data?.occupied_slots ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reserved slots</span>
              <span className="font-medium">{data?.reserved_slots ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active sessions</span>
              <span className="font-medium">{data?.active_sessions ?? "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
