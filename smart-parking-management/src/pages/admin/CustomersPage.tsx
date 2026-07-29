import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Power, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usersApi } from "@/api/users"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import { activeStatusTone } from "@/utils/statusColors"
import { formatDate } from "@/utils/formatters"
import type { UserOut } from "@/types"
import type { ListResult } from "@/api/types"

export function CustomersPage() {
  const { setPage, search, setSearch, params } = usePaginationState()
  const [deleteTarget, setDeleteTarget] = useState<UserOut | null>(null)
  const [data, setData] = useState<ListResult<UserOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const queryParams = useMemo(() => ({ ...params, role_id: 4 }), [params])

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await usersApi.list(queryParams)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [queryParams])

  const handleToggleActive = async (user: UserOut) => {
    try {
      setIsToggling(true)
      if (user.is_active) {
        await usersApi.deactivate(user.id)
      } else {
        await usersApi.activate(user.id)
      }
      toast.success("User status updated.")
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      setIsDeleting(true)
      await usersApi.remove(id)
      toast.success("User deleted.")
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const users = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description="View and manage customer accounts." />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." className="max-w-sm" />
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : users.length === 0 ? (
            <EmptyState title="No users found" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role?.name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          label={user.is_active ? "Active" : "Inactive"}
                          tone={activeStatusTone(user.is_active)}
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleToggleActive(user)}
                            disabled={isToggling}
                          >
                            <Power className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(user)}
                          >
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user?"
        description={`This will permanently remove ${deleteTarget?.name}. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isDeleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  )
}
