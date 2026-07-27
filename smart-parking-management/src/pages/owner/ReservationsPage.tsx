import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { reservationsApi } from "@/api/reservations"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import { reservationStatusTone } from "@/utils/statusColors"
import { formatDateTime } from "@/utils/formatters"
import type { ReservationStatus, ReservationOut } from "@/types"
import type { ListResult } from "@/api/types"

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Completed", value: "COMPLETED" },
]

export function ReservationsPage() {
  const { setPage, params } = usePaginationState()
  const [statusFilter, setStatusFilter] = useState("all")
  const [data, setData] = useState<ListResult<ReservationOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const queryParams = useMemo(() => ({ ...params, status: statusFilter === "all" ? undefined : statusFilter }), [params, statusFilter])

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await reservationsApi.list(queryParams)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch reservations:", error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [queryParams])

  const handleUpdateStatus = async (id: number, status: ReservationStatus) => {
    try {
      setIsUpdating(true)
      await reservationsApi.updateStatus(id, status)
      toast.success("Reservation status updated.")
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  const reservations = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" description="View and manage customer reservations." />
      <p className="-mt-4 text-sm text-muted-foreground">Showing all reservations visible to your role.</p>

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
          ) : reservations.length === 0 ? (
            <EmptyState title="No reservations found" description="Try adjusting your filters." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reservation time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => {
                    const canConfirm = reservation.status === "PENDING"
                    const canCancel = reservation.status === "PENDING" || reservation.status === "CONFIRMED"
                    const canComplete = reservation.status === "CONFIRMED"
                    const hasActions = canConfirm || canCancel || canComplete

                    return (
                      <TableRow key={reservation.id} className={isFetching ? "opacity-60" : undefined}>
                        <TableCell className="font-medium">#{reservation.id}</TableCell>
                        <TableCell>{reservation.slot_id}</TableCell>
                        <TableCell>{reservation.customer_id}</TableCell>
                        <TableCell>{formatDateTime(reservation.reservation_time)}</TableCell>
                        <TableCell>
                          <StatusBadge label={reservation.status} tone={reservationStatusTone(reservation.status)} />
                        </TableCell>
                        <TableCell>
                          {hasActions ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canConfirm ? (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(reservation.id, "CONFIRMED")}
                                    disabled={isUpdating}
                                  >
                                    Confirm
                                  </DropdownMenuItem>
                                ) : null}
                                {canComplete ? (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(reservation.id, "COMPLETED")}
                                    disabled={isUpdating}
                                  >
                                    Mark completed
                                  </DropdownMenuItem>
                                ) : null}
                                {canCancel ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => handleUpdateStatus(reservation.id, "CANCELLED")}
                                    disabled={isUpdating}
                                  >
                                    Cancel
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <DataPagination meta={data?.meta} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
