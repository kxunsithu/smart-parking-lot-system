import { useState, useEffect } from "react"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
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
import { reservationStatusTone } from "@/utils/statusColors"
import { formatDateTime } from "@/utils/formatters"
import type { ReservationOut, ReservationStatus } from "@/types"
import type { ListResult } from "@/api/types"

const STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Completed", value: "COMPLETED" },
]

export function ReservationsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [cancelTarget, setCancelTarget] = useState<ReservationOut | null>(null)
  const [data, setData] = useState<ListResult<ReservationOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const params = {
    page,
    limit: 10,
    status: statusFilter === "all" ? undefined : statusFilter,
  }

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await reservationsApi.list(params)
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
  }, [params])

  const handleUpdateStatus = async (id: number, status: ReservationStatus) => {
    try {
      setIsUpdating(true)
      await reservationsApi.updateStatus(id, status)
      toast.success("Reservation status updated.")
      setCancelTarget(null)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  function handleStatusFilterChange(value: string | null) {
    setStatusFilter(value ?? "all")
    setPage(1)
  }

  const reservations = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Reservations" description="Review and manage customer reservations." />
      <p className="-mt-4 text-sm text-muted-foreground">Showing all reservations visible to your role.</p>

      <Card>
        <CardContent className="space-y-4">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
                    <TableHead>Reservation Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">#{reservation.id}</TableCell>
                      <TableCell>{reservation.slot_id}</TableCell>
                      <TableCell>{reservation.customer_id}</TableCell>
                      <TableCell>{formatDateTime(reservation.reservation_time)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={reservation.status}
                          tone={reservationStatusTone(reservation.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {reservation.status === "PENDING" ? (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(reservation.id, "CONFIRMED")}
                                disabled={isUpdating}
                              >
                                Confirm
                              </DropdownMenuItem>
                            ) : null}
                            {reservation.status === "CONFIRMED" ? (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(reservation.id, "COMPLETED")}
                                disabled={isUpdating}
                              >
                                Mark completed
                              </DropdownMenuItem>
                            ) : null}
                            {reservation.status === "PENDING" || reservation.status === "CONFIRMED" ? (
                              <DropdownMenuItem variant="destructive" onClick={() => setCancelTarget(reservation)}>
                                Cancel
                              </DropdownMenuItem>
                            ) : null}
                            {reservation.status === "CANCELLED" || reservation.status === "COMPLETED" ? (
                              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                            ) : null}
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

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel reservation?"
        description={`This will cancel reservation #${cancelTarget?.id}. This action cannot be undone.`}
        confirmLabel="Cancel reservation"
        destructive
        loading={isUpdating}
        onConfirm={() => cancelTarget && handleUpdateStatus(cancelTarget.id, "CANCELLED")}
      />
    </div>
  )
}
