import { useEffect, useState, useMemo } from "react"
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
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
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
import { parkingOwnersApi } from "@/api/parkingOwners"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingStaffApi } from "@/api/parkingStaff"
import { getErrorMessage, getFieldErrors } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingLotOut, ParkingStaffOut, ParkingOwnerOut, ParkingStaffUpdate as UpdateStaffPayload } from "@/types"
import type { ListResult } from "@/api/types"

const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  parking_lot_id: z.number().min(1, "Parking lot is required"),
})
type CreateStaffFormValues = z.infer<typeof createStaffSchema>

const updateStaffSchema = z.object({
  parking_lot_id: z.number().min(1, "Parking lot is required"),
})
type UpdateStaffFormValues = z.infer<typeof updateStaffSchema>

export function StaffPage() {
  const navigate = useNavigate()
  const { setPage, search, setSearch, params } = usePaginationState()
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ParkingStaffOut | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ParkingStaffOut | null>(null)
  const [ownerProfile, setOwnerProfile] = useState<ParkingOwnerOut | null>(null)
  const [lotsData, setLotsData] = useState<ListResult<ParkingLotOut> | null>(null)
  const [isLoadingLots, setIsLoadingLots] = useState(true)
  const [data, setData] = useState<ListResult<ParkingStaffOut> | null>(null)
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
      const result = await parkingLotsApi.list({ owner_id: ownerProfile.id, limit: 100 })
      setLotsData(result)
    } catch (error) {
      console.error("Failed to fetch lots:", error)
    } finally {
      setIsLoadingLots(false)
    }
  }

  const lots = lotsData?.items ?? []

  useEffect(() => {
    fetchOwnerProfile()
  }, [])

  useEffect(() => {
    fetchLots()
  }, [ownerProfile?.id])

  useEffect(() => {
    if (!selectedLotId && lots.length > 0) {
      setSelectedLotId(lots[0].id)
    }
  }, [lots, selectedLotId])

  const staffParams = useMemo(() => ({ ...params, parking_lot_id: selectedLotId ?? undefined }), [params, selectedLotId])

  const fetchStaff = async () => {
    if (!selectedLotId) return
    try {
      setIsFetching(true)
      const result = await parkingStaffApi.list(staffParams)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch staff:", error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [staffParams])

  const handleCreate = async (values: CreateStaffFormValues) => {
    try {
      setIsCreating(true)
      await parkingStaffApi.create({
        name: values.name,
        email: values.email,
        password: values.password,
        parking_lot_id: values.parking_lot_id,
      })
      toast.success("Staff member created successfully.")
      setCreateOpen(false)
      fetchStaff()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async (id: number, payload: UpdateStaffPayload) => {
    try {
      setIsUpdating(true)
      await parkingStaffApi.update(id, payload)
      toast.success("Staff member updated.")
      setEditTarget(null)
      fetchStaff()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true)
      await parkingStaffApi.remove(id)
      toast.success("Staff member deleted.")
      setDeleteTarget(null)
      fetchStaff()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const staff = data?.items ?? []

  if (!isLoadingLots && lots.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Staff" description="Manage staff members for your parking lots." />
        <EmptyState
          title="No parking lots yet"
          description="You need to create a parking lot before you can add staff members."
          action={<Button onClick={() => navigate("/owner/lots")}>Go to Parking Lots</Button>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage staff members for your parking lots."
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={!selectedLotId}>
            <Plus className="size-4" />
            New Staff
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Viewing staff for:</span>
              <Select
                value={selectedLotId ? String(selectedLotId) : undefined}
                onValueChange={(value) => setSelectedLotId(Number(value))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select a lot" />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={String(lot.id)}>
                      {lot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search staff..." className="max-w-sm" />
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : staff.length === 0 ? (
            <EmptyState
              title="No staff members yet"
              description="Add a staff member to this parking lot."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  New Staff
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
                    <TableRow key={member.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{member.user?.name ?? "-"}</TableCell>
                      <TableCell>
                        <div>{member.user?.email}</div>
                        <div className="text-xs text-muted-foreground">{member.user?.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditTarget(member)}>
                            <Edit className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(member)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
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

      <CreateStaffDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        lots={lots}
        defaultLotId={selectedLotId}
        onSubmit={(values) => handleCreate(values)}
        submitting={isCreating}
      />

      <EditStaffDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        lots={lots}
        target={editTarget}
        onSubmit={(values) => editTarget && handleUpdate(editTarget.id, values)}
        submitting={isUpdating}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete staff member?"
        description={`This will permanently remove ${deleteTarget?.user?.name ?? "this staff member"}. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  )
}

function CreateStaffDialog({
  open,
  onOpenChange,
  lots,
  defaultLotId,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lots: ParkingLotOut[]
  defaultLotId: number | null
  onSubmit: (values: CreateStaffFormValues) => void
  submitting: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    values: {
      name: "",
      email: "",
      password: "",
      parking_lot_id: defaultLotId ?? 0,
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleFormSubmit(values: CreateStaffFormValues) {
    try {
      onSubmit({
        name: values.name,
        email: values.email,
        password: values.password,
        parking_lot_id: values.parking_lot_id,
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
          <DialogTitle>Create staff member</DialogTitle>
          <DialogDescription>This creates a new user account with the Staff role.</DialogDescription>
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
          </div>
          <FormField label="Parking lot" htmlFor="parking_lot_id" error={errors.parking_lot_id?.message} required>
            <Select
              value={watch("parking_lot_id") ? String(watch("parking_lot_id")) : undefined}
              onValueChange={(value) => setValue("parking_lot_id", Number(value), { shouldValidate: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a lot" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={String(lot.id)}>
                    {lot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Create staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditStaffDialog({
  open,
  onOpenChange,
  lots,
  target,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lots: ParkingLotOut[]
  target: ParkingStaffOut | null
  onSubmit: (values: UpdateStaffFormValues) => void
  submitting: boolean
}) {
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateStaffFormValues>({
    resolver: zodResolver(updateStaffSchema),
    values: target
      ? {
          parking_lot_id: target.parking_lot_id,
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
          <DialogTitle>Edit staff member</DialogTitle>
          <DialogDescription>Update the assignment and details for this staff member.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Parking lot" htmlFor="parking_lot_id" error={errors.parking_lot_id?.message} required>
            <Select
              value={watch("parking_lot_id") ? String(watch("parking_lot_id")) : undefined}
              onValueChange={(value) => setValue("parking_lot_id", Number(value), { shouldValidate: true })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a lot" />
              </SelectTrigger>
              <SelectContent>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={String(lot.id)}>
                    {lot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
