import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Building2, CreditCard, ParkingSquare, UserCog, Users, Car, Receipt } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { PageHeader } from "@/components/common/PageHeader"
import { StatCard } from "@/components/common/StatCard"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminDashboardOut } from "@/types"
import { dashboardApi } from "@/api/dashboard"
import { formatCurrency } from "@/utils/formatters"
import { getErrorMessage } from "@/api/client"

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"]
const REVENUE_COLORS = ["var(--color-chart-1)", "var(--color-chart-3)"]

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await dashboardApi.admin()
        setData(result)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        toast.error(getErrorMessage(error))
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const peopleData = data
    ? [
        { name: "Owners", value: data.total_owners },
        { name: "Staff", value: data.total_staff },
        { name: "Customers", value: data.total_customers },
      ]
    : []

  const revenueData = data
    ? [
        { name: "Parking Sessions", value: data.session_revenue },
        { name: "Subscriptions", value: data.subscription_revenue },
      ]
    : []

  if (error) return <div className="text-center py-10 text-destructive">Failed to load dashboard data. Please try again.</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="System-wide overview of the parking network." />

      {isLoading || !data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Parking Owners" value={data.total_owners} icon={Building2} />
          <StatCard label="Parking Staff" value={data.total_staff} icon={UserCog} />
          <StatCard label="Customers" value={data.total_customers} icon={Users} />
          <StatCard label="Parking Lots" value={data.total_parking_lots} icon={ParkingSquare} />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(data.total_revenue)}
            icon={CreditCard}
            className="sm:col-span-2"
          />
          <StatCard
            label="Session Revenue"
            value={formatCurrency(data.session_revenue)}
            icon={Car}
          />
          <StatCard
            label="Subscription Revenue"
            value={formatCurrency(data.subscription_revenue)}
            icon={Receipt}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>People overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={peopleData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {peopleData.map((_, index) => (
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
            <CardTitle>Revenue breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data && (data.session_revenue > 0 || data.subscription_revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {revenueData.map((_, index) => (
                      <Cell key={index} fill={REVENUE_COLORS[index % REVENUE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <p className="text-sm">No revenue recorded yet.</p>
                <p className="text-3xl font-bold text-foreground">{data ? formatCurrency(data.total_revenue) : "-"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
