import { useMemo, useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Search } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FormField } from "@/components/common/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { dashboardApi } from "@/api/dashboard"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { vehiclesApi } from "@/api/vehicles"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { getErrorMessage } from "@/api/client"
import { useDebounce } from "@/hooks/useDebounce"
import { sessionStatusTone } from "@/utils/statusColors"
import { formatCurrency, formatDateTime, formatDuration } from "@/utils/formatters"
import type { ParkingSessionOut, VehicleOut, StaffDashboardOut, ParkingFloorOut, ParkingSlotOut } from "@/types"
import type { ListResult } from "@/api/types"

const STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "ACTIVE" },
  { label: "Finished", value: "FINISHED" },
]

export function SessionsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [startOpen, setStartOpen] = useState(false)
  const [finishTarget, setFinishTarget] = useState<ParkingSessionOut | null>(null)
  const [data, setData] = useState<ListResult<ParkingSessionOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const params = {
    page,
    limit: 10,
    status: statusFilter === "all" ? undefined : statusFilter,
  }

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await parkingSessionsApi.list(params)
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
  }, [params])

  const sessions = data?.items ?? []

  function handleStatusFilterChange(value: string | null) {
    setStatusFilter(value ?? "all")
    setPage(1)
  }

  const handleRefresh = () => {
    fetchData()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="Check vehicles in and out of parking slots."
        actions={
          <Button onClick={() => setStartOpen(true)}>
            <Plus className="size-4" />
            Start Session
          </Button>
        }
      />
      <p className="-mt-4 text-sm text-muted-foreground">Showing all sessions visible to your role.</p>

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
          ) : sessions.length === 0 ? (
            <EmptyState
              title="No sessions found"
              description="Start a session to check a vehicle into a slot."
              action={
                <Button size="sm" onClick={() => setStartOpen(true)}>
                  <Plus className="size-4" />
                  Start Session
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">#{session.id}</TableCell>
                      <TableCell>{session.vehicle_id}</TableCell>
                      <TableCell>{session.slot_id}</TableCell>
                      <TableCell>{formatDateTime(session.entry_time)}</TableCell>
                      <TableCell>{formatDateTime(session.exit_time)}</TableCell>
                      <TableCell>{formatDuration(session.duration)}</TableCell>
                      <TableCell>{formatCurrency(session.fee)}</TableCell>
                      <TableCell>
                        <StatusBadge label={session.status} tone={sessionStatusTone(session.status)} />
                      </TableCell>
                      <TableCell>
                        {session.status === "ACTIVE" ? (
                          <Button size="sm" variant="outline" onClick={() => setFinishTarget(session)}>
                            Finish
                          </Button>
                        ) : null}
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
        open={startOpen}
        onOpenChange={setStartOpen}
        onSuccess={() => {
          setStartOpen(false)
          handleRefresh()
        }}
      />

      <FinishSessionDialog
        session={finishTarget}
        onOpenChange={(open) => !open && setFinishTarget(null)}
        onSuccess={() => {
          setFinishTarget(null)
          handleRefresh()
        }}
      />
    </div>
  )
}

function StartSessionDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [vehicleQuery, setVehicleQuery] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOut | null>(null)
  const [slotId, setSlotId] = useState("")
  const [reservationId, setReservationId] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(vehicleQuery, 400)

  const [dashboard, setDashboard] = useState<StaffDashboardOut | null>(null)
  const [vehicleResults, setVehicleResults] = useState<ListResult<VehicleOut> | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [floorsData, setFloorsData] = useState<ListResult<ParkingFloorOut> | null>(null)
  const [slotData, setSlotData] = useState<ListResult<ParkingSlotOut>[]>([])

  const fetchDashboard = async () => {
    try {
      const result = await dashboardApi.staff()
      setDashboard(result)
    } catch (error) {
      console.error("Failed to fetch dashboard:", error)
    }
  }

  const fetchVehicles = async () => {
    if (!open || debouncedQuery.trim().length <= 1 || selectedVehicle) return
    try {
      setIsSearching(true)
      const result = await vehiclesApi.list({ search: debouncedQuery, limit: 5 })
      setVehicleResults(result)
    } catch (error) {
      console.error("Failed to search vehicles:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const fetchFloors = async () => {
    if (!open || !dashboard?.parking_lot_id) return
    try {
      const result = await parkingFloorsApi.list({ parking_lot_id: dashboard.parking_lot_id })
      setFloorsData(result)
    } catch (error) {
      console.error("Failed to fetch floors:", error)
    }
  }

  const fetchSlots = async () => {
    if (!open || !dashboard?.parking_lot_id || !floorsData?.items) return
    try {
      const slotPromises = floorsData.items.map((floor) => 
        parkingSlotsApi.list({ floor_id: floor.id })
      )
      const results = await Promise.all(slotPromises)
      setSlotData(results)
    } catch (error) {
      console.error("Failed to fetch slots:", error)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  useEffect(() => {
    fetchVehicles()
  }, [debouncedQuery, open, selectedVehicle])

  useEffect(() => {
    fetchFloors()
  }, [open, dashboard?.parking_lot_id])

  useEffect(() => {
    fetchSlots()
  }, [open, dashboard?.parking_lot_id, floorsData])

  const floors = floorsData?.items ?? []

  const availableSlots = useMemo(() => {
    const result: { id: number; label: string }[] = []
    floors.forEach((floor, index) => {
      const slots = slotData[index]?.items ?? []
      slots
        .filter((slot) => slot.status === "AVAILABLE")
        .forEach((slot) => {
          result.push({
            id: slot.id,
            label: `${floor.floor_name || `Floor ${floor.id}`} - Slot ${slot.slot_number}${
              slot.section ? ` (${slot.section})` : ""
            }`,
          })
        })
    })
    return result
  }, [floors, slotData])

  const [isStarting, setIsStarting] = useState(false)

  const handleStart = async (payload: any) => {
    try {
      setIsStarting(true)
      await parkingSessionsApi.start(payload)
      toast.success("Session started.")
      resetForm()
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsStarting(false)
    }
  }

  function resetForm() {
    setVehicleQuery("")
    setSelectedVehicle(null)
    setSlotId("")
    setReservationId("")
    setFormError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm()
    onOpenChange(next)
  }

  function handleSubmit() {
    setFormError(null)
    if (!selectedVehicle) {
      setFormError("Select a vehicle to check in.")
      return
    }
    if (!slotId) {
      setFormError("Select an available slot.")
      return
    }
    let reservationIdNumber: number | undefined
    if (reservationId.trim()) {
      const parsed = Number(reservationId)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setFormError("Reservation ID must be a valid positive number.")
        return
      }
      reservationIdNumber = parsed
    }
    handleStart({
      vehicle_id: selectedVehicle.id,
      slot_id: Number(slotId),
      reservation_id: reservationIdNumber,
    })
  }

  const vehicles = vehicleResults?.items ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a parking session</DialogTitle>
          <DialogDescription>
            Search for the vehicle by plate number, then pick an available slot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="Vehicle"
            required
            hint={selectedVehicle ? undefined : "Search by plate number or brand."}
          >
            {selectedVehicle ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{selectedVehicle.plate_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {[selectedVehicle.brand, selectedVehicle.color].filter(Boolean).join(" - ") || "No details"}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedVehicle(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={vehicleQuery}
                    onChange={(e) => setVehicleQuery(e.target.value)}
                    placeholder="Search by plate number..."
                    className="pl-9"
                  />
                </div>
                {debouncedQuery.trim().length > 1 ? (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                    {isSearching ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
                    ) : vehicles.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No vehicles found.</p>
                    ) : (
                      <ul className="max-h-48 overflow-y-auto py-1">
                        {vehicles.map((vehicle) => (
                          <li key={vehicle.id}>
                            <button
                              type="button"
                              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                setSelectedVehicle(vehicle)
                                setVehicleQuery("")
                              }}
                            >
                              <span className="font-medium">{vehicle.plate_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {[vehicle.brand, vehicle.color].filter(Boolean).join(" - ") || "No details"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </FormField>

          <FormField
            label="Slot"
            htmlFor="slot"
            required
            hint={availableSlots.length === 0 ? "No available slots right now." : undefined}
          >
            <Select
              value={slotId}
              onValueChange={(value) => setSlotId(value ?? "")}
              disabled={availableSlots.length === 0}
            >
              <SelectTrigger id="slot" className="w-full">
                <SelectValue placeholder="Select an available slot" />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.id} value={String(slot.id)}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Reservation ID (optional)"
            htmlFor="reservation_id"
            hint="If this session fulfills an existing reservation."
          >
            <Input
              id="reservation_id"
              type="number"
              min={1}
              value={reservationId}
              onChange={(e) => setReservationId(e.target.value)}
            />
          </FormField>

          {formError ? <p className="text-xs font-medium text-destructive">{formError}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isStarting}>
            {isStarting ? <Loader2 className="size-4 animate-spin" /> : null}
            Start session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FinishSessionDialog({
  session,
  onOpenChange,
  onSuccess,
}: {
  session: ParkingSessionOut | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [rate, setRate] = useState("")

  const [isFinishing, setIsFinishing] = useState(false)

  const handleFinish = async (id: number) => {
    try {
      setIsFinishing(true)
      const rateValue = rate.trim() ? Number(rate) : undefined
      await parkingSessionsApi.finish(id, rateValue !== undefined ? { rate_per_hour: rateValue } : {})
      toast.success("Session finished.")
      setRate("")
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsFinishing(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setRate("")
    onOpenChange(next)
  }

  return (
    <Dialog open={Boolean(session)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Finish session #{session?.id}</DialogTitle>
          <DialogDescription>
            Check the vehicle out of slot {session?.slot_id}. Optionally override the hourly rate used for the
            fee.
          </DialogDescription>
        </DialogHeader>

        <FormField
          label="Hourly rate override (optional)"
          htmlFor="rate_per_hour"
          hint="Leave blank to use the default rate."
        >
          <Input
            id="rate_per_hour"
            type="number"
            min={0}
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => session && handleFinish(session.id)}
            disabled={isFinishing}
          >
            {isFinishing ? <Loader2 className="size-4 animate-spin" /> : null}
            Finish session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
