import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Pencil, Plus, Box, Edit, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { StatusBadge } from "@/components/common/StatusBadge"
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
import { parkingLotsApi, type UpdateLotPayload } from "@/api/parkingLots"
import { parkingFloorsApi, type CreateFloorPayload, type UpdateFloorPayload } from "@/api/parkingFloors"
import { parkingSlotsApi, type CreateSlotPayload, type UpdateSlotPayload } from "@/api/parkingSlots"
import { getErrorMessage } from "@/api/client"
import { slotStatusTone } from "@/utils/statusColors"
import type { ParkingFloorOut, ParkingLotOut, ParkingSlotOut, SlotStatus } from "@/types"
import type { ListResult } from "@/api/types"

const numericString = z
  .string()
  .optional()
  .refine((val) => !val || !Number.isNaN(Number(val)), "Must be a valid number")

const lotSchema = z.object({
  name: z.string().min(1, "Name is required"),
  google_map_url: z.string().optional(),
})
type LotFormValues = z.infer<typeof lotSchema>

function toLotPayload(values: LotFormValues): UpdateLotPayload {
  return {
    name: values.name,
    google_map_url: values.google_map_url || undefined,
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
          {floors.map((floor) => (
            <FloorSection
              key={floor.id}
              floor={floor}
              onEdit={() => setEditFloorTarget(floor)}
              onDelete={() => setDeleteFloorTarget(floor)}
              onRefresh={() => { fetchFloors(); fetchLot() }}
              navigate={navigate}
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
}: {
  floor: ParkingFloorOut
  onEdit: () => void
  onDelete: () => void
  onRefresh: () => void
  navigate: (path: string) => void
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

  const slots = slotsData?.items ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{floor.floor_name || `Floor ${floor.id}`}</CardTitle>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => (
              <Card key={slot.id}>
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{slot.slot_number}</p>
                      {slot.section ? <p className="text-xs text-muted-foreground">{slot.section}</p> : null}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => navigate(`/slots/${slot.id}`)}>
                        <Box className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditSlotTarget(slot)}>
                        <Edit className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteSlotTarget(slot)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <StatusBadge label={slot.status} tone={slotStatusTone(slot.status)} />
                  <Select
                    value={slot.status}
                    onValueChange={(value) => handleUpdateStatus(slot.id, value as SlotStatus)}
                    disabled={isUpdatingStatus}
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
            ))}
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
