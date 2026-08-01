import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Box, Filter, RotateCcw, Search, Layers, MapPin } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import type { ParkingFloorOut, ParkingLotOut, ParkingSlotOut } from "@/types"
import type { ListResult } from "@/api/types"

export function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>()
  const navigate = useNavigate()
  const id = Number(lotId)
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floorsData, setFloorsData] = useState<ListResult<ParkingFloorOut> | null>(null)
  const [isLoadingLot, setIsLoadingLot] = useState(true)
  const [isLoadingFloors, setIsLoadingFloors] = useState(true)

  // Filter States
  const [selectedFloorId, setSelectedFloorId] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [slotSearchQuery, setSlotSearchQuery] = useState<string>("")
  const [lotSections, setLotSections] = useState<string[]>([])

  const fetchLot = async () => {
    if (!Number.isFinite(id)) return
    try {
      const result = await parkingLotsApi.get(id)
      setLot(result)
    } catch (error) {
      console.error("Failed to fetch lot:", error)
    } finally {
      setIsLoadingLot(false)
    }
  }

  const fetchFloors = async () => {
    if (!Number.isFinite(id)) return
    try {
      const result = await parkingFloorsApi.list({ parking_lot_id: id, limit: 100 })
      setFloorsData(result)
    } catch (error) {
      console.error("Failed to fetch floors:", error)
    } finally {
      setIsLoadingFloors(false)
    }
  }

  useEffect(() => {
    fetchLot()
    fetchFloors()
  }, [id])

  const floors = floorsData?.items ?? []

  useEffect(() => {
    const items = floorsData?.items ?? []
    if (items.length === 0) return
    let cancelled = false
    ;(async () => {
      try {
        const results = await Promise.all(
          items.map((f) => parkingSlotsApi.list({ floor_id: f.id, limit: 100 }))
        )
        if (cancelled) return
        setLotSections(
          Array.from(
            new Set(
              results
                .flatMap((r) => r.items)
                .map((s) => s.section?.trim())
                .filter((s): s is string => Boolean(s))
            )
          ).sort((a, b) => a.localeCompare(b))
        )
      } catch (error) {
        console.error("Failed to fetch sections:", error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [floorsData])

  if (isLoadingLot) return <LoadingSpinner label="Loading parking lot..." />
  if (!lot) return <EmptyState title="Parking lot not found" description="This parking lot may have been removed." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={lot.name}
        description="Parking lot details (view only)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/3d/${lot.id}`)}>
              <Box className="size-4 mr-2" />
              3D View
            </Button>
            {lot.google_map_url && (
              <Button variant="outline" onClick={() => navigate(`/map/${lot.id}`)}>
                View on Map
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-6">
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-sm font-medium">{lot.is_active ? "Active" : "Inactive"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="mt-1 text-sm font-medium">{new Date(lot.created_at).toLocaleDateString()}</p>
          </div>
          {lot.owner && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Owner Company</p>
                <p className="mt-1 text-sm font-medium">{lot.owner.company_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owner Email</p>
                <p className="mt-1 text-sm font-medium">{lot.owner.user?.email || "-"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Filter Controls Bar ── */}
      {floors.length > 0 && (
        <Card className="border border-border/80 shadow-sm rounded">
          <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:justify-between flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider shrink-0">
              <Filter className="size-4 text-primary" />
              <span>Filter Slots:</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
              {/* Slot Number Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search slot number..."
                  value={slotSearchQuery}
                  onChange={(e) => setSlotSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded"
                />
              </div>

              {/* Floor Filter */}
              <div className="min-w-[150px]">
                <Select
                  value={selectedFloorId}
                  onValueChange={(val) => val && setSelectedFloorId(val)}
                  items={[
                    { value: "all", label: `All Floors (${floors.length})` },
                    ...floors.map((floor) => ({ value: String(floor.id), label: floor.floor_name || `Floor ${floor.id}` })),
                  ]}
                >
                  <SelectTrigger className="h-9 text-xs rounded gap-2">
                    <Layers className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Floors ({floors.length})
                    </SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor.id} value={String(floor.id)} className="text-xs">
                        {floor.floor_name || `Floor ${floor.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Section Filter */}
              <div className="min-w-[150px]">
                <Select
                  value={selectedSection}
                  onValueChange={(val) => val && setSelectedSection(val)}
                  items={[
                    { value: "all", label: `All Sections (${lotSections.length})` },
                    { value: "none", label: "No Section (—)" },
                    ...lotSections.map((sec) => ({ value: sec, label: `Section ${sec}` })),
                  ]}
                >
                  <SelectTrigger className="h-9 text-xs rounded gap-2">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Sections ({lotSections.length})
                    </SelectItem>
                    <SelectItem value="none" className="text-xs">
                      No Section (—)
                    </SelectItem>
                    {lotSections.map((sec) => (
                      <SelectItem key={sec} value={sec} className="text-xs">
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(selectedFloorId !== "all" || selectedSection !== "all" || slotSearchQuery.trim() !== "") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFloorId("all")
                    setSelectedSection("all")
                    setSlotSearchQuery("")
                  }}
                  className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded shrink-0"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-semibold tracking-tight">Floors</h2>

      {isLoadingFloors ? (
        <LoadingSpinner label="Loading floors..." />
      ) : floors.length === 0 ? (
        <EmptyState
          title="No floors yet"
          description="This parking lot has no floors configured."
        />
      ) : (
        <div className="space-y-4">
          {floors
            .filter((floor) => selectedFloorId === "all" || String(floor.id) === selectedFloorId)
            .map((floor) => (
              <FloorSection
                key={floor.id}
                floor={floor}
                navigate={navigate}
                selectedSection={selectedSection}
                slotSearchQuery={slotSearchQuery}
              />
            ))}
        </div>
      )}
    </div>
  )
}

function FloorSection({
  floor,
  navigate,
  selectedSection = "all",
  slotSearchQuery = "",
}: {
  floor: ParkingFloorOut
  navigate: (path: string) => void
  selectedSection?: string
  slotSearchQuery?: string
}) {
  const [slotsData, setSlotsData] = useState<ListResult<ParkingSlotOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSlots = async () => {
    try {
      const result = await parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
      setSlotsData(result)
    } catch (error) {
      console.error("Failed to fetch slots:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [floor.id])

  const rawSlots = slotsData?.items ?? []

  // Filter slots based on search query and section
  const slots = rawSlots.filter((slot) => {
    if (
      slotSearchQuery.trim() &&
      !slot.slot_number.toLowerCase().includes(slotSearchQuery.trim().toLowerCase())
    ) {
      return false
    }
    if (selectedSection !== "all") {
      if (selectedSection === "none") {
        if (slot.section?.trim()) return false
      } else {
        if (slot.section?.trim().toLowerCase() !== selectedSection.toLowerCase()) return false
      }
    }
    return true
  })

  // Group slots by section, unsectioned slots go to "—"
  const sectionMap = slots.reduce<Record<string, ParkingSlotOut[]>>((acc, slot) => {
    const key = slot.section?.trim() || "—"
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})
  const sortedSections = Object.keys(sectionMap).sort((a, b) => {
    if (a === "—") return 1
    if (b === "—") return -1
    return a.localeCompare(b)
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle>{floor.floor_name || `Floor ${floor.id}`}</CardTitle>
          {slots.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium border border-emerald-500/20">
                {slots.filter((s) => s.status === "AVAILABLE").length} Available
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium border border-red-500/20">
                {slots.filter((s) => s.status === "OCCUPIED").length} Occupied
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner label="Loading slots..." />
        ) : slots.length === 0 ? (
          <EmptyState
            title="No slots found"
            description="No parking slots match your filter on this floor."
          />
        ) : (
          <div className="space-y-5">
            {sortedSections.map((section) => {
              const sectionSlots = sectionMap[section]
              const available = sectionSlots.filter((s) => s.status === "AVAILABLE").length
              const occupied = sectionSlots.filter((s) => s.status === "OCCUPIED").length
              return (
                <div key={section}>
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-muted border border-border/60">
                      <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                        {section === "—" ? "No Section" : `Section ${section}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">{sectionSlots.length} slots</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium">
                      {available > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {available} free
                        </span>
                      )}
                      {occupied > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20">
                          {occupied} taken
                        </span>
                      )}
                    </div>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>

                  {/* Slots Grid — 5 compact columns */}
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {sectionSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`group relative flex flex-col gap-1 rounded border p-2.5 transition-all cursor-default ${slot.status === "AVAILABLE"
                          ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                          : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                          }`}
                      >
                        {/* Status dot + slot number */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`size-2 rounded-full shrink-0 ${slot.status === "AVAILABLE" ? "bg-emerald-500" : "bg-red-500"
                              }`}
                          />
                          <span className="text-xs font-bold text-foreground truncate leading-none">{slot.slot_number}</span>
                        </div>

                        {/* Status text */}
                        <span
                          className={`text-[9px] font-semibold uppercase tracking-wide ${slot.status === "AVAILABLE" ? "text-emerald-600" : "text-red-600"
                            }`}
                        >
                          {slot.status === "AVAILABLE" ? "Free" : "Taken"}
                        </span>

                        {/* View details button — shows on hover */}
                        <button
                          onClick={() => navigate(`/slots/${slot.id}`)}
                          className={`w-full mt-0.5 rounded py-1 text-[10px] font-semibold transition-all opacity-0 group-hover:opacity-100 border ${slot.status === "AVAILABLE"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20"
                            : "bg-red-500/10 border-red-500/30 text-red-700 hover:bg-red-500/20"
                            }`}
                        >
                          View Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
