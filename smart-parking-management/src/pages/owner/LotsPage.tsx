import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Building2,
  MapPin,
  DollarSign,
  Eye,
  Box,
  Users,
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { parkingOwnersApi } from "@/api/parkingOwners"
import { parkingLotsApi } from "@/api/parkingLots"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingLotOut, ParkingOwnerOut, ParkingLotCreate, ParkingLotUpdate } from "@/types"
import type { ListResult } from "@/api/types"

const lotSchema = z.object({
  name: z.string().min(1, "Name is required"),
  google_map_url: z.string().optional(),
  rate_per_hour: z.coerce.number().min(0, "Rate must be positive").optional(),
})
type LotFormValues = z.infer<typeof lotSchema>

function toLotPayload(values: LotFormValues): ParkingLotCreate {
  return {
    name: values.name,
    google_map_url: values.google_map_url || undefined,
    rate_per_hour: values.rate_per_hour != null && !isNaN(values.rate_per_hour) ? values.rate_per_hour : undefined,
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
      const queryParams = { ...params, owner_id: ownerProfile.id, with_staff_count: true }
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

  const handleCreate = async (payload: ParkingLotCreate) => {
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

  const handleUpdate = async (id: number, payload: ParkingLotUpdate) => {
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

  const handleToggleStatus = async (lotId: number) => {
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
        description="Manage your parking lots portfolio."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm">
            <Plus className="size-4" />
            New Lot
          </Button>
        }
      />

      <div className="space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name..." className="max-w-sm" />

        {isLoading ? (
          <CardGridSkeleton count={4} />
        ) : lots.length === 0 ? (
          <EmptyState
            title="No parking lots yet"
            description="Create your first parking lot to get started."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="size-4" />
                New Lot
              </Button>
            }
          />
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${isFetching ? "opacity-60" : ""}`}>
            {lots.map((lot) => (
              <Card
                key={lot.id}
                className="group relative overflow-hidden border border-border/80 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 rounded flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Header Row: Icon + Name + Active Switch */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-11 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                          <Building2 className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="font-bold text-base text-foreground leading-tight truncate group-hover:text-primary transition-colors cursor-pointer"
                            onClick={() => navigate(`/owner/lots/${lot.id}`)}
                          >
                            {lot.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <span>ID: #{lot.id}</span>
                            <span>·</span>
                            <span>{new Date(lot.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                          onClick={() => setEditTarget(lot)}
                          title="Edit Lot"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded"
                          onClick={() => setDeleteTarget(lot)}
                          title="Delete Lot"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Status & Rate Badge Info Row */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded bg-muted/30 border border-border/40 p-2 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Users className="size-3 text-primary" /> Staff
                        </span>
                        <p className="font-bold text-foreground text-xs">
                          {lot.staff_count ?? 0}
                        </p>
                      </div>

                      <div className="rounded bg-muted/30 border border-border/40 p-2 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <DollarSign className="size-3 text-emerald-500" /> Rate
                        </span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs truncate" title={lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK` : "Default"}>
                          {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()}` : "Default"}
                        </p>
                      </div>

                      <div className="rounded bg-muted/30 border border-border/40 p-2 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Switch
                            checked={lot.is_active}
                            onCheckedChange={() => handleToggleStatus(lot.id)}
                            disabled={togglingId === lot.id}
                            className="scale-75 -ml-1"
                          />
                          <span>{lot.is_active ? "Active" : "Closed"}</span>
                        </span>
                        <Badge
                          variant={lot.is_active ? "default" : "secondary"}
                          className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 rounded w-fit ${lot.is_active
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : "bg-slate-500/15 text-slate-600 border border-slate-500/30"
                            }`}
                        >
                          {lot.is_active ? "Open" : "Off"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-border/40 flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded shadow-sm"
                      onClick={() => navigate(`/owner/lots/${lot.id}`)}
                    >
                      <Eye className="size-3.5" />
                      Manage Lot
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 rounded border-border/80 hover:bg-muted"
                      onClick={() => navigate(`/3d/${lot.id}`)}
                      title="3D View"
                    >
                      <Box className="size-3.5 text-primary" />
                      3D View
                    </Button>

                    {lot.google_map_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 rounded border-border/80 hover:bg-muted"
                        onClick={() => navigate(`/map/${lot.id}`)}
                        title="Map View"
                      >
                        <MapPin className="size-3.5 text-primary" />
                        Map
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DataPagination meta={data?.meta} onPageChange={setPage} />
      </div>

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
        rate_per_hour: defaultValues.rate_per_hour ?? undefined,
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
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
