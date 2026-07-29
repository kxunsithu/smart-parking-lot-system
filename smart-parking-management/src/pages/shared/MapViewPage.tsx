import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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

  if (isLoading) return <LoadingSpinner label="Loading map..." />
  if (!lot) return <div>Parking lot not found</div>

  const mapUrl = lot.google_map_url

  // Generate Google Maps embed URL
  let embedUrl: string | null = null
  
  if (mapUrl) {
    // If input contains iframe HTML, extract the src URL
    if (mapUrl.includes("<iframe")) {
      const srcMatch = mapUrl.match(/src="([^"]+)"/)
      if (srcMatch) {
        embedUrl = srcMatch[1]
      }
    } 
    // If the URL is already an embed URL, use it directly
    else if (mapUrl.includes("maps/embed")) {
      embedUrl = mapUrl
    } else {
      // Try to extract the pb parameter from regular Google Maps URL
      const pbMatch = mapUrl.match(/[?&]pb=([^&]+)/)
      if (pbMatch) {
        embedUrl = `https://www.google.com/maps/embed?pb=${pbMatch[1]}`
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${lot.name} - Map`}
        description="View parking lot location on map"
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        }
      />

      {embedUrl ? (
        <div className="w-full h-[600px] rounded-lg overflow-hidden border">
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
        </div>
      ) : (
        <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted">
          <p className="text-muted-foreground">No map location available for this parking lot</p>
        </div>
      )}
    </div>
  )
}
