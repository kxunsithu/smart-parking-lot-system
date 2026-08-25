import { useEffect, useState } from "react"
import { Clock, MapPin, Navigation2, Search, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/layout/Navbar"
import { LocationTrackBar } from "@/components/parking/LocationTrackBar"
import { ParkingTrackModal } from "@/components/parking/ParkingTrackModal"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { useParkingStore } from "@/store/parkingStore"
import { useLanguage } from "@/lib/i18n"
import type { ParkingLotOut } from "@/api/types"
import { useNavigate } from "react-router-dom"
import { toast } from "@/components/ui/toaster"
import {
  loadSlotTrackContext,
  trackParkingSlot,
  type ParkingTrackTarget,
  type SlotTrackContext,
} from "@/lib/parkingTrack"

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { setParkingLots, activeSession, setActiveSession } = useParkingStore()
  const [lots, setLots] = useState<ParkingLotOut[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeSessionLocation, setActiveSessionLocation] = useState<SlotTrackContext | null>(null)
  const [activeNavigation, setActiveNavigation] = useState<ParkingTrackTarget | null>(null)

  useEffect(() => {
    loadParkingLots()
    loadActiveSession()
  }, [])

  useEffect(() => {
    if (!activeSession) {
      setActiveSessionLocation(null)
      return
    }

    let isMounted = true
    loadSlotTrackContext(activeSession.slot_id).then((context) => {
      if (isMounted) setActiveSessionLocation(context)
    })
    return () => {
      isMounted = false
    }
  }, [activeSession])

  const loadParkingLots = async () => {
    try {
      const response = await parkingLotsApi.list()
      setLots(response)
      setParkingLots(response)
    } catch {
      toast.error("Failed to load parking lots")
    } finally {
      setLoading(false)
    }
  }

  const loadActiveSession = async () => {
    try {
      const response = await parkingSessionsApi.list({ status: "active" })
      if (response.length > 0) {
        setActiveSession(response[0])
      }
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

  const filteredLots = lots.filter(
    (lot) =>
      (lot.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="space-y-4 w-full max-w-md px-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {activeSession && (
          <Card className="mb-6 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {t("sessions.active_title", "Active Parking Session")}
              </CardTitle>
              <CardDescription>
                Session #{activeSession.id} — track your slot or view session details.
              </CardDescription>
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

        <div>
          <h1 className="text-lg font-semibold text-foreground">{t("home.find_parking", "Find Parking")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("home.hero_subtitle", "Search and book parking spots near you")}
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search", "Search by name or location...")}
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map((lot) => (
            <Card key={lot.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{lot.name}</CardTitle>
                  <Badge variant={lot.is_active ? "default" : "secondary"}>
                    {lot.is_active ? t("common.open", "Open") : t("common.closed", "Closed")}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  {lot.google_map_url ? (
                    <button onClick={() => navigate(`/parking/${lot.id}`)} className="flex items-center text-primary hover:underline font-medium text-xs">
                      <MapPin className="h-4 w-4 mr-1" />
                      {t("parking.location_map", "View Location")}
                    </button>
                  ) : (
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {t("parking.location_map", "Location not specified")}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm py-1 border-t border-border/40">
                    <span className="text-muted-foreground">{t("common.rate", "Rate")}:</span>
                    <span className="font-semibold text-primary">
                      {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK / hr` : "Standard Rate"}
                    </span>
                  </div>
                  <Button
                    className="w-full font-medium"
                    disabled={!lot.is_active}
                    onClick={() => navigate(`/parking/${lot.id}`)}
                  >
                    {lot.is_active ? t("common.details", "Book Now") : t("common.closed", "Closed")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLots.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("home.active_lots", "No parking lots found")}</p>
          </div>
        )}
      </div>

      {activeNavigation && (
        <ParkingTrackModal
          slotNumber={activeNavigation.slotNumber}
          floorName={activeNavigation.floorName}
          lotName={activeNavigation.lotName}
          destLatitude={activeNavigation.latitude}
          destLongitude={activeNavigation.longitude}
          onClose={() => setActiveNavigation(null)}
        />
      )}
    </div>
  )
}
