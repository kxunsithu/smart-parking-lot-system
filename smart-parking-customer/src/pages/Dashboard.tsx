import { useEffect, useState } from "react"
import {
  Clock, MapPin, Navigation2, Search,
  Building2, ChevronLeft, ChevronRight, X, Layers, Briefcase, User, Mail, Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { DataPagination } from "@/components/common/DataPagination"
import { LocationTrackBar } from "@/components/parking/LocationTrackBar"
import { ParkingTrackModal } from "@/components/parking/ParkingTrackModal"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { citiesApi, type CityOut } from "@/api/cities"
import { API_ORIGIN } from "@/api/client"
import { useParkingStore } from "@/store/parkingStore"
import { useAuthStore } from "@/store/authStore"
import { useLanguage } from "@/lib/i18n"
import { usePaginationState } from "@/hooks/usePaginationState"
import type { ApiMeta, ParkingLotOut } from "@/api/types"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "@/components/ui/toaster"
import {
  loadSlotTrackContext,
  trackParkingSlot,
  type ParkingTrackTarget,
  type SlotTrackContext,
} from "@/lib/parkingTrack"


export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  const { setPage, setSearch, search, params } = usePaginationState(9)
  const { setParkingLots, activeSession, setActiveSession } = useParkingStore()
  const [lots, setLots] = useState<ParkingLotOut[]>([])
  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [activeSessionLocation, setActiveSessionLocation] = useState<SlotTrackContext | null>(null)
  const [activeNavigation, setActiveNavigation] = useState<ParkingTrackTarget | null>(null)

  // Cities from API (with uploaded image files)
  const [dbCities, setDbCities] = useState<CityOut[]>([])
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get("city") ?? "")
  const [lotCountByCity, setLotCountByCity] = useState<Record<string, number>>({})

  useEffect(() => {
    loadCitiesAndCounts()
    loadActiveSession()
  }, [])

  useEffect(() => {
    if (!selectedCity) return
    loadParkingLots()
  }, [params, selectedCity])

  useEffect(() => {
    if (!activeSession) { setActiveSessionLocation(null); return }
    let isMounted = true
    loadSlotTrackContext(activeSession.slot_id).then((ctx) => {
      if (isMounted) setActiveSessionLocation(ctx)
    })
    return () => { isMounted = false }
  }, [activeSession])

  const getFullImageUrl = (path: string | null) => {
    if (!path) return null
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return `${API_ORIGIN}${path}`
  }

  const loadCitiesAndCounts = async () => {
    try {
      setLoading(true)
      // Fetch cities from API
      let apiCities: CityOut[] = []
      try {
        apiCities = await citiesApi.list({ is_active: true })
      } catch {
        apiCities = []
      }

      setDbCities(apiCities)

      // 2. Fetch lot counts for each city
      const counts: Record<string, number> = {}
      await Promise.all(
        apiCities.map(async (c) => {
          try {
            const res = await parkingLotsApi.list({ city: c.name, page: 1, limit: 1 })
            counts[c.name] = res.meta?.total ?? 0
          } catch {
            counts[c.name] = 0
          }
        })
      )
      setLotCountByCity(counts)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }

  const loadParkingLots = async () => {
    try {
      setIsFetching(true)
      const response = await parkingLotsApi.list({
        ...params,
        city: selectedCity,
      })
      setLots(response.items)
      setMeta(response.meta)
      setParkingLots(response.items)
    } catch {
      toast.error("Failed to load parking lots")
    } finally {
      setIsFetching(false)
    }
  }

  const loadActiveSession = async () => {
    const token = useAuthStore.getState().accessToken
    if (!token) return
    try {
      const response = await parkingSessionsApi.list({ status: "active" })
      if (response.length > 0) setActiveSession(response[0])
    } catch {
      console.error("Failed to load active session")
    }
  }

  const handleTrackActiveSession = () => {
    if (!activeSessionLocation) return
    trackParkingSlot(
      activeSessionLocation,
      { name: activeSessionLocation.lotName, google_map_url: activeSessionLocation.googleMapUrl },
      setActiveNavigation
    )
  }

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName)
    setLots([])
    setMeta(null)
  }

  const selectedCityObj = dbCities.find((c) => c.name === selectedCity)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Navigation Bar Modal when active navigation exists */}
        {activeNavigation && (
          <ParkingTrackModal
            target={activeNavigation}
            onClose={() => setActiveNavigation(null)}
          />
        )}

        {/* Active Session Notification Banner */}
        {activeSession && (
          <Card className="border-2 border-primary/30 bg-primary/5 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="bg-emerald-600 text-white flex items-center gap-1">
                  <Clock className="size-3 animate-pulse" />
                  {t("session.active", "Active Parking Session")}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  {t("session.started", "Started")}: {new Date(activeSession.start_time).toLocaleTimeString()}
                </span>
              </div>
              <CardTitle className="text-lg font-bold text-foreground mt-2">
                {t("session.current_slot", "Currently Parked")}
              </CardTitle>
              <CardDescription>Session #{activeSession.id} — track your slot or view session details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSessionLocation && (
                <LocationTrackBar
                  lotName={activeSessionLocation.lotName}
                  floorName={activeSessionLocation.floorName}
                  slotNumber={activeSessionLocation.slotNumber}
                  onTrack={handleTrackActiveSession}
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleTrackActiveSession} className="gap-2">
                  <Navigation2 className="h-4 w-4" />
                  {t("common.directions", "Track Parking")}
                </Button>
                <Button onClick={() => navigate("/sessions")}>
                  {t("common.details", "View Session")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── VIEW 1: City cards with uploaded image files ───────────────── */}
        {!selectedCity && (
          <div className="space-y-6">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Explore Locations</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {t("home.find_parking", "Cities in Kayin State (ကရင်ပြည်နယ်)")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dashboard.subtitle", "Select a township or city to explore available smart parking lots and reserve your slot.")}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 rounded bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dbCities.map((city) => {
                  const count = lotCountByCity[city.name] ?? 0
                  const imgUrl = getFullImageUrl(city.image_url)

                  return (
                    <button
                      key={city.id}
                      id={`city-card-${city.name.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => handleSelectCity(city.name)}
                      className={`
                        group relative flex flex-col justify-between overflow-hidden
                        rounded border border-border/80 bg-card
                        hover:border-primary/60 hover:shadow-xl hover:-translate-y-1
                        active:translate-y-0 transition-all duration-300 text-left
                        ${count === 0 ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      disabled={count === 0}
                    >
                      {/* Image Cover Container */}
                      <div className="relative h-64 w-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={city.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900">
                            <Building2 className="w-12 h-12 mb-2 text-primary/40" />
                            <span className="text-xs font-medium text-slate-400">Kayin State Township</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                        {/* Lot count badge */}
                        <div className="absolute top-3 right-3">
                          <Badge
                            className={
                              count > 0
                                ? "bg-primary text-primary-foreground font-bold shadow-md"
                                : "bg-black/60 text-slate-300 border-none"
                            }
                          >
                            {count} {count === 1 ? "Lot" : "Lots"}
                          </Badge>
                        </div>

                        {/* City name banner */}
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h3 className="text-xl font-bold tracking-tight leading-tight group-hover:text-primary transition-colors drop-shadow">
                            {city.name}
                          </h3>
                          {city.name_mm && (
                            <p className="text-sm font-medium text-amber-300 drop-shadow">
                              {city.name_mm}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* City description footer */}
                      <div className="p-4 bg-card/60 backdrop-blur-sm flex items-center justify-between">
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {city.description || "Browse available smart parking spaces and reserve slots."}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: Parking lots for selected city ────────────────────── */}
        {selectedCity && (
          <div className="space-y-6">
            {/* Header + Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedCity("")}
                  className="rounded-full shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">
                      {selectedCity}
                    </h1>
                    {selectedCityObj?.name_mm && (
                      <span className="text-lg font-semibold text-amber-500 dark:text-amber-400">
                        ({selectedCityObj.name_mm})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Showing parking lots in {selectedCity}
                    {meta ? ` (${meta.total} total)` : ""}
                  </p>
                </div>
              </div>

              {/* Search input within selected city */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search lots in this city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Lots Grid */}
            {isFetching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 rounded bg-muted/60 animate-pulse" />
                ))}
              </div>
            ) : lots.length === 0 ? (
              <Card className="border-dashed p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="p-4 bg-muted rounded-full text-muted-foreground">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-lg">No Parking Lots Found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No parking lots available in {selectedCity} matching your search.
                  </p>
                  <Button variant="outline" onClick={() => setSelectedCity("")}>
                    Back to All Cities
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lots.map((lot) => (
                  <Card
                    key={lot.id}
                    className="group flex flex-col justify-between overflow-hidden rounded border border-border/80 hover:border-primary/60 hover:shadow-xl transition-all duration-300"
                  >
                    <div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                          {lot.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          <span className="line-clamp-1 text-muted-foreground">{lot.city}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-4">
                        <div className="flex items-center justify-between text-sm py-2.5 px-3.5 bg-muted/40 rounded border border-border/40">
                          <span className="text-muted-foreground text-xs font-medium">Hourly Rate</span>
                          <span className="font-bold text-primary">
                            {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK / hr` : "—"}
                          </span>
                        </div>

                        {/* Company Info Snippet */}
                        {lot.owner ? (
                          <div className="rounded bg-muted/40 border border-border/50 p-3 space-y-2">
                            {/* Avatar + Company name row */}
                            <div className="flex items-center gap-2.5">
                              {lot.owner.user?.profile_image ? (
                                <img
                                  src={getFullImageUrl(lot.owner.user.profile_image)}
                                  alt={lot.owner.user.name}
                                  className="size-9 rounded-full object-cover border border-border/60 shrink-0"
                                />
                              ) : (
                                <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                  <Briefcase className="size-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                  {lot.owner.company_name || "Unknown Company"}
                                </p>
                                {lot.owner.user?.name && (
                                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                    <User className="size-2.5 shrink-0" />
                                    {lot.owner.user.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Contact details */}
                            <div className="flex items-center gap-2 pt-1">
                              {lot.owner.user?.email && (
                                <a
                                  href={`mailto:${lot.owner.user.email}`}
                                  title={`Email ${lot.owner.user.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded bg-background border border-border/60 text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                                >
                                  <Mail className="size-3.5" />
                                </a>
                              )}
                              {lot.owner.user?.phone && (
                                <a
                                  href={`tel:${lot.owner.user.phone}`}
                                  title={`Call ${lot.owner.user.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded bg-background border border-border/60 text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                                >
                                  <Phone className="size-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </div>

                    <div className="p-4 pt-0">
                      <Button
                        className="w-full rounded font-bold shadow-md cursor-pointer"
                        onClick={() => navigate(`/parking/${lot.id}`)}
                      >
                        View &amp; Book Slots
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta && meta.total_pages > 1 && (
              <div className="pt-4 flex justify-center">
                <DataPagination
                  page={meta.page}
                  totalPages={meta.total_pages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
