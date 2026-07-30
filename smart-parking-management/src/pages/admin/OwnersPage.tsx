import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/common/StatusBadge"
import { parkingOwnersApi } from "@/api/parkingOwners"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingOwnerOut } from "@/types"
import type { ListResult } from "@/api/types"

export function OwnersPage() {
  const { setPage, search, setSearch, params } = usePaginationState()
  const [deleteTarget, setDeleteTarget] = useState<ParkingOwnerOut | null>(null)
  const [data, setData] = useState<ListResult<ParkingOwnerOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await parkingOwnersApi.list(params)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch owners:", error)
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params])

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

  const handleToggleStatus = async (ownerId: number) => {
    try {
      setTogglingId(ownerId)
      await parkingOwnersApi.toggleStatus(ownerId)
      toast.success("Parking owner status updated successfully.")
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setTogglingId(null)
    }
  }

  const owners = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Owners"
        description="View and manage parking owner accounts. Owners can register themselves."
      />

      <Card>
        <CardContent className="space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by company name..." className="max-w-sm" />

          {isLoading ? (
            <TableSkeleton />
          ) : owners.length === 0 ? (
            <EmptyState
              title="No parking owners yet"
              description="Parking owners can register themselves through the registration page."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email Verified</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {owners.map((owner) => (
                    <TableRow key={owner.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{owner.company_name || "-"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{owner.user?.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{owner.user?.email || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={owner.user?.is_verified ? "Verified" : "Not Verified"}
                          tone={owner.user?.is_verified ? "success" : "warning"}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={owner.user?.is_active}
                          onCheckedChange={() => handleToggleStatus(owner.id)}
                          disabled={togglingId === owner.id}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(owner)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
