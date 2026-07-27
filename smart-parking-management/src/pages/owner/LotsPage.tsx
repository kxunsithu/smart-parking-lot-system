import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, MapPin, MoreHorizontal, Plus } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { parkingOwnersApi } from "@/api/parkingOwners"
import { parkingLotsApi, type CreateLotPayload, type UpdateLotPayload } from "@/api/parkingLots"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingLotOut, ParkingOwnerOut } from "@/types"
import type { ListResult } from "@/api/types"

const numericString = z
  .string()
  .optional()
  .refine((val) => !val || !Number.isNaN(Number(val)), "Must be a valid number")

const lotSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  address: z.string().optional(),
  latitude: numericString,
  longitude: numericString,
  google_map_url: z.string().optional(),
})
type LotFormValues = z.infer<typeof lotSchema>

function toLotPayload(values: LotFormValues): CreateLotPayload {
  return {
    name: values.name,
    type: values.type || undefined,
    address: values.address || undefined,
    latitude: values.latitude ? Number(values.latitude) : undefined,
    longitude: values.longitude ? Number(values.longitude) : undefined,
    google_map_url: values.google_map_url || undefined,
  }
}

export function LotsPage() {
  const navigate = useNavigate()
  const { setPage, search, setSearch, params } = usePaginationState()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ParkingLotOut | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ParkingLotOut | null>(null)
  const [ownerProfile, setOwnerProfile] = useState<ParkingOwnerOut | null>(null)
  const [data, setData] = useState<ListResult<ParkingLotOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchOwnerProfile = async () => {
    try {
      const result = await parkingOwnersApi.me()
      setOwnerProfile(result)
    } catch (error) {
      console.error("Failed to fetch owner profile:", error)
    }
  }

  const fetchLots = async () => {
    if (!ownerProfile?.id) return
    try {
      setIsFetching(true)
      const queryParams = { ...params, owner_id: ownerProfile.id }
      const result = await parkingLotsApi.list(queryParams)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch lots:", error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchOwnerProfile()
  }, [])

  useEffect(() => {
    fetchLots()
  }, [params, ownerProfile?.id])

  const handleCreate = async (payload: CreateLotPayload) => {
    try {
      setIsCreating(true)
      await parkingLotsApi.create(payload)
      toast.success("Parking lot created successfully.")
      setCreateOpen(false)
      fetchLots()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (id: number, payload: UpdateLotPayload) => {
    try {
      setIsUpdating(true)
      await parkingLotsApi.update(id, payload)
      toast.success("Parking lot updated.")
      setEditTarget(null)
      fetchLots()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true)
      await parkingLotsApi.remove(id)
      toast.success("Parking lot deleted.")
      setDeleteTarget(null)
      fetchLots()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const lots = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Lots"
        description="Manage your parking lots."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Lot
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or address..." className="max-w-sm" />

          {isLoading ? (
            <CardGridSkeleton count={4} />
          ) : lots.length === 0 ? (
            <EmptyState
              title="No parking lots yet"
              description="Create your first parking lot to get started."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  New Lot
                </Button>
              }
            />
          ) : (
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-60" : ""}`}>
              {lots.map((lot) => (
                <Card
                  key={lot.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/owner/lots/${lot.id}`)}
                >
                  <CardHeader className="flex-row items-start justify-between">
                    <div>
                      <CardTitle>{lot.name}</CardTitle>
                      {lot.type ? <p className="mt-1 text-xs text-muted-foreground">{lot.type}</p> : null}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setEditTarget(lot)}>Edit lot</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(lot)}>
                          Delete lot
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {lot.address ? (
                      <p className="flex items-start gap-1.5 text-muted-foreground">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        <span className="truncate">{lot.address}</span>
                      </p>
                    ) : null}
                    <p className="text-muted-foreground">
                      Total slots: <span className="font-medium text-foreground">{lot.total_slots}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DataPagination meta={data?.meta} onPageChange={setPage} />
        </CardContent>
      </Card>

      <LotFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create parking lot"
        description="Add a new parking lot to your portfolio."
        submitLabel="Create lot"
        onSubmit={(values) => handleCreate(toLotPayload(values))}
        submitting={isCreating}
      />

      <LotFormDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Edit parking lot"
        description="Update the details for this parking lot."
        submitLabel="Save changes"
        defaultValues={editTarget ?? undefined}
        onSubmit={(values) =>
          editTarget && handleUpdate(editTarget.id, toLotPayload(values))
        }
        submitting={isUpdating}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete parking lot?"
        description={`This will permanently remove ${deleteTarget?.name}. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  )
}

function LotFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  defaultValues,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  defaultValues?: ParkingLotOut
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
    values: defaultValues
      ? {
          name: defaultValues.name,
          type: defaultValues.type ?? "",
          address: defaultValues.address ?? "",
          latitude: defaultValues.latitude != null ? String(defaultValues.latitude) : "",
          longitude: defaultValues.longitude != null ? String(defaultValues.longitude) : "",
          google_map_url: defaultValues.google_map_url ?? "",
        }
      : undefined,
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" {...register("name")} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Type" htmlFor="type" error={errors.type?.message}>
              <Input id="type" placeholder="e.g. Outdoor, Garage" {...register("type")} />
            </FormField>
            <FormField label="Google Maps URL" htmlFor="google_map_url" error={errors.google_map_url?.message}>
              <Input id="google_map_url" {...register("google_map_url")} />
            </FormField>
          </div>
          <FormField label="Address" htmlFor="address" error={errors.address?.message}>
            <Input id="address" {...register("address")} />
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
