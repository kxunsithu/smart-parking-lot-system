import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Loader2, Package, Building2, Users, Clock, Edit, Ban, Trash2, Power } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { packagesApi } from "@/api/packages"
import { getErrorMessage } from "@/api/client"
import type { PackageOut, PackageCreate as CreatePackagePayload, PackageUpdate as UpdatePackagePayload } from "@/types"

const packageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive"),
  duration_days: z
    .string()
    .min(1, "Duration is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v)), "Must be a positive integer"),
  max_lots: z
    .string()
    .min(1)
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v)), "Must be a positive integer"),
  max_staff: z
    .string()
    .min(1)
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0 && Number.isInteger(Number(v)), "Must be a positive integer"),
})
type PackageFormValues = z.infer<typeof packageSchema>

function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString("en-US")} MMK`
}

export function AdminPackagesPage() {
  const [packages, setPackages] = useState<PackageOut[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<PackageOut | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PackageOut | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchPackages = async () => {
    try {
      const result = await packagesApi.list({ limit: 100 })
      setPackages(result.data)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const openCreate = () => {
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (pkg: PackageOut) => {
    setEditTarget(pkg)
    setShowForm(true)
  }

  const handleDisable = async (pkg: PackageOut) => {
    try {
      await packagesApi.disable(pkg.id)
      toast.success(`Package "${pkg.name}" disabled.`)
      fetchPackages()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleEnable = async (pkg: PackageOut) => {
    try {
      await packagesApi.enable(pkg.id)
      toast.success(`Package "${pkg.name}" enabled.`)
      fetchPackages()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      await packagesApi.delete(deleteTarget.id)
      toast.success(`Package "${deleteTarget.name}" deleted.`)
      setDeleteTarget(null)
      fetchPackages()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmit = async (values: PackageFormValues) => {
    try {
      setIsSubmitting(true)
      const payload = {
        name: values.name,
        description: values.description || null,
        price: Number(values.price),
        duration_days: Number(values.duration_days),
        max_lots: Number(values.max_lots),
        max_staff: Number(values.max_staff),
      }
      if (editTarget) {
        await packagesApi.update(editTarget.id, payload as UpdatePackagePayload)
        toast.success("Package updated.")
      } else {
        await packagesApi.create(payload as CreatePackagePayload)
        toast.success("Package created.")
      }
      setShowForm(false)
      fetchPackages()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Packages"
        description="Create and manage packages that Parking Owners can subscribe to."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-2" />
            New Package
          </Button>
        }
      />

      <Card>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : packages.length === 0 ? (
            <EmptyState
              title="No packages yet"
              description="Create your first subscription package."
              icon={Package}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="size-5 text-muted-foreground" />
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      </div>
                      <StatusBadge
                        label={pkg.is_active ? "Active" : "Disabled"}
                        tone={pkg.is_active ? "success" : "danger"}
                      />
                    </div>
                    {pkg.description && (
                      <div className="text-sm text-muted-foreground line-clamp-2">{pkg.description}</div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-semibold text-lg">{formatPrice(pkg.price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Duration</span>
                      </div>
                      <span className="font-medium">{pkg.duration_days} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Max Lots</span>
                      </div>
                      <span className="font-medium">{pkg.max_lots}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Max Staff</span>
                      </div>
                      <span className="font-medium">{pkg.max_staff >= 999 ? "Unlimited" : pkg.max_staff}</span>
                    </div>
                    <div className="pt-2 border-t flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(pkg)} className="flex-1">
                        <Edit className="size-4 mr-2" />
                        Edit
                      </Button>
                      {pkg.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisable(pkg)}
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Ban className="size-4 mr-2" />
                          Disable
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEnable(pkg)}
                          className="flex-1 text-green-600 hover:text-green-600"
                        >
                          <Power className="size-4 mr-2" />
                          Enable
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(pkg)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PackageFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        defaultValues={
          editTarget
            ? {
                name: editTarget.name,
                description: editTarget.description ?? "",
                price: String(editTarget.price),
                duration_days: String(editTarget.duration_days),
                max_lots: String(editTarget.max_lots),
                max_staff: String(editTarget.max_staff),
              }
            : undefined
        }
        isEdit={Boolean(editTarget)}
        onSubmit={handleSubmit}
        submitting={isSubmitting}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete package?"
        description={`This will permanently delete "${deleteTarget?.name}" and all related subscriptions. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function PackageFormDialog({
  open,
  onOpenChange,
  defaultValues,
  isEdit,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultValues?: Partial<PackageFormValues>
  isEdit: boolean
  onSubmit: (values: PackageFormValues) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: defaultValues ?? { max_lots: "1", max_staff: "5" },
  })

  useEffect(() => {
    if (open) {
      reset(defaultValues ?? { max_lots: "1", max_staff: "5" })
    }
  }, [open, defaultValues])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Package" : "Create Package"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the package details." : "Define a new subscription tier for parking owners."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Package Name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" placeholder="e.g. Pro" {...register("name")} />
          </FormField>
          <FormField label="Description" htmlFor="description" error={errors.description?.message}>
            <Textarea id="description" placeholder="Brief description..." rows={2} {...register("description")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price (MMK)" htmlFor="price" error={errors.price?.message}>
              <Input id="price" type="number" step="any" placeholder="9900" {...register("price")} />
            </FormField>
            <FormField label="Duration (days)" htmlFor="duration_days" error={errors.duration_days?.message}>
              <Input id="duration_days" type="number" placeholder="30" {...register("duration_days")} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Max Parking Lots" htmlFor="max_lots" error={errors.max_lots?.message}>
              <Input id="max_lots" type="number" placeholder="1" {...register("max_lots")} />
            </FormField>
            <FormField label="Max Staff per Lot" htmlFor="max_staff" error={errors.max_staff?.message}>
              <Input id="max_staff" type="number" placeholder="5" {...register("max_staff")} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEdit ? "Save changes" : "Create package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
