import { useEffect, useState } from "react"
import { AlertCircle, Loader2, MapPin, Navigation2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ParkingTrackModal({
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

  const embedUrl =
    status === "success" && origin
      ? `https://maps.google.com/maps?saddr=${origin.lat},${origin.lng}&daddr=${destLatitude},${destLongitude}&output=embed`
      : `https://maps.google.com/maps?q=${destLatitude},${destLongitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md md:p-6">
      <div className="flex items-center justify-between p-4 border-b bg-card shadow-sm md:rounded-t-2xl">
        <div className="flex items-start gap-2 min-w-0">
          <div className="size-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
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

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex items-center justify-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold shadow-lg border border-slate-700 backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
            <Navigation2 className="size-3.5 text-indigo-400" />
            <span>Navigating to Slot #{slotNumber}</span>
          </div>
        </div>

        {status !== "success" && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-4 sm:right-auto bg-card/90 backdrop-blur-md rounded p-3 border shadow-lg text-xs space-y-1 max-w-sm">
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
