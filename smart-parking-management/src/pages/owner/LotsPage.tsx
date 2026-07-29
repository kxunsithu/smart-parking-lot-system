import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parkingOwnersApi } from "@/api/parkingOwners"
import { parkingLotsApi, type CreateLotPayload, type UpdateLotPayload } from "@/api/parkingLots"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingLotOut, ParkingOwnerOut } from "@/types"
import type { ListResult } from "@/api/types"

const lotSchema = z.object({
  name: z.string().min(1, "Name is required"),
  google_map_url: z.string().optional(),
})
type LotFormValues = z.infer<typeof lotSchema>

function toLotPayload(values: LotFormValues): CreateLotPayload {
  return {
    name: values.name,
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
  const [togglingId, setTogglingId] = useState<number | null>(null)

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

  const handleToggleStatus = async (lotId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setTogglingId(lotId)
      await parkingLotsApi.toggleStatus(lotId)
      toast.success("Parking lot status updated successfully.")
      fetchLots()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setTogglingId(null)
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
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name..." className="max-w-sm" />

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
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => { e.stopPropagation(); setEditTarget(lot) }}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(lot) }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <Switch
                        checked={lot.is_active}
                        onCheckedChange={() => handleToggleStatus(lot.id, { stopPropagation: () => {} } as any)}
                        disabled={togglingId === lot.id}
                      />
                    </div>
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
          <FormField label="Google Maps URL" htmlFor="google_map_url" error={errors.google_map_url?.message}>
            <Input id="google_map_url" {...register("google_map_url")} />
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
