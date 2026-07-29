import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, ExternalLink, Navigation2, AlertCircle } from "lucide-react"
import { parkingLotsApi } from "@/api/parkingLots"
import type { ParkingLotOut } from "@/types"

export function MapViewPage() {
  const { lotId } = useParams<{ lotId: string }>()
  const id = Number(lotId)
  const navigate = useNavigate()
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchLot = async () => {
      if (!Number.isFinite(id)) return
      try {
        const result = await parkingLotsApi.get(id)
        setLot(result)
      } catch (error) {
        console.error("Failed to fetch lot:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLot()
  }, [id])

  if (isLoading) return <LoadingSpinner label="Loading map…" />
  if (!lot) return <div className="text-center py-20 text-muted-foreground">Parking lot not found.</div>

  const mapUrl = lot.google_map_url
  let embedUrl: string | null = null

  if (mapUrl) {
    if (mapUrl.includes("<iframe")) {
      const m = mapUrl.match(/src="([^"]+)"/)
      if (m) embedUrl = m[1]
    } else if (mapUrl.includes("maps/embed")) {
      embedUrl = mapUrl
    } else {
      const m = mapUrl.match(/[?&]pb=([^&]+)/)
      if (m) embedUrl = `https://www.google.com/maps/embed?pb=${m[1]}`
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" className="size-8 -ml-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-xl font-bold">{lot.name}</h1>
            <Badge variant="outline" className="gap-1 text-xs">
              <MapPin className="size-3" /> Map View
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pl-8">
            {embedUrl ? "Real-time location on Google Maps" : "No map location configured for this parking lot"}
          </p>
        </div>
        {mapUrl && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => window.open(mapUrl, "_blank")}
          >
            <ExternalLink className="size-3.5" />
            Open in Google Maps
          </Button>
        )}
      </div>

      {/* Map area */}
      {embedUrl ? (
        <div className="relative w-full rounded-2xl overflow-hidden border border-border shadow-xl" style={{ height: 580 }}>
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`${lot.name} Map`}
          />

          {/* Overlay info card */}
          <div className="absolute top-4 left-4 rounded-xl border bg-background/90 backdrop-blur-md p-4 shadow-lg max-w-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                <Navigation2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{lot.name}</p>
                <p className="text-xs text-muted-foreground">Parking Lot</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`size-2 rounded-full shrink-0 ${lot.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-xs text-muted-foreground">{lot.is_active ? "Currently Active" : "Inactive"}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] rounded-2xl border border-dashed bg-muted/30 gap-5">
          <div className="size-16 rounded-2xl bg-slate-500/10 flex items-center justify-center">
            <AlertCircle className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm">No Map Location Available</p>
            <p className="text-muted-foreground text-xs mt-1 max-w-xs">
              The owner hasn't set a Google Maps URL for this parking lot yet. Contact the owner to add location information.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
