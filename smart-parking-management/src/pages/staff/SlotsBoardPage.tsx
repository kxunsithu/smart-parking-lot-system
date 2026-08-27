import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ParkingSquare, Box, Filter, RotateCcw, Search, Layers, MapPin, Car } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { CardGridSkeleton } from "@/components/common/LoadingBlock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dashboardApi } from "@/api/dashboard"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { getErrorMessage } from "@/api/client"
import type { ParkingSlotOut, SlotStatus, StaffDashboardOut, ParkingFloorOut, ParkingLotOut } from "@/types"
import type { ListResult } from "@/api/types"

export function SlotsBoardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<StaffDashboardOut | null>(null)
  const [parkingLot, setParkingLot] = useState<ParkingLotOut | null>(null)
  const [floorsData, setFloorsData] = useState<ListResult<ParkingFloorOut> | null>(null)
  const [slotData, setSlotData] = useState<ListResult<ParkingSlotOut>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  // Filter States
  const [selectedFloorId, setSelectedFloorId] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [slotSearchQuery, setSlotSearchQuery] = useState<string>("")

  const fetchDashboard = async () => {
    try {
      const result = await dashboardApi.staff()
      setDashboard(result)
    } catch (error) {
      console.error("Failed to fetch dashboard:", error)
    }
  }

  const fetchParkingLot = async () => {
    if (!dashboard?.parking_lot_id) return
    try {
      const result = await parkingLotsApi.get(dashboard.parking_lot_id)
      setParkingLot(result)
    } catch (error) {
      console.error("Failed to fetch parking lot:", error)
    }
  }

  const fetchFloors = async () => {
    if (!dashboard?.parking_lot_id) return
    try {
      const result = await parkingFloorsApi.list({ parking_lot_id: dashboard.parking_lot_id })
      setFloorsData(result)
    } catch (error) {
      console.error("Failed to fetch floors:", error)
    }
  }

  const fetchSlots = async () => {
    if (!dashboard?.parking_lot_id || !floorsData?.items) return
    try {
      const slotPromises = floorsData.items.map((floor) =>
        parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
      )
      const results = await Promise.all(slotPromises)
      setSlotData(results)
    } catch (error) {
      console.error("Failed to fetch slots:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: SlotStatus) => {
    try {
      setIsUpdating(true)
      await parkingSlotsApi.updateStatus(id, status)
      toast.success("Slot status updated.")
      fetchSlots()
      fetchDashboard()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  useEffect(() => {
    fetchParkingLot()
  }, [dashboard?.parking_lot_id])

  useEffect(() => {
    fetchFloors()
  }, [dashboard?.parking_lot_id])

  useEffect(() => {
    fetchSlots()
  }, [dashboard?.parking_lot_id, floorsData])

  const floors = floorsData?.items ?? []

  // Extract all unique available sections across all floors
  const availableSections = useMemo(() => {
    const sectionsSet = new Set<string>()
    slotData.forEach((res) => {
      res.items.forEach((s) => {
        if (s.section?.trim()) {
          sectionsSet.add(s.section.trim())
        }
      })
    })
    return Array.from(sectionsSet).sort((a, b) => a.localeCompare(b))
  }, [slotData])

  const isFiltered = selectedFloorId !== "all" || selectedSection !== "all" || slotSearchQuery.trim() !== ""

  const handleResetFilters = () => {
    setSelectedFloorId("all")
    setSelectedSection("all")
    setSlotSearchQuery("")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={parkingLot?.name || "Slots Board"}
        description="Check slot availability and update slot status in real time."
        actions={
          <Button variant="outline" onClick={() => navigate(`/3d/${dashboard?.parking_lot_id}`)} className="gap-2">
            <Box className="size-4" />
            3D View
          </Button>
        }
      />

      {/* ── Filter Controls Bar ── */}
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
                  { value: "all", label: `All Sections (${availableSections.length})` },
                  { value: "none", label: "No Section (—)" },
                  ...availableSections.map((sec) => ({ value: sec, label: `Section ${sec}` })),
                ]}
              >
                <SelectTrigger className="h-9 text-xs rounded gap-2">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-semibold">
                    All Sections ({availableSections.length})
                  </SelectItem>
                  <SelectItem value="none" className="text-xs">
                    No Section (—)
                  </SelectItem>
                  {availableSections.map((sec) => (
                    <SelectItem key={sec} value={sec} className="text-xs">
                      Section {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded shrink-0"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Slots Display ── */}
      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : floors.length === 0 ? (
        <EmptyState
          title="No floors found"
          description="Your parking lot doesn't have any floors set up yet."
          icon={ParkingSquare}
        />
      ) : (
        <div className="space-y-8">
          {floors
            .filter((floor) => selectedFloorId === "all" || String(floor.id) === selectedFloorId)
            .map((floor) => {
              const floorIndex = floors.findIndex((f) => f.id === floor.id)
              const rawSlots = slotData[floorIndex]?.items ?? []

              // Filter slots by query & section
              const filteredSlots = rawSlots.filter((slot) => {
                // 1. Search Query Match
                if (
                  slotSearchQuery.trim() &&
                  !slot.slot_number.toLowerCase().includes(slotSearchQuery.trim().toLowerCase())
                ) {
                  return false
                }
                // 2. Section Match
                if (selectedSection !== "all") {
                  if (selectedSection === "none") {
                    if (slot.section?.trim()) return false
                  } else {
                    if (slot.section?.trim().toLowerCase() !== selectedSection.toLowerCase()) return false
                  }
                }
                return true
              })

              // Group filtered slots by section
              const sectionMap = filteredSlots.reduce<Record<string, ParkingSlotOut[]>>((acc, slot) => {
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

              const availableTotal = filteredSlots.filter((s) => s.status === "AVAILABLE").length
              const occupiedTotal = filteredSlots.filter((s) => s.status === "OCCUPIED").length

              return (
                <Card key={floor.id} className="border border-border/80 shadow-sm rounded overflow-hidden">
                  <CardHeader className="flex-row items-center justify-between pb-3 border-b border-border/40">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-bold text-foreground">
                        {floor.floor_name || `Floor ${floor.id}`}
                      </CardTitle>
                      {filteredSlots.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium border border-emerald-500/20">
                            {availableTotal} Available
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium border border-red-500/20">
                            {occupiedTotal} Occupied
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-6">
                    {filteredSlots.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        {isFiltered ? "No slots match the current filter criteria on this floor." : "No slots on this floor."}
                      </p>
                    ) : (
                      sortedSections.map((section) => {
                        const sectionSlots = sectionMap[section]
                        const available = sectionSlots.filter((s) => s.status === "AVAILABLE").length
                        const occupied = sectionSlots.filter((s) => s.status === "OCCUPIED").length

                        return (
                          <div key={section} className="space-y-3">
                            {/* Section Header */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 px-3 py-1 rounded bg-muted border border-border/60">
                                <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                                  {section === "—" ? "No Section" : `Section ${section}`}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {sectionSlots.length} slots
                                </span>
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

                            {/* Slots Grid */}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                              {sectionSlots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className={`group relative flex flex-col gap-1 rounded border p-2.5 transition-all cursor-default ${slot.status === "AVAILABLE"
                                    ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                                    : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                                    }`}
                                >
                                  {/* Status Dot + Slot Number */}
                                  <div className="flex items-center gap-1.5 justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span
                                        className={`size-2 rounded-full shrink-0 ${slot.status === "AVAILABLE" ? "bg-emerald-500" : "bg-red-500"
                                          }`}
                                      />
                                      <span className="text-xs font-bold text-foreground truncate leading-none">
                                        {slot.slot_number}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="View 3D details"
                                      onClick={() => navigate(`/slots/${slot.id}`)}
                                    >
                                      <Box className="size-3" />
                                    </Button>
                                  </div>

                                  {/* Status Label */}
                                  <span
                                    className={`text-[9px] font-semibold uppercase tracking-wide ${slot.status === "AVAILABLE" ? "text-emerald-600" : slot.status === "RESERVED" ? "text-amber-600" : "text-red-600"
                                      }`}
                                  >
                                    {slot.status === "AVAILABLE" ? "Free" : slot.status === "RESERVED" ? "Reserved" : "Taken"}
                                  </span>

                                  {/* Physical Car Presence Quick Toggle Button */}
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(
                                        slot.id,
                                        slot.status === "AVAILABLE" || slot.status === "RESERVED" ? "OCCUPIED" : "AVAILABLE"
                                      )
                                    }
                                    disabled={isUpdating}
                                    className={`w-full mt-1 py-1 px-1.5 rounded text-[10px] font-bold transition-all border flex items-center justify-center gap-1 ${slot.status === "AVAILABLE" || slot.status === "RESERVED"
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                                      : "bg-red-500/10 border-red-500/30 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                                      }`}
                                    title={
                                      slot.status === "AVAILABLE" || slot.status === "RESERVED"
                                        ? "Click to mark car physically parked (OCCUPIED)"
                                        : "Click to mark slot physically empty (AVAILABLE)"
                                    }
                                  >
                                    <Car className="size-3 shrink-0" />
                                    <span>{slot.status === "AVAILABLE" ? "Mark Occupied" : "Mark Available"}</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
