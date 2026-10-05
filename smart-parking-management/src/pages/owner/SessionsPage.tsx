import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Loader2, Filter, RotateCcw, Search } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { FormField } from "@/components/common/FormField"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import {
  SessionCardGrid,
  SessionCardSkeleton,
} from "@/components/sessions/SessionCard"
import { UserDetailModal, type UserDetailTarget } from "@/components/common/UserDetailModal"
import type { ParkingSessionOut } from "@/types"
import type { ListResult } from "@/api/types"

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Finished", value: "FINISHED" },
]

export function OwnerSessionsPage() {
  const { setPage, params } = usePaginationState()
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [finishTarget, setFinishTarget] = useState<ParkingSessionOut | null>(null)
  const [viewCustomerTarget, setViewCustomerTarget] = useState<UserDetailTarget | null>(null)
  const [data, setData] = useState<ListResult<ParkingSessionOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  const queryParams = useMemo(
    () => ({
      ...params,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [params, statusFilter]
  )

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await parkingSessionsApi.list(queryParams)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [queryParams])

  const handleFinish = async (id: number) => {
    try {
      setIsFinishing(true)
      await parkingSessionsApi.finish(id)
      toast.success("Session finished.")
      setFinishTarget(null)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsFinishing(false)
    }
  }

  const rawSessions = data?.items ?? []

  // Client-side text search filter for plate number or customer name
  const sessions = useMemo(() => {
    if (!searchQuery.trim()) return rawSessions
    const q = searchQuery.trim().toLowerCase()
    return rawSessions.filter(
      (s) =>
        (s.car?.plate_number ?? "").toLowerCase().includes(q) ||
        (s.customer?.name ?? "").toLowerCase().includes(q)
    )
  }, [rawSessions, searchQuery])

  const isFiltered =
    statusFilter !== "all" || searchQuery.trim() !== ""

  const handleReset = () => {
    setStatusFilter("all")
    setSearchQuery("")
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Parking Sessions" description="Monitor active and completed parking sessions." />

      {/* Filter Controls Bar */}
      <Card className="border border-border/80 shadow-sm rounded">
        <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:justify-between flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider shrink-0">
            <Filter className="size-4 text-primary" />
            <span>Filter Sessions:</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
            {/* General Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search plate or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded"
              />
            </div>

            {/* Status Filter */}
            <div className="min-w-[140px]">
              <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)} items={STATUS_FILTER_OPTIONS}>
                <SelectTrigger className="h-9 text-xs rounded">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded shrink-0"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <SessionCardSkeleton />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No sessions found"
          description={isFiltered ? "No sessions match your filter criteria." : "No parking sessions found."}
        />
      ) : (
        <SessionCardGrid
          sessions={sessions}
          isFetching={isFetching}
          onFinish={setFinishTarget}
          onViewCustomer={(cust) =>
            setViewCustomerTarget({
              type: "customer",
              user: {
                id: cust.id,
                name: cust.name,
                email: cust.email,
                phone: cust.phone,
                role_id: 4,
                is_active: true,
                is_verified: true,
                created_at: new Date().toISOString(),
              },
            })
          }
        />
      )}

      <DataPagination meta={data?.meta} onPageChange={setPage} />

      <UserDetailModal
        open={Boolean(viewCustomerTarget)}
        onOpenChange={(open) => !open && setViewCustomerTarget(null)}
        target={viewCustomerTarget}
      />

      <ConfirmDialog
        open={Boolean(finishTarget)}
        onOpenChange={(open) => !open && setFinishTarget(null)}
        title={`Finish session #${finishTarget?.id}?`}
        description="Are you sure you want to finish this parking session? The parking slot will be freed up and marked as available."
        confirmLabel="Finish session"
        loading={isFinishing}
        onConfirm={() => finishTarget && handleFinish(finishTarget.id)}
      />
    </div>
  )
}
