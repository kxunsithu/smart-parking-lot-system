import { useEffect, useState, useCallback } from "react"
import {
  Clock,
  DollarSign,
  Car,
  CheckCircle2,
  XCircle,
  ParkingCircle,
  Timer,
  CalendarDays,
  ChevronRight,
  TrendingUp,
  Zap,
  History,
  AlertCircle,
  Filter,
  CreditCard,
  Hourglass,
  MapPin,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/layout/Navbar"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { vehiclesApi } from "@/api/vehicles"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingLotsApi } from "@/api/parkingLots"
import { useParkingStore } from "@/store/parkingStore"
import type { ParkingSessionOut, VehicleOut } from "@/api/types"
import { toast } from "@/components/ui/toaster"
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours } from "date-fns"
import { useNavigate } from "react-router-dom"

type FilterTab = "all" | "active" | "finished"

function formatDuration(start: string, end?: string | null): string {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  const totalMins = differenceInMinutes(endDate, startDate)
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

function LiveTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(() => formatDuration(startTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatDuration(startTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return <span>{elapsed}</span>
}

// Confirmation modal for ending session
function EndSessionModal({
  session,
  vehiclePlate,
  onConfirm,
  onCancel,
  loading,
}: {
  session: ParkingSessionOut
  vehiclePlate: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const durationMins = differenceInMinutes(new Date(), new Date(session.start_time))
  const hours = Math.floor(durationMins / 60)
  const mins = durationMins % 60

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">End Session?</h3>
            <p className="text-xs text-muted-foreground">Session #{session.id}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-muted/60 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vehicle</span>
              <span className="font-medium">{vehiclePlate || `#${session.vehicle_id}`}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Started</span>
              <span className="font-medium">{format(new Date(session.start_time), "hh:mm a")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-primary">
                {hours > 0 ? `${hours}h ` : ""}{mins}m
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Your fee will be calculated based on the parking rate when you end the session.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Ending..." : "End Session"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Sessions() {
  const navigate = useNavigate()
  const { sessions, setSessions, setActiveSession } = useParkingStore()
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<VehicleOut[]>([])
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [endingSession, setEndingSession] = useState<ParkingSessionOut | null>(null)
  const [endLoading, setEndLoading] = useState(false)
  const [activeNavigation, setActiveNavigation] = useState<{
    slotNumber: string
    floorName: string
    lotName: string
    latitude: number
    longitude: number
  } | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const [sessionsRes, vehiclesRes] = await Promise.all([
        parkingSessionsApi.list(),
        vehiclesApi.list(),
      ])
      setSessions(sessionsRes)
      setVehicles(vehiclesRes)
      const active = sessionsRes.find((s: ParkingSessionOut) => s.status === "ACTIVE")
      if (active) setActiveSession(active)
      else setActiveSession(null)
    } catch {
      toast.error("Failed to load parking sessions")
    } finally {
      setLoading(false)
    }
  }, [setSessions, setActiveSession])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleFinishSession = async () => {
    if (!endingSession) return
    setEndLoading(true)
    try {
      await parkingSessionsApi.finish(endingSession.id)
      toast.success("Parking session ended successfully")
      setEndingSession(null)
      loadSessions()
    } catch {
      toast.error("Failed to end parking session")
    } finally {
      setEndLoading(false)
    }
  }

  const getVehiclePlate = (vehicleId: number) =>
    vehicles.find((v) => v.id === vehicleId)?.plate_number ?? ""

  const filteredSessions = sessions.filter((s) => {
    if (filterTab === "active") return s.status === "ACTIVE"
    if (filterTab === "finished") return s.status === "FINISHED"
    return true
  })

  // Stats
  const activeSessions = sessions.filter((s) => s.status === "ACTIVE")
  const finishedSessions = sessions.filter((s) => s.status === "FINISHED")
  const totalFee = finishedSessions.reduce((sum, s) => sum + (s.fee ?? 0), 0)
  const avgDuration =
    finishedSessions.length > 0
      ? Math.round(
          finishedSessions.reduce((sum, s) => {
            if (!s.end_time) return sum
            return sum + differenceInMinutes(new Date(s.end_time), new Date(s.start_time))
          }, 0) / finishedSessions.length
        )
      : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* End session confirmation modal */}
      {endingSession && (
        <EndSessionModal
          session={endingSession}
          vehiclePlate={getVehiclePlate(endingSession.vehicle_id)}
          onConfirm={handleFinishSession}
          onCancel={() => setEndingSession(null)}
          loading={endLoading}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Parking Sessions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sessions.length} total session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <ParkingCircle className="w-4 h-4" />
            Find Parking
          </button>
        </div>



        {activeSessions.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 p-5">
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl pointer-events-none" />

            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">Active Session</span>
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Session #{activeSessions[0].id} &bull;{" "}
                  {getVehiclePlate(activeSessions[0].vehicle_id) || `Vehicle #${activeSessions[0].vehicle_id}`}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Timer className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-bold text-primary tabular-nums">
                    <LiveTimer startTime={activeSessions[0].start_time} />
                  </span>
                  <span className="text-xs text-muted-foreground">elapsed</span>
                </div>
              </div>
              <button
                onClick={() => setEndingSession(activeSessions[0])}
                className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border border-destructive/20"
              >
                End
              </button>
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={<Zap className="w-4 h-4" />} label="Active" value={activeSessions.length.toString()} accent="green" />
            <StatCard icon={<History className="w-4 h-4" />} label="Completed" value={finishedSessions.length.toString()} accent="blue" />
            <StatCard icon={<DollarSign className="w-4 h-4" />} label="Total Fees" value={`${totalFee.toLocaleString()} MMK`} accent="purple" />
          </div>
        )}

        {sessions.length > 0 && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border w-fit">
            <Filter className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
            {(["all", "active", "finished"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterTab === tab
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {tab === "active" && activeSessions.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] font-bold">
                    {activeSessions.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Sessions list */}
        {filteredSessions.length === 0 ? (
          <EmptyState filterTab={filterTab} onNavigate={() => navigate("/dashboard")} />
        ) : (
          <div className="space-y-3">
            {filteredSessions
              .slice()
              .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
              .map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  vehiclePlate={getVehiclePlate(session.vehicle_id)}
                  onEnd={() => setEndingSession(session)}
                  onTrack={(loc) => setActiveNavigation(loc)}
                />
              ))}
          </div>
        )}
      </div>

      {activeNavigation && (
        <NavigationModal
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: "green" | "blue" | "yellow" | "purple"
}) {
  const accentClasses = {
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    yellow: "bg-primary/10 text-primary",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentClasses[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function SessionCard({
  session,
  vehiclePlate,
  onEnd,
  onTrack,
}: {
  session: ParkingSessionOut
  vehiclePlate: string
  onEnd: () => void
  onTrack: (location: {
    slotNumber: string
    floorName: string
    lotName: string
    latitude: number
    longitude: number
  }) => void
}) {
  const isActive = session.status === "ACTIVE"
  const startDate = new Date(session.start_time)

  interface LocationDetails {
    slotNumber: string
    floorName: string
    lotName: string
    googleMapUrl?: string | null
    latitude?: number | null
    longitude?: number | null
  }

  const [location, setLocation] = useState<LocationDetails | null>(null)

  useEffect(() => {
    let isMounted = true
    async function loadLocation() {
      try {
        const slot = await parkingSlotsApi.get(session.slot_id)
        const floor = await parkingFloorsApi.get(slot.floor_id)
        const lot = await parkingLotsApi.get(floor.parking_lot_id)
        if (isMounted) {
          setLocation({
            slotNumber: slot.slot_number,
            floorName: floor.floor_name || `Floor ${floor.id}`,
            lotName: lot.name,
            googleMapUrl: lot.google_map_url,
            latitude: slot.latitude,
            longitude: slot.longitude,
          })
        }
      } catch (e) {
        console.error("Failed to load location details for session", e)
      }
    }
    loadLocation()
    return () => {
      isMounted = false
    }
  }, [session.slot_id])

  return (
    <div
      className={`rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-md ${
        isActive ? "border-primary/30" : isPending ? "border-amber-400/40 bg-amber-500/5" : "border-border"
      }`}
    >
      {/* Top accent bar */}
      {isActive && <div className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" />}
      {isPending && <div className="h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />}

      <div className="p-4 sm:p-5">
        {/* Row 1: ID + status + badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isActive
                  ? "bg-primary/15 border border-primary/25"
                  : isPending
                  ? "bg-amber-500/15 border border-amber-400/25 text-amber-500"
                  : "bg-muted border border-border"
              }`}
            >
              {isActive ? (
                <Zap className="w-5 h-5 text-primary" />
              ) : isPending ? (
                <Hourglass className="w-5 h-5 text-amber-500 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">Session #{session.id}</p>
              <p className="text-xs text-muted-foreground">
                {format(startDate, "MMM d, yyyy")}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              isActive
                ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                : isPending
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            {isPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            {isActive ? "Active" : isPending ? "Pending Payment" : "Completed"}
          </span>
        </div>

        {/* Row 2: Details grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <DetailItem
            icon={<Car className="w-3.5 h-3.5" />}
            label="Vehicle"
            value={vehiclePlate || `#${session.vehicle_id}`}
          />
          <DetailItem
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Start time"
            value={format(startDate, "hh:mm a")}
          />
          <DetailItem
            icon={<Timer className="w-3.5 h-3.5" />}
            label="Duration"
            value={
              isActive ? (
                <span className="font-semibold text-primary">
                  <LiveTimer startTime={session.start_time} />
                </span>
              ) : (
                formatDuration(session.start_time, session.end_time)
              )
            }
          />
          {session.end_time && !isActive && (
            <DetailItem
              icon={<CalendarDays className="w-3.5 h-3.5" />}
              label="End time"
              value={format(new Date(session.end_time), "hh:mm a")}
            />
          )}
          {session.fee != null && (
            <DetailItem
              icon={<DollarSign className="w-3.5 h-3.5" />}
              label="Fee"
              value={
                <span className="font-semibold text-foreground">{session.fee.toLocaleString()} MMK</span>
              }
            />
          )}
          <DetailItem
            icon={<ParkingCircle className="w-3.5 h-3.5" />}
            label="Slot ID"
            value={`#${session.slot_id}`}
          />
        </div>

        {location && (
          <div className="mb-4 p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1">
                  Location
                </p>
                <p className="text-xs font-semibold text-foreground truncate">
                  {location.lotName} — {location.floorName} (Slot {location.slotNumber})
                </p>
              </div>
            </div>
            {isActive && (
              location.latitude != null && location.longitude != null ? (
                <button
                  onClick={() =>
                    onTrack({
                      slotNumber: location.slotNumber,
                      floorName: location.floorName,
                      lotName: location.lotName,
                      latitude: location.latitude!,
                      longitude: location.longitude!,
                    })
                  }
                  className="shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors border border-primary/20"
                >
                  Track
                </button>
              ) : location.googleMapUrl ? (
                <a
                  href={location.googleMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors border border-primary/20"
                >
                  Track
                </a>
              ) : (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.lotName + " Parking")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors border border-primary/20"
                >
                  Track
                </a>
              )
            )}
          </div>
        )}

        {/* Row 3: started ago / action */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            {isActive
              ? `Started ${formatDistanceToNow(startDate, { addSuffix: true })}`
              : `Parked ${formatDistanceToNow(startDate, { addSuffix: true })}`}
          </p>

          {isActive ? (
            <button
              onClick={onEnd}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors border border-destructive/20"
            >
              <XCircle className="w-3.5 h-3.5" />
              End Session
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Completed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  )
}

function EmptyState({
  filterTab,
  onNavigate,
}: {
  filterTab: FilterTab
  onNavigate: () => void
}) {
  const messages: Record<FilterTab, { title: string; desc: string }> = {
    all: {
      title: "No sessions yet",
      desc: "Find a parking lot and book your first session.",
    },
    active: {
      title: "No active sessions",
      desc: "You don't have any ongoing parking sessions right now.",
    },
    finished: {
      title: "No completed sessions",
      desc: "Completed sessions will appear here after you end them.",
    },
  }

  const msg = messages[filterTab]

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/80 border border-border flex items-center justify-center mb-4">
        <ParkingCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{msg.title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">{msg.desc}</p>
      {filterTab === "all" && (
        <button
          onClick={onNavigate}
          className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ParkingCircle className="w-4 h-4" />
          Find Parking
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function NavigationModal({
  slotNumber,
  floorName,
  lotName,
  destLatitude,
  destLongitude,
  onClose,
}: {
  slotNumber: string
  floorName: string
  lotName: string
  destLatitude: number
  destLongitude: number
  onClose: () => void
}) {
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [status, setStatus] = useState<"locating" | "success" | "error">("locating")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("error")
      setErrorMsg("Geolocation is not supported by your browser.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setStatus("success")
      },
      (error) => {
        console.error("Error getting location", error)
        setStatus("error")
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMsg("Location access denied by user.")
            break
          case error.POSITION_UNAVAILABLE:
            setErrorMsg("Location information is unavailable.")
            break
          case error.TIMEOUT:
            setErrorMsg("Request to get user location timed out.")
            break
          default:
            setErrorMsg("An unknown error occurred while getting location.")
            break
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  // Construct embed URL
  const embedUrl =
    status === "success" && origin
      ? `https://maps.google.com/maps?saddr=${origin.lat},${origin.lng}&daddr=${destLatitude},${destLongitude}&output=embed`
      : `https://maps.google.com/maps?q=${destLatitude},${destLongitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md md:p-6">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-card shadow-sm md:rounded-t-2xl">
        <div className="flex items-start gap-2 min-w-0">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MapPin className="size-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold leading-tight truncate">
              Live Routing to Slot #{slotNumber}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {lotName} — {floorName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status === "locating" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Locating you...
            </span>
          )}
          {status === "success" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              Auto-Directions Active
            </span>
          )}
          {status === "error" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
              {errorMsg || "Fallback: Destination Only"}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Exit Navigation
          </Button>
        </div>
      </div>

      {/* Main Map Navigation Screen */}
      <div className="flex-1 relative w-full overflow-hidden bg-muted md:rounded-b-2xl shadow-inner border border-t-0">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Slot Navigation"
        />

        {/* Small floating info card for smaller screens when status has warnings */}
        {status !== "success" && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto bg-card/90 backdrop-blur-md rounded-xl p-3 border shadow-lg text-xs space-y-1 max-w-sm">
            <p className="font-semibold flex items-center gap-1 text-foreground">
              {status === "locating" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  Finding your GPS location...
                </>
              ) : (
                <>
                  <AlertCircle className="size-3.5 text-amber-500" />
                  Using destination location only
                </>
              )}
            </p>
            <p className="text-muted-foreground">
              {status === "locating"
                ? "Showing slot address until GPS lock is established."
                : "Please enable location permission on your device to view automatic turn-by-turn routing directions."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
