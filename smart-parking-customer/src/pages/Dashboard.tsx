import { useEffect, useState } from "react"
import { Clock, MapPin, Search, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/layout/Navbar"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { useParkingStore } from "@/store/parkingStore"
import type { ParkingLotOut } from "@/api/types"
import { useNavigate } from "react-router-dom"
import { toast } from "@/components/ui/toaster"

export default function Dashboard() {
  const navigate = useNavigate()
  const { setParkingLots, activeSession, setActiveSession } = useParkingStore()
  const [lots, setLots] = useState<ParkingLotOut[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadParkingLots()
    loadActiveSession()
  }, [])

  const loadParkingLots = async () => {
    try {
      const response = await parkingLotsApi.list()
      setLots(response)
      setParkingLots(response)
    } catch (error) {
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
    } catch (error) {
      console.error("Failed to load active session")
    }
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
            <div className="h-8 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 bg-muted animate-pulse rounded-lg w-2/3" />
            <div className="h-32 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Session Banner */}
        {activeSession && (
          <Card className="mb-6 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Active Parking Session
              </CardTitle>
              <CardDescription>
                You have an active parking session. Click to view details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/sessions")}>
                View Session
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Parking</h1>
          <p className="text-muted-foreground">
            Search and book parking spots near you
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Parking Lots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map((lot) => (
            <Card key={lot.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{lot.name}</CardTitle>
                  <Badge variant={lot.is_active ? "default" : "secondary"}>
                    {lot.is_active ? "Open" : "Closed"}
                  </Badge>
                </div>
                <CardDescription className="flex items-center">
                  {lot.google_map_url ? (
                    <a href={lot.google_map_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                      <MapPin className="h-4 w-4 mr-1" />
                      View on Map
                    </a>
                  ) : (
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Location not specified
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    disabled={!lot.is_active}
                    onClick={() => navigate(`/parking/${lot.id}`)}
                  >
                    {lot.is_active ? "Book Now" : "Closed"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLots.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No parking lots found</p>
          </div>
        )}
      </div>
    </div>
  )
}
