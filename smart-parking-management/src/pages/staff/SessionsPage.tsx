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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import {
  SessionCardGrid,
  SessionCardSkeleton,
} from "@/components/sessions/SessionCard"
import type { ParkingSessionOut, ParkingSessionFinish as FinishSessionPayload } from "@/types"
import type { ListResult } from "@/api/types"

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Finished", value: "FINISHED" },
]

const finishSessionSchema = z.object({
  rate_per_hour: z
    .string()
    .optional()
    .refine((val) => !val || (!Number.isNaN(Number(val)) && Number(val) > 0), "Must be a positive number"),
})
type FinishSessionFormValues = z.infer<typeof finishSessionSchema>

export function StaffSessionsPage() {
  const { setPage, params } = usePaginationState()
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [finishTarget, setFinishTarget] = useState<ParkingSessionOut | null>(null)
  const [data, setData] = useState<ListResult<ParkingSessionOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleFinish = async (id: number, values: FinishSessionFormValues) => {
    try {
      setIsSubmitting(true)
      const payload: FinishSessionPayload = {
        rate_per_hour: values.rate_per_hour ? Number(values.rate_per_hour) : undefined,
      }
      await parkingSessionsApi.finish(id, payload)
      toast.success("Parking session finished.")
      setFinishTarget(null)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
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
      <PageHeader
        title="Parking Sessions"
        description="Monitor and manage active/completed parking sessions booked by customers."
      />

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
          description={isFiltered ? "No sessions match your filter criteria." : "No customer parking sessions found."}
        />
      ) : (
        <SessionCardGrid
          sessions={sessions}
          isFetching={isFetching}
          onFinish={setFinishTarget}
          className="xl:grid-cols-2"
        />
      )}

      <DataPagination meta={data?.meta} onPageChange={setPage} />

      <FinishSessionDialog
        open={Boolean(finishTarget)}
        onOpenChange={(open) => !open && setFinishTarget(null)}
        session={finishTarget}
        onSubmit={(values) => finishTarget && handleFinish(finishTarget.id, values)}
        submitting={isSubmitting}
      />
    </div>
  )
}

function FinishSessionDialog({
  open,
  onOpenChange,
  session,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: ParkingSessionOut | null
  onSubmit: (values: FinishSessionFormValues) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FinishSessionFormValues>({
    resolver: zodResolver(finishSessionSchema),
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finish Session #{session?.id}</DialogTitle>
          <DialogDescription>
            Optionally override the hourly rate used to calculate the parking fee. Leave blank to use the default rate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Hourly rate override" htmlFor="rate_per_hour" error={errors.rate_per_hour?.message}>
            <Input id="rate_per_hour" type="number" step="any" {...register("rate_per_hour")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Finish session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
