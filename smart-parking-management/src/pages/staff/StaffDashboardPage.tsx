import { useState, useEffect } from "react"
import { Car, CheckCircle2, Timer } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { PageHeader } from "@/components/common/PageHeader"
import { StatCard } from "@/components/common/StatCard"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StaffDashboardOut } from "@/types"
import { dashboardApi } from "@/api/dashboard"

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)"]

export function StaffDashboardPage() {
  const [data, setData] = useState<StaffDashboardOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await dashboardApi.staff()
        setData(result)
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
      ]
    : []

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Dashboard" description="Overview of your assigned parking lot." />

      {isLoading || !data ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Available Slots" value={data.available_slots} icon={CheckCircle2} />
          <StatCard label="Occupied Slots" value={data.occupied_slots} icon={Car} />
          <StatCard label="Active Sessions" value={data.active_sessions} icon={Timer} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Slot status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {data ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slotData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
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
    </div>
  )
}
