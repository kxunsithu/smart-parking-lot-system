import { useState, useEffect, useRef } from "react"
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
  Phone,
  Briefcase,
  ChevronDown,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { parkingLotsApi } from "@/api/parkingLots"
import { citiesApi, type CityOut } from "@/api/cities"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ParkingLotWithStaffOut } from "@/types"
import type { ListResult } from "@/api/types"


export function ParkingLotsPage() {
  const navigate = useNavigate()
  const { setPage, search, setSearch, params } = usePaginationState()
  const [data, setData] = useState<ListResult<ParkingLotWithStaffOut> | null>(null)
  const [dbCities, setDbCities] = useState<CityOut[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>("")
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await parkingLotsApi.list({
        ...params,
        with_staff_count: "true",
        ...(selectedCity ? { city: selectedCity } : {}),
      })
      setData(result as ListResult<ParkingLotWithStaffOut>)
    } catch (error) {
      console.error("Failed to fetch parking lots:", error)
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  const fetchCities = async () => {
    try {
      const res = await citiesApi.list({ is_active: true })
      setDbCities(res)
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    fetchCities()
  }, [])

  useEffect(() => {
    fetchData()
  }, [params, selectedCity])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const lots = data?.items ?? []
  const availableCities = dbCities.map((c) => ({ value: c.name, label: c.name, labelMm: c.name_mm ?? "" }))

  const selectedCityLabel = selectedCity
    ? availableCities.find((c) => c.value === selectedCity)?.label ?? selectedCity
    : ""

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parking Lots — Kayin State"
        description="View and manage all parking lots across Kayin State (ကရင်ပြည်နယ်)."
      />

      <div className="space-y-4">
        {/* Search + city filter row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by lot name..."
            className="max-w-sm"
          />

          {/* City filter dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="admin-city-filter-btn"
              type="button"
              onClick={() => setCityDropdownOpen((o) => !o)}
              className={`flex items-center gap-2 h-9 px-3 rounded-md border text-sm font-medium transition-colors whitespace-nowrap
                ${selectedCity
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-foreground hover:bg-muted/60"
                }`}
            >
              <Building2 className="size-4 shrink-0" />
              {selectedCity ? selectedCityLabel : "All Cities"}
              {selectedCity ? (
                <span
                  role="button"
                  aria-label="Clear city filter"
                  onClick={(e) => { e.stopPropagation(); setSelectedCity(""); setCityDropdownOpen(false) }}
                  className="ml-1 rounded-full hover:text-destructive transition-colors"
                >
                  <X className="size-3.5" />
                </span>
              ) : (
                <ChevronDown className={`size-3.5 transition-transform ${cityDropdownOpen ? "rotate-180" : ""}`} />
              )}
            </button>

            {cityDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 min-w-[210px] rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                <div className="py-1">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors font-medium text-muted-foreground"
                    onClick={() => { setSelectedCity(""); setCityDropdownOpen(false) }}
                  >
                    All Cities
                  </button>
                  <div className="h-px bg-border/60 mx-2 my-1" />
                  {availableCities.map((city) => (
                    <button
                      key={city.value}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center justify-between
                        ${selectedCity === city.value ? "text-primary font-semibold bg-primary/5" : "text-foreground"}`}
                      onClick={() => { setSelectedCity(city.value); setCityDropdownOpen(false) }}
                    >
                      <span>{city.label}</span>
                      <span className="text-xs text-muted-foreground">{city.labelMm}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active filter chip */}
        {selectedCity && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filtered by city:</span>
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-0.5 text-xs font-semibold">
              <Building2 className="size-3" />
              {selectedCityLabel}
              <button type="button" onClick={() => setSelectedCity("")} aria-label="Clear filter">
                <X className="size-3 hover:text-destructive transition-colors" />
              </button>
            </span>
          </div>
        )}

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : lots.length === 0 ? (
          <EmptyState
            title={selectedCity ? `No parking lots found in ${selectedCityLabel}` : "No parking lots found"}
            description={selectedCity ? "Try selecting a different city or clear the filter." : "Parking lots will appear here once owners create them."}
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
                    {/* Header Row: Icon + Lot Name + Status Badge */}
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

                      <Badge
                        variant={lot.is_active ? "default" : "secondary"}
                        className={`shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${lot.is_active
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                          }`}
                      >
                        {lot.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* City tag */}
                    {lot.city && (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <Building2 className="size-3.5 shrink-0" />
                        <span>{lot.city}</span>
                        <span className="text-muted-foreground">· Kayin State</span>
                      </div>
                    )}

                    {/* Owner Profile Snippet Card */}
                    {lot.owner ? (
                      <div className="rounded bg-muted/40 border border-border/60 p-3 space-y-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          {(lot.owner.user as any)?.profile_image || (lot.owner.user as any)?.profile_image_url ? (
                            <img
                              src={(lot.owner.user as any)?.profile_image || (lot.owner.user as any)?.profile_image_url}
                              alt={lot.owner.company_name || "Company"}
                              className="size-8 rounded-full object-cover border border-primary/30 shrink-0"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {(lot.owner.company_name || lot.owner.user?.name || "C").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground flex items-center gap-1.5 truncate">
                              <Briefcase className="size-3.5 text-primary shrink-0" />
                              <span className="truncate">{lot.owner.company_name || "Company Not Set"}</span>
                            </p>
                            {lot.owner.user?.name && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                                <User className="size-3 shrink-0" />
                                <span className="truncate">{lot.owner.user.name}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          {lot.owner.user?.email && (
                            <span className="flex items-center gap-1.5 truncate">
                              <Mail className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{lot.owner.user.email}</span>
                            </span>
                          )}
                          {(lot.owner.user as any)?.phone && (
                            <span className="flex items-center gap-1.5 truncate">
                              <Phone className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{(lot.owner.user as any).phone}</span>
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
