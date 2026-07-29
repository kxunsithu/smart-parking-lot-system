import { useState, useEffect } from "react"
import { toast } from "sonner"
import { ParkingSquare } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { EmptyState } from "@/components/common/EmptyState"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/api/dashboard"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { getErrorMessage } from "@/api/client"
import { slotStatusTone } from "@/utils/statusColors"
import type { ParkingSlotOut, SlotStatus, StaffDashboardOut, ParkingFloorOut } from "@/types"
import type { ListResult } from "@/api/types"

const SLOT_STATUS_OPTIONS: SlotStatus[] = ["AVAILABLE", "OCCUPIED"]

export function SlotsBoardPage() {
  const [dashboard, setDashboard] = useState<StaffDashboardOut | null>(null)
  const [floorsData, setFloorsData] = useState<ListResult<ParkingFloorOut> | null>(null)
  const [slotData, setSlotData] = useState<ListResult<ParkingSlotOut>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchDashboard = async () => {
    try {
      const result = await dashboardApi.staff()
      setDashboard(result)
    } catch (error) {
      console.error("Failed to fetch dashboard:", error)
    }
  }

  const fetchFloors = async () => {
    if (!dashboard?.parking_lot_id) return
    try {
      const result = await parkingFloorsApi.list({ parking_lot_id: dashboard.parking_lot_id })
      setFloorsData(result)
    } catch (error) {
      console.error("Failed to fetch floors:", error)
    }
  }

  const fetchSlots = async () => {
    if (!dashboard?.parking_lot_id || !floorsData?.items) return
    try {
      const slotPromises = floorsData.items.map((floor) => 
        parkingSlotsApi.list({ floor_id: floor.id })
      )
      const results = await Promise.all(slotPromises)
      setSlotData(results)
    } catch (error) {
      console.error("Failed to fetch slots:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: SlotStatus) => {
    try {
      setIsUpdating(true)
      await parkingSlotsApi.updateStatus(id, status)
      toast.success("Slot status updated.")
      fetchSlots()
      fetchDashboard()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  useEffect(() => {
    fetchFloors()
  }, [dashboard?.parking_lot_id])

  useEffect(() => {
    fetchSlots()
  }, [dashboard?.parking_lot_id, floorsData])

  const floors = floorsData?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Slots Board"
        description="Check slot availability and update slot status in real time."
      />

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : floors.length === 0 ? (
        <EmptyState
          title="No floors found"
          description="Your parking lot doesn't have any floors set up yet."
          icon={ParkingSquare}
        />
      ) : (
        <div className="space-y-8">
          {floors.map((floor, index) => {
            const slots = slotData[index]?.items ?? []
            return (
              <div key={floor.id} className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {floor.floor_name || `Floor ${floor.id}`}
                </h2>
                {slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slots on this floor.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {slots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        updating={isUpdating}
                        onStatusChange={(status) => handleUpdateStatus(slot.id, status)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SlotCard({
  slot,
  onStatusChange,
  updating,
}: {
  slot: ParkingSlotOut
  onStatusChange: (status: SlotStatus) => void
  updating: boolean
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">Slot {slot.slot_number}</p>
            <p className="truncate text-xs text-muted-foreground">{slot.section || "No section"}</p>
          </div>
          <StatusBadge label={slot.status} tone={slotStatusTone(slot.status)} />
        </div>
        <Select
          value={slot.status}
          onValueChange={(value) => onStatusChange(value as SlotStatus)}
          disabled={updating}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLOT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}
