import { useEffect, useState, Suspense, useRef } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Grid, Text, Box } from "@react-three/drei"
import * as THREE from "three"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCw, AlertCircle, Maximize, Minimize, Sun, Moon } from "lucide-react"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import type { ParkingLotOut, ParkingFloorOut, ParkingSlotOut } from "@/types"

const floorColors = [
  "#4f46e5", // Indigo
  "#0891b2", // Cyan
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Red
  "#7c3aed", // Violet
  "#db2777", // Pink
  "#2563eb", // Blue
]

// Helper function to adjust color brightness
function adjustColorBrightness(hex: string, amount: number): string {
  const color = hex.replace('#', '')
  const num = parseInt(color, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

function WebGLFallback({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <AlertCircle className="size-12 text-yellow-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">3D View Not Available</h3>
      <p className="text-muted-foreground text-sm">{message}</p>
      <p className="text-muted-foreground text-xs mt-2">Please try using a different browser or device.</p>
    </div>
  )
}

function Scene3D({ floors, slotsByFloor, isNightMode, onSlotClick, highlightedSlotId, isAutoRotate }: { floors: ParkingFloorOut[]; slotsByFloor: Record<number, ParkingSlotOut[]>; isNightMode: boolean; onSlotClick: (slot: ParkingSlotOut) => void; highlightedSlotId: number | null; isAutoRotate: boolean }) {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog(isNightMode ? "#0a0a0a" : "#f3f4f6", 10, 50)
    scene.background = new THREE.Color(isNightMode ? "#0a0a0a" : "#f3f4f6")
  }, [isNightMode, scene])

  return (
    <>
      <ambientLight intensity={isNightMode ? 0.2 : 0.6} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={isNightMode ? 0.5 : 1.2} 
        castShadow 
      />
      <pointLight position={[10, 10, 10]} intensity={isNightMode ? 0.3 : 1} />
      <pointLight position={[-10, 10, -10]} intensity={isNightMode ? 0.2 : 0.5} />
      
      <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} autoRotate={isAutoRotate} autoRotateSpeed={2} />
      
      <Grid 
        args={[30, 30]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor={isNightMode ? "#374151" : "#6b7280"} 
        sectionSize={5} 
        sectionThickness={1} 
        sectionColor={isNightMode ? "#4b5563" : "#9ca3af"} 
      />
      
      <group>
        {floors.map((floor, index) => (
          <ParkingFloor3D
            key={floor.id}
            floor={floor}
            slots={slotsByFloor[floor.id] || []}
            y={index * 4}
            floorColor={floorColors[index % floorColors.length]}
            isNightMode={isNightMode}
            onSlotClick={onSlotClick}
            highlightedSlotId={highlightedSlotId}
          />
        ))}
      </group>
    </>
  )
}

function ParkingSlot3D({ slot, position, isNightMode, onClick, isHighlighted }: { slot: ParkingSlotOut; position: [number, number, number]; isNightMode: boolean; onClick: () => void; isHighlighted: boolean }) {
  const statusColors: Record<string, string> = {
    AVAILABLE: isNightMode ? "#15803d" : "#22c55e",
    OCCUPIED: isNightMode ? "#b91c1c" : "#ef4444",
  }

  return (
    <group position={position} onClick={onClick}>
      <Box args={[2, isHighlighted ? 0.4 : 0.2, 3]}>
        <meshStandardMaterial 
          color={isHighlighted ? "#ff6b6b" : (statusColors[slot.status] || (isNightMode ? "#374151" : "#6b7280"))}
          emissive={isHighlighted ? "#ff6b6b" : undefined}
          emissiveIntensity={isHighlighted ? 0.5 : 0}
        />
      </Box>
      <Text
        position={[0, isHighlighted ? 0.7 : 0.5, 0]}
        fontSize={isHighlighted ? 0.7 : 0.5}
        color={isHighlighted ? "#ffffff" : (isNightMode ? "#e5e7eb" : "black")}
        anchorX="center"
        anchorY="middle"
      >
        {slot.slot_number}
      </Text>
      {isHighlighted && (
        <Text
          position={[0, 1.2, 0]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          ★
        </Text>
      )}
    </group>
  )
}

function ParkingFloor3D({ floor, slots, y, floorColor, isNightMode, onSlotClick, highlightedSlotId }: { floor: ParkingFloorOut; slots: ParkingSlotOut[]; y: number; floorColor: string; isNightMode: boolean; onSlotClick: (slot: ParkingSlotOut) => void; highlightedSlotId: number | null }) {
  const slotWidth = 2.5
  const slotDepth = 3.5
  const slotGap = 0.5
  const sectionGap = 2
  const slotsPerRow = 5

  // Group slots by section
  const slotsBySection = slots.reduce((acc, slot) => {
    const section = slot.section || 'No Section'
    if (!acc[section]) {
      acc[section] = []
    }
    acc[section].push(slot)
    return acc
  }, {} as Record<string, ParkingSlotOut[]>)

  const sections = Object.entries(slotsBySection)
  const sectionCount = sections.length

  // Calculate dynamic floor dimensions
  const floorWidth = slotsPerRow * (slotWidth + slotGap) + 4 // Add padding
  let totalDepth = 0
  sections.forEach(([_, sectionSlots]) => {
    const slotsPerColumn = Math.ceil(sectionSlots.length / slotsPerRow)
    totalDepth += slotsPerColumn * (slotDepth + slotGap)
  })
  totalDepth += (sectionCount - 1) * sectionGap + 4 // Add section gaps and padding

  return (
    <group position={[0, y, 0]}>
      {/* Floor base with dynamic size and floor color */}
      <Box args={[floorWidth, 0.3, totalDepth]}>
        <meshStandardMaterial color={isNightMode ? adjustColorBrightness(floorColor, -30) : floorColor} />
      </Box>

      {/* Floor label */}
      <Text
        position={[-floorWidth / 2 - 1, 1.5, 0]}
        fontSize={1.2}
        color={isNightMode ? "#ffffff" : "#000000"}
        anchorX="right"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor={isNightMode ? "#000000" : "#ffffff"}
      >
        {floor.floor_name || `Floor ${floor.id}`}
      </Text>

      {/* Section divider lines */}
      {sections.map(([sectionName, sectionSlots], sectionIndex) => {
        const slotsPerColumn = Math.ceil(sectionSlots.length / slotsPerRow)
        
        // Calculate section position
        let currentZ = -totalDepth / 2 + 2
        for (let i = 0; i < sectionIndex; i++) {
          const prevSectionSlots = sections[i][1]
          const prevSlotsPerColumn = Math.ceil(prevSectionSlots.length / slotsPerRow)
          currentZ += prevSlotsPerColumn * (slotDepth + slotGap) + sectionGap
        }
        
        const dividerZ = currentZ + slotsPerColumn * (slotDepth + slotGap) / 2 + sectionGap / 2
        const lineWidth = slotsPerRow * (slotWidth + slotGap)
        
        return (
          <group key={`divider-${sectionName}`}>
            {/* Single white divider line */}
            <Box 
              args={[lineWidth, 0.02, 0.15]} 
              position={[0, 0.16, dividerZ]}
            >
              <meshStandardMaterial color={isNightMode ? "#ffffff" : "#000000"} />
            </Box>
          </group>
        )
      })}

      {/* Sections */}
      {sections.map(([sectionName, sectionSlots], sectionIndex) => {
        const slotsPerColumn = Math.ceil(sectionSlots.length / slotsPerRow)
        
        // Calculate section position
        let currentZ = -totalDepth / 2 + 2
        for (let i = 0; i < sectionIndex; i++) {
          const prevSectionSlots = sections[i][1]
          const prevSlotsPerColumn = Math.ceil(prevSectionSlots.length / slotsPerRow)
          currentZ += prevSlotsPerColumn * (slotDepth + slotGap) + sectionGap
        }
        
        return (
          <group key={sectionName} position={[0, 0.3, currentZ]}>
            {/* Section label facing forward at the top */}
            <Text
              position={[0, 1, slotsPerColumn * (slotDepth + slotGap) / 2 + 1]}
              fontSize={0.7}
              color={isNightMode ? "#ffffff" : "#000000"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.015}
              outlineColor={isNightMode ? "#000000" : "#ffffff"}
            >
              {sectionName}
            </Text>
            
            {/* Parking space white line markings */}
            {sectionSlots.map((slot, slotIndex) => {
              const row = Math.floor(slotIndex / slotsPerRow)
              const col = slotIndex % slotsPerRow
              const x = (col - slotsPerRow / 2) * (slotWidth + slotGap) + slotWidth / 2
              const z = (row - slotsPerColumn / 2) * (slotDepth + slotGap) + slotDepth / 2
              
              return (
                <group key={`markings-${slot.id}`}>
                  {/* Left line */}
                  <Box args={[0.08, 0.02, slotDepth]} position={[x - slotWidth/2, 0.16, z]}>
                    <meshStandardMaterial color="#ffffff" />
                  </Box>
                  {/* Right line */}
                  <Box args={[0.08, 0.02, slotDepth]} position={[x + slotWidth/2, 0.16, z]}>
                    <meshStandardMaterial color="#ffffff" />
                  </Box>
                  {/* Bottom line */}
                  <Box args={[slotWidth, 0.02, 0.08]} position={[x, 0.16, z - slotDepth/2]}>
                    <meshStandardMaterial color="#ffffff" />
                  </Box>
                </group>
              )
            })}
            
            {/* Slots in this section */}
            {sectionSlots.map((slot, slotIndex) => {
              const row = Math.floor(slotIndex / slotsPerRow)
              const col = slotIndex % slotsPerRow
              const x = (col - slotsPerRow / 2) * (slotWidth + slotGap) + slotWidth / 2
              const z = (row - slotsPerColumn / 2) * (slotDepth + slotGap) + slotDepth / 2
              return <ParkingSlot3D key={slot.id} slot={slot} position={[x, 0, z]} isNightMode={isNightMode} onClick={() => onSlotClick(slot)} isHighlighted={slot.id === highlightedSlotId} />
            })}
          </group>
        )
      })}
    </group>
  )
}

export function Lot3DViewPage() {
  const { lotId } = useParams<{ lotId: string }>()
  const [searchParams] = useSearchParams()
  const id = Number(lotId)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floors, setFloors] = useState<ParkingFloorOut[]>([])
  const [slotsByFloor, setSlotsByFloor] = useState<Record<number, ParkingSlotOut[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [webGLError, setWebGLError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNightMode, setIsNightMode] = useState(false)
  const [isAutoRotate, setIsAutoRotate] = useState(false)
  const highlightedSlotId = searchParams.get('slotId') ? Number(searchParams.get('slotId')) : null

  // Check WebGL support
  useEffect(() => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      setWebGLError('WebGL is not supported in your browser')
    }
  }, [])

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Handle slot click
  const handleSlotClick = (slot: ParkingSlotOut) => {
    navigate(`/slots/${slot.id}`)
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!Number.isFinite(id)) return
      try {
        const [lotData, floorsData] = await Promise.all([
          parkingLotsApi.get(id),
          parkingFloorsApi.list({ parking_lot_id: id, limit: 100 }),
        ])
        setLot(lotData)
        setFloors(floorsData.items)

        // Fetch slots for each floor
        const slotsData: Record<number, ParkingSlotOut[]> = {}
        await Promise.all(
          floorsData.items.map(async (floor) => {
            const slotsResult = await parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
            slotsData[floor.id] = slotsResult.items
          })
        )
        setSlotsByFloor(slotsData)
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (isLoading) return <LoadingSpinner label="Loading 3D view..." />
  if (!lot) return <div>Parking lot not found</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${lot.name} - 3D View`}
        description="Interactive 3D visualization of parking lot"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsNightMode(!isNightMode)}>
              {isNightMode ? <Sun className="size-4 mr-2" /> : <Moon className="size-4 mr-2" />}
              {isNightMode ? "Light Mode" : "Night Mode"}
            </Button>
            <Button variant="outline" onClick={() => setIsAutoRotate(!isAutoRotate)}>
              <RotateCw className={`size-4 mr-2 ${isAutoRotate ? 'animate-spin' : ''}`} />
              {isAutoRotate ? "Stop Rotate" : "Auto Rotate"}
            </Button>
            <Button variant="outline" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="size-4 mr-2" /> : <Maximize className="size-4 mr-2" />}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCw className="size-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          </div>
        }
      />

      <div 
        ref={containerRef}
        className={`w-full rounded-lg overflow-hidden border transition-all ${isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none' : 'h-[600px]'} ${isNightMode ? 'bg-gray-900' : 'bg-gray-100'}`}
      >
        {webGLError ? (
          <WebGLFallback message={webGLError} />
        ) : (
          <Suspense fallback={<LoadingSpinner label="Loading 3D scene..." />}>
            <Canvas 
              camera={{ position: [15, 15, 15], fov: 50 }}
              gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
              dpr={[1, 2]}
              frameloop="demand"
              onError={(error) => {
                console.error('WebGL error:', error)
                setWebGLError('Failed to initialize 3D rendering. Please try refreshing the page.')
              }}
            >
              <Scene3D floors={floors} slotsByFloor={slotsByFloor} isNightMode={isNightMode} onSlotClick={handleSlotClick} highlightedSlotId={highlightedSlotId} isAutoRotate={isAutoRotate} />
            </Canvas>
          </Suspense>
        )}
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Occupied</span>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Floors</h3>
        <div className="flex flex-wrap gap-3">
          {floors.map((floor, index) => (
            <div key={floor.id} className="flex items-center gap-2 text-sm">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: floorColors[index % floorColors.length] }}
              />
              <span>{floor.floor_name || `Floor ${floor.id}`}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Slots</h3>
        <div className="space-y-3">
          {floors.map((floor, index) => {
            const floorSlots = slotsByFloor[floor.id] || []
            // Group slots by section
            const slotsBySection = floorSlots.reduce((acc, slot) => {
              const section = slot.section || 'No Section'
              if (!acc[section]) {
                acc[section] = []
              }
              acc[section].push(slot)
              return acc
            }, {} as Record<string, ParkingSlotOut[]>)

            return (
              <div key={floor.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: floorColors[index % floorColors.length] }}
                  />
                  <span className="font-medium text-sm">{floor.floor_name || `Floor ${floor.id}`}</span>
                  <span className="text-xs text-muted-foreground">
                    ({floorSlots.length} slots)
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(slotsBySection).map(([section, slots]) => (
                    <div key={section} className="bg-muted/30 rounded p-2">
                      <div className="text-xs font-medium mb-2 text-muted-foreground">
                        {section} ({slots.length})
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {slots.map((slot) => (
                          <div 
                            key={slot.id} 
                            className="flex items-center gap-2 p-2 rounded border bg-background text-xs"
                          >
                            <div 
                              className="w-2 h-2 rounded" 
                              style={{ 
                                backgroundColor: 
                                  slot.status === 'AVAILABLE' ? '#22c55e' :
                                  slot.status === 'OCCUPIED' ? '#ef4444' : '#6b7280'
                              }}
                            />
                            <span className="font-medium">{slot.slot_number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
