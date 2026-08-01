import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  Building2,
  Users,
  Eye,
  MapPin,
  DollarSign,
  User,
  Mail,
  Briefcase,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
        description="View and manage all parking lots in the system."
      />

      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by lot name..."
          className="max-w-sm"
        />

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : lots.length === 0 ? (
          <EmptyState
            title="No parking lots found"
            description="Parking lots will appear here once owners create them."
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
                    {/* Header Row: Icon + Lot Name + Status Switch */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-11 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight group-hover:text-primary transition-colors">
                            {lot.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <span>ID: #{lot.id}</span>
                            <span>·</span>
                            <span>Created {new Date(lot.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={lot.is_active ? "default" : "secondary"}
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${lot.is_active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                            }`}
                        >
                          {lot.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Switch
                          checked={lot.is_active}
                          onCheckedChange={() => handleToggleStatus(lot.id)}
                          disabled={togglingId === lot.id}
                          aria-label="Toggle lot status"
                        />
                      </div>
                    </div>

                    {/* Owner Profile Snippet Card */}
                    {lot.owner ? (
                      <div className="rounded bg-muted/40 border border-border/60 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Briefcase className="size-3.5 text-primary" />
                            {lot.owner.company_name || "Company Not Set"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground pt-0.5">
                          {lot.owner.user?.name && (
                            <span className="flex items-center gap-1.5 truncate">
                              <User className="size-3 text-muted-foreground shrink-0" />
                              {lot.owner.user.name}
                            </span>
                          )}
                          {lot.owner.user?.email && (
                            <span className="flex items-center gap-1.5 truncate">
                              <Mail className="size-3 text-muted-foreground shrink-0" />
                              {lot.owner.user.email}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded bg-muted/20 border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                        No owner details linked
                      </div>
                    )}

                    {/* Metrics Grid (Staff count & Rate per hour) */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-muted/30 border border-border/40 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Users className="size-3 text-primary" /> Staff Members
                        </span>
                        <p className="font-bold text-foreground text-xs">
                          {lot.staff_count ?? 0} Staff
                        </p>
                      </div>

                      <div className="rounded bg-muted/30 border border-border/40 p-2.5 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <DollarSign className="size-3 text-emerald-500" /> Hourly Rate
                        </span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK` : "Default Rate"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-border/40 flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded shadow-sm"
                      onClick={() => navigate(`/admin/lots/${lot.id}`)}
                    >
                      <Eye className="size-3.5" />
                      View Lot Details
                    </Button>

                    {lot.google_map_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 rounded border-border/80 hover:bg-muted"
                        onClick={() => navigate(`/map/${lot.id}`)}
                        title="View Map"
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
    </div>
  )
}
