import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Building2, Users, Eye } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { parkingLotsApi } from "@/api/parkingLots"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingLotWithStaffOut } from "@/types"
import type { ListResult } from "@/api/types"

export function ParkingLotsPage() {
  const navigate = useNavigate()
  const { setPage, search, setSearch, params } = usePaginationState()
  const [data, setData] = useState<ListResult<ParkingLotWithStaffOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await parkingLotsApi.list({ ...params, with_staff_count: "true" })
      setData(result as ListResult<ParkingLotWithStaffOut>)
    } catch (error) {
      console.error("Failed to fetch parking lots:", error)
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  const handleToggleStatus = async (lotId: number) => {
    try {
      setTogglingId(lotId)
      await parkingLotsApi.toggleStatus(lotId)
      toast.success("Parking lot status updated successfully.")
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setTogglingId(null)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params])

  const lots = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Lots"
        description="View all parking lots in the system with owner and staff information."
      />

      <Card>
        <CardContent className="space-y-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by lot name..." className="max-w-sm" />

          {isLoading ? (
            <TableSkeleton />
          ) : lots.length === 0 ? (
            <EmptyState
              title="No parking lots yet"
              description="Parking lots will appear here once owners create them."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lot) => (
                    <TableRow key={lot.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          {lot.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lot.owner ? (
                          <div className="space-y-1">
                            <div className="font-medium">{lot.owner.user?.name || "-"}</div>
                            <div className="text-xs text-muted-foreground">{lot.owner.company_name || "-"}</div>
                            <div className="text-xs text-muted-foreground">{lot.owner.user?.email || "-"}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-muted-foreground" />
                          {lot.staff_count || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={lot.is_active}
                          onCheckedChange={() => handleToggleStatus(lot.id)}
                          disabled={togglingId === lot.id}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(lot.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => navigate(`/admin/lots/${lot.id}`)}
                        >
                          <Eye className="size-4" />
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
    </div>
  )
}
