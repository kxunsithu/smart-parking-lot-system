import { useState, useEffect } from "react"
import { Building2, CreditCard, ParkingSquare, UserCog, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/common/PageHeader"
import { StatCard } from "@/components/common/StatCard"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminDashboardOut } from "@/types"
import { dashboardApi } from "@/api/dashboard"
import { formatCurrency } from "@/utils/formatters"

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"]

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await dashboardApi.admin()
        setData(result)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
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

  const overviewData = data
    ? [
        { name: "Lots", value: data.total_parking_lots },
      ]
    : []

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
            <CardTitle>Network overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
