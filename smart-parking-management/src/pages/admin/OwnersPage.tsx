import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, MoreHorizontal, Plus } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { parkingOwnersApi, type CreateOwnerPayload } from "@/api/parkingOwners"
import { getErrorMessage, getFieldErrors } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingOwnerOut } from "@/types"
import type { ListResult } from "@/api/types"

const ownerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  business_license: z.string().optional(),
  address: z.string().optional(),
})
type OwnerFormValues = z.infer<typeof ownerSchema>

export function OwnersPage() {
  const { setPage, search, setSearch, params } = usePaginationState()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ParkingOwnerOut | null>(null)
  const [data, setData] = useState<ListResult<ParkingOwnerOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await parkingOwnersApi.list(params)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch owners:", error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params])

  const handleCreate = async (payload: CreateOwnerPayload) => {
    try {
      setIsCreating(true)
      await parkingOwnersApi.create(payload)
      toast.success("Parking owner created successfully.")
      setCreateOpen(false)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true)
      await parkingOwnersApi.remove(id)
      toast.success("Parking owner deleted.")
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const owners = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Owners"
        description="Create and manage parking owner accounts."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Owner
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by company or address..." className="max-w-sm" />

          {isLoading ? (
            <TableSkeleton />
          ) : owners.length === 0 ? (
            <EmptyState
              title="No parking owners yet"
              description="Create your first parking owner to get started."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  New Owner
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Business License</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((owner) => (
                    <TableRow key={owner.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{owner.company_name || "-"}</TableCell>
                      <TableCell>
                        <div>{owner.user?.name}</div>
                        <div className="text-xs text-muted-foreground">{owner.user?.email}</div>
                      </TableCell>
                      <TableCell>{owner.business_license || "-"}</TableCell>
                      <TableCell className="max-w-56 truncate">{owner.address || "-"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(owner)}>
                              Delete owner
                            </DropdownMenuItem>
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

      <CreateOwnerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        submitting={isCreating}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete parking owner?"
        description={`This will permanently remove ${deleteTarget?.company_name || deleteTarget?.user?.name} and their parking lots access. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  )
}

function CreateOwnerDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreateOwnerPayload) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OwnerFormValues>({ resolver: zodResolver(ownerSchema) })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleFormSubmit(values: OwnerFormValues) {
    try {
      onSubmit({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone,
        company_name: values.company_name,
        business_license: values.business_license,
        address: values.address,
      })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors.email) setError("email", { message: fieldErrors.email })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create parking owner</DialogTitle>
          <DialogDescription>
            This creates a new user account with the Owner role and a parking owner profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="name" error={errors.name?.message} required>
              <Input id="name" {...register("name")} />
            </FormField>
            <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input id="email" type="email" {...register("email")} />
            </FormField>
            <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
              <Input id="password" type="password" {...register("password")} />
            </FormField>
            <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input id="phone" {...register("phone")} />
            </FormField>
            <FormField label="Company name" htmlFor="company_name" error={errors.company_name?.message}>
              <Input id="company_name" {...register("company_name")} />
            </FormField>
            <FormField
              label="Business license"
              htmlFor="business_license"
              error={errors.business_license?.message}
            >
              <Input id="business_license" {...register("business_license")} />
            </FormField>
          </div>
          <FormField label="Address" htmlFor="address" error={errors.address?.message}>
            <Input id="address" {...register("address")} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Create owner
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
