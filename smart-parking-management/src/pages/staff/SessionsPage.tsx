import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FormField } from "@/components/common/FormField"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import { sessionStatusTone } from "@/utils/statusColors"
import { formatCurrency, formatDateTime, formatDuration } from "@/utils/formatters"
import { SessionPaymentModal } from "@/components/sessions/SessionPaymentModal"
import type { ParkingSessionOut, ParkingSessionStart as StartSessionPayload, ParkingSessionFinish as FinishSessionPayload } from "@/types"
import type { ListResult } from "@/api/types"

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Finished", value: "FINISHED" },
]

const startSessionSchema = z.object({
  vehicle_id: z.string().min(1, "Vehicle ID is required"),
  slot_id: z.string().min(1, "Slot ID is required"),
})
type StartSessionFormValues = z.infer<typeof startSessionSchema>

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
  const [finishTarget, setFinishTarget] = useState<ParkingSessionOut | null>(null)
  const [payTarget, setPayTarget] = useState<ParkingSessionOut | null>(null)
  const [isStartOpen, setIsStartOpen] = useState(false)
  const [data, setData] = useState<ListResult<ParkingSessionOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const queryParams = useMemo(() => ({ ...params, status: statusFilter === "all" ? undefined : statusFilter }), [params, statusFilter])

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

  const handleStart = async (values: StartSessionFormValues) => {
    try {
      setIsSubmitting(true)
      const payload: StartSessionPayload = {
        vehicle_id: Number(values.vehicle_id),
        slot_id: Number(values.slot_id),
      }
      await parkingSessionsApi.start(payload)
      toast.success("Parking session started.")
      setIsStartOpen(false)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const sessions = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Sessions"
        description="Monitor and manage active/completed parking sessions."
        actions={
          <Button onClick={() => setIsStartOpen(true)}>
            <Plus className="mr-2 size-4" /> Start session
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading ? (
            <TableSkeleton />
          ) : sessions.length === 0 ? (
            <EmptyState title="No sessions found" description="Try adjusting your filters or start a new session." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Vehicle ID</TableHead>
                    <TableHead>Slot ID</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">#{session.id}</TableCell>
                      <TableCell>{session.vehicle_id}</TableCell>
                      <TableCell>{session.slot_id}</TableCell>
                      <TableCell>{formatDateTime(session.start_time)}</TableCell>
                      <TableCell>{session.end_time ? formatDateTime(session.end_time) : "—"}</TableCell>
                      <TableCell>{session.duration ? formatDuration(session.duration) : "—"}</TableCell>
                      <TableCell>{session.fee != null ? formatCurrency(session.fee) : "—"}</TableCell>
                      <TableCell>
                        <StatusBadge label={session.status} tone={sessionStatusTone(session.status)} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {session.status === "ACTIVE" && (
                              <DropdownMenuItem onClick={() => setFinishTarget(session)}>
                                Finish session
                              </DropdownMenuItem>
                            )}
                            {session.status === "FINISHED" && session.fee != null && (
                              <DropdownMenuItem onClick={() => setPayTarget(session)}>
                                Collect fee
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DataPagination meta={data?.meta} onPageChange={setPage} />
        </CardContent>
      </Card>

      <StartSessionDialog
        open={isStartOpen}
        onOpenChange={setIsStartOpen}
        onSubmit={handleStart}
        submitting={isSubmitting}
      />

      <FinishSessionDialog
        open={Boolean(finishTarget)}
        onOpenChange={(open) => !open && setFinishTarget(null)}
        session={finishTarget}
        onSubmit={(values) => finishTarget && handleFinish(finishTarget.id, values)}
        submitting={isSubmitting}
      />

      <SessionPaymentModal
        open={Boolean(payTarget)}
        onOpenChange={(open) => !open && setPayTarget(null)}
        session={payTarget}
        onSuccess={fetchData}
      />
    </div>
  )
}

function StartSessionDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: StartSessionFormValues) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StartSessionFormValues>({
    resolver: zodResolver(startSessionSchema),
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Parking Session</DialogTitle>
          <DialogDescription>
            Enter the vehicle ID and assigned slot ID to begin a parking session.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Vehicle ID" htmlFor="vehicle_id" error={errors.vehicle_id?.message}>
            <Input id="vehicle_id" type="number" placeholder="e.g. 1" {...register("vehicle_id")} />
          </FormField>
          <FormField label="Slot ID" htmlFor="slot_id" error={errors.slot_id?.message}>
            <Input id="slot_id" type="number" placeholder="e.g. 5" {...register("slot_id")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Start session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
