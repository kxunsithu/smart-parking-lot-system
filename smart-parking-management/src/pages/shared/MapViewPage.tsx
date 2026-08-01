import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  MapPin,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { parkingLotsApi } from "@/api/parkingLots"
import type { ParkingLotOut } from "@/types"

/** Helper to robustly extract a valid iframe embed URL from any map string or <iframe ...> tag */
function getEmbedUrl(mapUrl?: string | null): string | null {
  if (!mapUrl) return null
  const str = mapUrl.trim()

  // 1. Raw <iframe src="..."> HTML string
  if (str.toLowerCase().includes("<iframe")) {
    const match = str.match(/src=["']([^"']+)["']/i)
    if (match && match[1]) return match[1]
  }

  // 2. Direct embed URL
  if (str.includes("maps/embed") || str.includes("output=embed")) {
    return str
  }

  // 3. pb parameter in URL
  if (str.includes("pb=")) {
    const match = str.match(/[?&]pb=([^&]+)/)
    if (match) return `https://www.google.com/maps/embed?pb=${match[1]}`
  }

  // 4. Standard HTTP/HTTPS link -> convert to embedded query
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(str)}&output=embed`
  }

  return null
}

export function MapViewPage() {
  const { lotId } = useParams<{ lotId: string }>()
  const id = Number(lotId)
  const navigate = useNavigate()

  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchLot = async () => {
      if (!Number.isFinite(id)) return
      try {
        const result = await parkingLotsApi.get(id)
        setLot(result)
      } catch (error) {
        console.error("Failed to fetch lot:", error)
        toast.error("Failed to load parking lot details.")
      } finally {
        setIsLoading(false)
      }
    }
    fetchLot()
  }, [id])

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  if (isLoading) return <LoadingSpinner label="Loading map…" />
  if (!lot) return <div className="text-center py-20 text-muted-foreground">Parking lot not found.</div>

  const embedUrl = getEmbedUrl(lot.google_map_url)

  return (
    <div className={`space-y-5 transition-all duration-200 ${isFullscreen ? "fixed inset-0 z-50 bg-background p-4 sm:p-6 overflow-hidden space-y-0 flex flex-col" : ""}`}>
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" className="size-8 -ml-2 hover:bg-muted/80" onClick={() => (isFullscreen ? setIsFullscreen(false) : navigate(-1))}>
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {lot.name}
              <Badge variant="outline" className="gap-1 text-xs">
                <MapPin className="size-3" /> Map View
              </Badge>
            </h1>
          </div>
          <p className="text-xs text-muted-foreground pl-8">
            {embedUrl ? "Location map embedded directly inside project" : "No Google Maps location set for this parking lot"}
          </p>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {embedUrl && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Map Container */}
      {embedUrl ? (
        <div
          ref={mapContainerRef}
          className={`relative w-full rounded overflow-hidden border border-border shadow-xl bg-slate-950 ${isFullscreen ? "flex-1 min-h-0" : "h-[620px]"
            }`}
        >
          {/* Iframe Base Map embedded inside web app */}
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`${lot.name} Map`}
            className="w-full h-full"
          />

          {/* FLOATING MAP TOOLBAR (Top Right HUD) */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="size-9 rounded border bg-background/90 hover:bg-background backdrop-blur-md shadow text-foreground"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>
      ) : (
        /* Styled Fallback State when Map URL is not set */
        <div className="flex flex-col items-center justify-center min-h-[460px] rounded border border-dashed border-border bg-muted/20 p-8 text-center space-y-4">
          <div className="size-16 rounded bg-muted flex items-center justify-center text-muted-foreground">
            <AlertCircle className="size-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-bold text-foreground">No Google Maps Location Set</h3>
            <p className="text-xs text-muted-foreground">
              The owner hasn't configured a Google Maps URL for <span className="font-semibold text-foreground">{lot.name}</span>.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="size-3.5" />
              Go Back
            </Button>
            <Button size="sm" onClick={() => navigate(`/admin/lots/${lot.id}`)} className="gap-2">
              <MapPin className="size-3.5" />
              Edit Lot Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
