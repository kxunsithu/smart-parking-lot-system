import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Box } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { slotStatusTone } from "@/utils/statusColors"
import type { ParkingFloorOut, ParkingLotOut, ParkingSlotOut } from "@/types"
import type { ListResult } from "@/api/types"

export function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>()
  const navigate = useNavigate()
  const id = Number(lotId)
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floorsData, setFloorsData] = useState<ListResult<ParkingFloorOut> | null>(null)
  const [isLoadingLot, setIsLoadingLot] = useState(true)
  const [isLoadingFloors, setIsLoadingFloors] = useState(true)

  const fetchLot = async () => {
    if (!Number.isFinite(id)) return
    try {
      const result = await parkingLotsApi.get(id)
      setLot(result)
    } catch (error) {
      console.error("Failed to fetch lot:", error)
    } finally {
      setIsLoadingLot(false)
    }
  }

  const fetchFloors = async () => {
    if (!Number.isFinite(id)) return
    try {
      const result = await parkingFloorsApi.list({ parking_lot_id: id, limit: 100 })
      setFloorsData(result)
    } catch (error) {
      console.error("Failed to fetch floors:", error)
    } finally {
      setIsLoadingFloors(false)
    }
  }

  useEffect(() => {
    fetchLot()
    fetchFloors()
  }, [id])

  const floors = floorsData?.items ?? []

  if (isLoadingLot) return <LoadingSpinner label="Loading parking lot..." />
  if (!lot) return <EmptyState title="Parking lot not found" description="This parking lot may have been removed." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={lot.name}
        description="Parking lot details (view only)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/3d/${lot.id}`)}>
              <Box className="size-4 mr-2" />
              3D View
            </Button>
            {lot.google_map_url && (
              <Button variant="outline" onClick={() => navigate(`/map/${lot.id}`)}>
                View on Map
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-sm font-medium">{lot.is_active ? "Active" : "Inactive"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="mt-1 text-sm font-medium">{new Date(lot.created_at).toLocaleDateString()}</p>
          </div>
          {lot.owner && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Owner Company</p>
                <p className="mt-1 text-sm font-medium">{lot.owner.company_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owner Email</p>
                <p className="mt-1 text-sm font-medium">{lot.owner.user?.email || "-"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold tracking-tight">Floors</h2>

      {isLoadingFloors ? (
        <LoadingSpinner label="Loading floors..." />
      ) : floors.length === 0 ? (
        <EmptyState
          title="No floors yet"
          description="This parking lot has no floors configured."
        />
      ) : (
        <div className="space-y-4">
          {floors.map((floor) => (
            <FloorSection key={floor.id} floor={floor} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

function FloorSection({
  floor,
  navigate,
}: {
  floor: ParkingFloorOut
  navigate: (path: string) => void
}) {
  const [slotsData, setSlotsData] = useState<ListResult<ParkingSlotOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSlots = async () => {
    try {
      const result = await parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
      setSlotsData(result)
    } catch (error) {
      console.error("Failed to fetch slots:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [floor.id])

  const slots = slotsData?.items ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{floor.floor_name || `Floor ${floor.id}`}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner label="Loading slots..." />
        ) : slots.length === 0 ? (
          <EmptyState
            title="No slots yet"
            description="This floor has no parking slots configured."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => (
              <Card key={slot.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{slot.slot_number}</p>
                      {slot.section ? <p className="text-xs text-muted-foreground">{slot.section}</p> : null}
                    </div>
                  </div>
                  <StatusBadge label={slot.status} tone={slotStatusTone(slot.status)} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/slots/${slot.id}`)}
                  >
                    View details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
