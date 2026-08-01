import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, Box, Edit, Trash2, Filter, RotateCcw, Search, Layers, MapPin } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { getErrorMessage } from "@/api/client"
import type {
  ParkingFloorOut,
  ParkingLotOut,
  ParkingSlotOut,
  SlotStatus,
  ParkingLotUpdate as UpdateLotPayload,
  ParkingFloorCreate as CreateFloorPayload,
  ParkingFloorUpdate as UpdateFloorPayload,
  ParkingSlotCreate as CreateSlotPayload,
  ParkingSlotUpdate as UpdateSlotPayload,
} from "@/types"
import type { ListResult } from "@/api/types"

const numericString = z
  .string()
  .optional()
  .refine((val) => !val || !Number.isNaN(Number(val)), "Must be a valid number")

const lotSchema = z.object({
  name: z.string().min(1, "Name is required"),
  google_map_url: z.string().optional(),
  rate_per_hour: z.coerce.number().min(0, "Rate must be positive").optional(),
})
type LotFormValues = z.infer<typeof lotSchema>

function toLotPayload(values: LotFormValues): UpdateLotPayload {
  return {
    name: values.name,
    google_map_url: values.google_map_url || undefined,
    rate_per_hour: values.rate_per_hour != null && !isNaN(values.rate_per_hour) ? values.rate_per_hour : undefined,
  }
}

const floorSchema = z.object({
  floor_name: z.string().min(1, "Floor name is required"),
})
type FloorFormValues = z.infer<typeof floorSchema>

const slotSchema = z.object({
  slot_number: z.string().min(1, "Slot number is required"),
  section: z.string().optional(),
  latitude: numericString,
  longitude: numericString,
})
type SlotFormValues = z.infer<typeof slotSchema>

function toSlotPayload(values: SlotFormValues) {
  return {
    slot_number: values.slot_number,
    section: values.section || undefined,
    latitude: values.latitude ? Number(values.latitude) : undefined,
    longitude: values.longitude ? Number(values.longitude) : undefined,
  }
}

const SLOT_STATUS_OPTIONS: SlotStatus[] = ["AVAILABLE", "OCCUPIED"]

export function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>()
  const navigate = useNavigate()
  const id = Number(lotId)
  const [editLotOpen, setEditLotOpen] = useState(false)
  const [createFloorOpen, setCreateFloorOpen] = useState(false)
  const [editFloorTarget, setEditFloorTarget] = useState<ParkingFloorOut | null>(null)
  const [deleteFloorTarget, setDeleteFloorTarget] = useState<ParkingFloorOut | null>(null)
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floorsData, setFloorsData] = useState<ListResult<ParkingFloorOut> | null>(null)
  const [isLoadingLot, setIsLoadingLot] = useState(true)
  const [isLoadingFloors, setIsLoadingFloors] = useState(true)
  const [isUpdatingLot, setIsUpdatingLot] = useState(false)
  const [isCreatingFloor, setIsCreatingFloor] = useState(false)
  const [isUpdatingFloor, setIsUpdatingFloor] = useState(false)
  const [isDeletingFloor, setIsDeletingFloor] = useState(false)

  // Filter States
  const [selectedFloorId, setSelectedFloorId] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [slotSearchQuery, setSlotSearchQuery] = useState<string>("")
  const [lotSections, setLotSections] = useState<string[]>([])

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

  const handleUpdateLot = async (payload: UpdateLotPayload) => {
    try {
      setIsUpdatingLot(true)
      await parkingLotsApi.update(id, payload)
      toast.success("Parking lot updated.")
      setEditLotOpen(false)
      fetchLot()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdatingLot(false)
    }
  }

  const handleCreateFloor = async (payload: CreateFloorPayload) => {
    try {
      setIsCreatingFloor(true)
      await parkingFloorsApi.create(payload)
      toast.success("Floor created.")
      setCreateFloorOpen(false)
      fetchFloors()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsCreatingFloor(false)
    }
  }

  const handleUpdateFloor = async (floorId: number, payload: UpdateFloorPayload) => {
    try {
      setIsUpdatingFloor(true)
      await parkingFloorsApi.update(floorId, payload)
      toast.success("Floor updated.")
      setEditFloorTarget(null)
      fetchFloors()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdatingFloor(false)
    }
  }

  const handleDeleteFloor = async (floorId: number) => {
    try {
      setIsDeletingFloor(true)
      await parkingFloorsApi.remove(floorId)
      toast.success("Floor deleted.")
      setDeleteFloorTarget(null)
      fetchFloors()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeletingFloor(false)
    }
  }

  const floors = floorsData?.items ?? []

  useEffect(() => {
    const items = floorsData?.items ?? []
    if (items.length === 0) return
    let cancelled = false
    ;(async () => {
      try {
        const results = await Promise.all(
          items.map((f) => parkingSlotsApi.list({ floor_id: f.id, limit: 100 }))
        )
        if (cancelled) return
        setLotSections(
          Array.from(
            new Set(
              results
                .flatMap((r) => r.items)
                .map((s) => s.section?.trim())
                .filter((s): s is string => Boolean(s))
            )
          ).sort((a, b) => a.localeCompare(b))
        )
      } catch (error) {
        console.error("Failed to fetch sections:", error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [floorsData])

  if (isLoadingLot) return <LoadingSpinner label="Loading parking lot..." />
  if (!lot) return <EmptyState title="Parking lot not found" description="This parking lot may have been removed." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={lot.name}
        description="Parking lot details"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/3d/${lot.id}`)}>
              <Box className="size-4 mr-2" />
              3D View
            </Button>
            <Button variant="outline" onClick={() => setEditLotOpen(true)}>
              <Pencil className="size-4" />
              Edit lot
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Hourly Rate</p>
            <p className="mt-1 text-sm font-semibold text-primary">
              {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK / hr` : "Not set (System Default)"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Google Maps</p>
            {lot.google_map_url ? (
              <button
                onClick={() => navigate(`/map/${lot.id}`)}
                className="mt-1 block truncate text-sm font-medium text-primary underline-offset-4 hover:underline text-left"
              >
                View on map
              </button>
            ) : (
              <p className="mt-1 text-sm font-medium">-</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Floors</h2>
        <Button size="sm" onClick={() => setCreateFloorOpen(true)}>
          <Plus className="size-4" />
          New Floor
        </Button>
      </div>

      {/* ── Filter Controls Bar ── */}
      {floors.length > 0 && (
        <Card className="border border-border/80 shadow-sm rounded">
          <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:justify-between flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider shrink-0">
              <Filter className="size-4 text-primary" />
              <span>Filter Slots:</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
              {/* Slot Number Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search slot number..."
                  value={slotSearchQuery}
                  onChange={(e) => setSlotSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded"
                />
              </div>

              {/* Floor Filter */}
              <div className="min-w-[150px]">
                <Select
                  value={selectedFloorId}
                  onValueChange={(val) => val && setSelectedFloorId(val)}
                  items={[
                    { value: "all", label: `All Floors (${floors.length})` },
                    ...floors.map((floor) => ({ value: String(floor.id), label: floor.floor_name || `Floor ${floor.id}` })),
                  ]}
                >
                  <SelectTrigger className="h-9 text-xs rounded gap-2">
                    <Layers className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Floors ({floors.length})
                    </SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor.id} value={String(floor.id)} className="text-xs">
                        {floor.floor_name || `Floor ${floor.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Filter */}
              <div className="min-w-[150px]">
                <Select
                  value={selectedSection}
                  onValueChange={(val) => val && setSelectedSection(val)}
                  items={[
                    { value: "all", label: `All Sections (${lotSections.length})` },
                    { value: "none", label: "No Section (—)" },
                    ...lotSections.map((sec) => ({ value: sec, label: `Section ${sec}` })),
                  ]}
                >
                  <SelectTrigger className="h-9 text-xs rounded gap-2">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Sections ({lotSections.length})
                    </SelectItem>
                    <SelectItem value="none" className="text-xs">
                      No Section (—)
                    </SelectItem>
                    {lotSections.map((sec) => (
                      <SelectItem key={sec} value={sec} className="text-xs">
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(selectedFloorId !== "all" || selectedSection !== "all" || slotSearchQuery.trim() !== "") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFloorId("all")
                    setSelectedSection("all")
                    setSlotSearchQuery("")
                  }}
                  className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded shrink-0"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingFloors ? (
        <LoadingSpinner label="Loading floors..." />
      ) : floors.length === 0 ? (
        <EmptyState
          title="No floors yet"
          description="Add a floor to start creating parking slots."
          action={
            <Button size="sm" onClick={() => setCreateFloorOpen(true)}>
              <Plus className="size-4" />
              New Floor
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {floors
            .filter((floor) => selectedFloorId === "all" || String(floor.id) === selectedFloorId)
            .map((floor) => (
              <FloorSection
                key={floor.id}
                floor={floor}
                onEdit={() => setEditFloorTarget(floor)}
                onDelete={() => setDeleteFloorTarget(floor)}
                onRefresh={() => { fetchFloors(); fetchLot() }}
                navigate={navigate}
                selectedSection={selectedSection}
                slotSearchQuery={slotSearchQuery}
              />
            ))}
        </div>
      )}

      <LotFormDialog
        open={editLotOpen}
        onOpenChange={setEditLotOpen}
        lot={lot}
        onSubmit={(values) => handleUpdateLot(toLotPayload(values))}
        submitting={isUpdatingLot}
      />

      <FloorFormDialog
        open={createFloorOpen}
        onOpenChange={setCreateFloorOpen}
        title="Create floor"
        submitLabel="Create floor"
        onSubmit={(values) => handleCreateFloor({ parking_lot_id: id, floor_name: values.floor_name })}
        submitting={isCreatingFloor}
      />

      <FloorFormDialog
        open={Boolean(editFloorTarget)}
        onOpenChange={(open) => !open && setEditFloorTarget(null)}
        title="Edit floor"
        submitLabel="Save changes"
        defaultValues={editFloorTarget ?? undefined}
        onSubmit={(values) =>
          editFloorTarget && handleUpdateFloor(editFloorTarget.id, { floor_name: values.floor_name })
        }
        submitting={isUpdatingFloor}
      />

      <ConfirmDialog
        open={Boolean(deleteFloorTarget)}
        onOpenChange={(open) => !open && setDeleteFloorTarget(null)}
        title="Delete floor?"
        description={`This will permanently remove ${deleteFloorTarget?.floor_name ?? "this floor"} and its slots. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeletingFloor}
        onConfirm={() => deleteFloorTarget && handleDeleteFloor(deleteFloorTarget.id)}
      />
    </div>
  )
}

function FloorSection({
  floor,
  onEdit,
  onDelete,
  onRefresh,
  navigate,
  selectedSection = "all",
  slotSearchQuery = "",
}: {
  floor: ParkingFloorOut
  onEdit: () => void
  onDelete: () => void
  onRefresh: () => void
  navigate: (path: string) => void
  selectedSection?: string
  slotSearchQuery?: string
}) {
  const [createSlotOpen, setCreateSlotOpen] = useState(false)
  const [editSlotTarget, setEditSlotTarget] = useState<ParkingSlotOut | null>(null)
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<ParkingSlotOut | null>(null)
  const [slotsData, setSlotsData] = useState<ListResult<ParkingSlotOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleCreateSlot = async (payload: CreateSlotPayload) => {
    try {
      setIsCreating(true)
      await parkingSlotsApi.create(payload)
      toast.success("Slot created.")
      setCreateSlotOpen(false)
      fetchSlots()
      onRefresh()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateSlot = async (slotId: number, payload: UpdateSlotPayload) => {
    try {
      setIsUpdating(true)
      await parkingSlotsApi.update(slotId, payload)
      toast.success("Slot updated.")
      setEditSlotTarget(null)
      fetchSlots()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateStatus = async (slotId: number, status: SlotStatus) => {
    try {
      setIsUpdatingStatus(true)
      await parkingSlotsApi.updateStatus(slotId, status)
      toast.success("Slot status updated.")
      fetchSlots()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeleteSlot = async (slotId: number) => {
    try {
      setIsDeleting(true)
      await parkingSlotsApi.remove(slotId)
      toast.success("Slot deleted.")
      setDeleteSlotTarget(null)
      fetchSlots()
      onRefresh()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const rawSlots = slotsData?.items ?? []

  // Filter slots based on search query and section
  const slots = rawSlots.filter((slot) => {
    if (
      slotSearchQuery.trim() &&
      !slot.slot_number.toLowerCase().includes(slotSearchQuery.trim().toLowerCase())
    ) {
      return false
    }
    if (selectedSection !== "all") {
      if (selectedSection === "none") {
        if (slot.section?.trim()) return false
      } else {
        if (slot.section?.trim().toLowerCase() !== selectedSection.toLowerCase()) return false
      }
    }
    return true
  })

  // Group slots by section, unsectioned slots go to "—"
  const sectionMap = slots.reduce<Record<string, ParkingSlotOut[]>>((acc, slot) => {
    const key = slot.section?.trim() || "—"
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})
  const sortedSections = Object.keys(sectionMap).sort((a, b) => {
    if (a === "—") return 1
    if (b === "—") return -1
    return a.localeCompare(b)
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle>{floor.floor_name || `Floor ${floor.id}`}</CardTitle>
          {slots.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium border border-emerald-500/20">
                {slots.filter(s => s.status === "AVAILABLE").length} Available
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium border border-red-500/20">
                {slots.filter(s => s.status === "OCCUPIED").length} Occupied
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateSlotOpen(true)}>
            <Plus className="size-4" />
            New Slot
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
            <Edit className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner label="Loading slots..." />
        ) : slots.length === 0 ? (
          <EmptyState
            title="No slots yet"
            description="Add a slot to this floor."
            action={
              <Button size="sm" onClick={() => setCreateSlotOpen(true)}>
                <Plus className="size-4" />
                New Slot
              </Button>
            }
          />
        ) : (
          <div className="space-y-5">
            {sortedSections.map((section) => {
              const sectionSlots = sectionMap[section]
              const available = sectionSlots.filter(s => s.status === "AVAILABLE").length
              const occupied = sectionSlots.filter(s => s.status === "OCCUPIED").length
              return (
                <div key={section}>
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-muted border border-border/60">
                      <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                        {section === "—" ? "No Section" : `Section ${section}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">{sectionSlots.length} slots</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium">
                      {available > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {available} free
                        </span>
                      )}
                      {occupied > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20">
                          {occupied} taken
                        </span>
                      )}
                    </div>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>

                  {/* Slots Grid for this section — 5 compact columns */}
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {sectionSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`group relative flex flex-col gap-1 rounded border p-2.5 transition-all cursor-default ${slot.status === "AVAILABLE"
                          ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                          }`}
                      >
                        {/* Status dot + slot number row */}
                        <div className="flex items-center gap-1.5">
                          <span className={`size-2 rounded-full shrink-0 ${slot.status === "AVAILABLE" ? "bg-emerald-500" : "bg-red-500"
                            }`} />
                          <span className="text-xs font-bold text-foreground truncate leading-none">{slot.slot_number}</span>
                        </div>

                        {/* Status label */}
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${slot.status === "AVAILABLE" ? "text-emerald-600" : "text-red-600"
                          }`}>
                          {slot.status === "AVAILABLE" ? "Free" : "Taken"}
                        </span>

                        {/* Hover action row */}
                        <div className="flex items-center justify-between gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="icon"
                            className="size-6 rounded"
                            title="View 3D details"
                            onClick={() => navigate(`/slots/${slot.id}`)}
                          >
                            <Box className="size-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="size-6 rounded"
                            title="Edit slot"
                            onClick={() => setEditSlotTarget(slot)}
                          >
                            <Edit className="size-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="size-6 rounded text-destructive hover:text-destructive"
                            title="Delete slot"
                            onClick={() => setDeleteSlotTarget(slot)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>

                        {/* Inline status toggle — always visible */}
                        <Select
                          value={slot.status}
                          onValueChange={(value) => handleUpdateStatus(slot.id, value as SlotStatus)}
                          disabled={isUpdatingStatus}
                        >
                          <SelectTrigger className="w-full h-6 text-[10px] px-1.5 rounded border-border/60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SLOT_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status} className="text-xs">
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <SlotFormDialog
        open={createSlotOpen}
        onOpenChange={setCreateSlotOpen}
        title="Create slot"
        submitLabel="Create slot"
        onSubmit={(values) => handleCreateSlot({ floor_id: floor.id, ...toSlotPayload(values) })}
        submitting={isCreating}
      />

      <SlotFormDialog
        open={Boolean(editSlotTarget)}
        onOpenChange={(open) => !open && setEditSlotTarget(null)}
        title="Edit slot"
        submitLabel="Save changes"
        defaultValues={editSlotTarget ?? undefined}
        onSubmit={(values) =>
          editSlotTarget && handleUpdateSlot(editSlotTarget.id, toSlotPayload(values))
        }
        submitting={isUpdating}
      />

      <ConfirmDialog
        open={Boolean(deleteSlotTarget)}
        onOpenChange={(open) => !open && setDeleteSlotTarget(null)}
        title="Delete slot?"
        description={`This will permanently remove slot ${deleteSlotTarget?.slot_number ?? ""}. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={() => deleteSlotTarget && handleDeleteSlot(deleteSlotTarget.id)}
      />
    </Card>
  )
}

function LotFormDialog({
  open,
  onOpenChange,
  lot,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lot: ParkingLotOut
  onSubmit: (values: LotFormValues) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LotFormValues>({
    resolver: zodResolver(lotSchema),
    values: {
      name: lot.name,
      google_map_url: lot.google_map_url ?? "",
      rate_per_hour: lot.rate_per_hour ?? undefined,
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit parking lot</DialogTitle>
          <DialogDescription>Update the details for this parking lot.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField label="Hourly Rate (MMK/hr)" htmlFor="rate_per_hour" error={errors.rate_per_hour?.message}>
            <Input id="rate_per_hour" type="number" step="1" placeholder="e.g. 500" {...register("rate_per_hour")} />
          </FormField>
          <FormField label="Google Maps URL" htmlFor="google_map_url" error={errors.google_map_url?.message}>
            <Input id="google_map_url" {...register("google_map_url")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FloorFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  defaultValues,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  defaultValues?: ParkingFloorOut
  onSubmit: (values: FloorFormValues) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FloorFormValues>({
    resolver: zodResolver(floorSchema),
    values: defaultValues ? { floor_name: defaultValues.floor_name ?? "" } : undefined,
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Floor name" htmlFor="floor_name" error={errors.floor_name?.message} required>
            <Input id="floor_name" {...register("floor_name")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SlotFormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  defaultValues,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  defaultValues?: ParkingSlotOut
  onSubmit: (values: SlotFormValues) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SlotFormValues>({
    resolver: zodResolver(slotSchema),
    values: defaultValues
      ? {
        slot_number: defaultValues.slot_number,
        section: defaultValues.section ?? "",
        latitude: defaultValues.latitude != null ? String(defaultValues.latitude) : "",
        longitude: defaultValues.longitude != null ? String(defaultValues.longitude) : "",
      }
      : undefined,
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Slot number" htmlFor="slot_number" error={errors.slot_number?.message} required>
            <Input id="slot_number" {...register("slot_number")} />
          </FormField>
          <FormField label="Section" htmlFor="section" error={errors.section?.message}>
            <Input id="section" {...register("section")} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Latitude" htmlFor="latitude" error={errors.latitude?.message}>
              <Input id="latitude" type="number" step="any" {...register("latitude")} />
            </FormField>
            <FormField label="Longitude" htmlFor="longitude" error={errors.longitude?.message}>
              <Input id="longitude" type="number" step="any" {...register("longitude")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
