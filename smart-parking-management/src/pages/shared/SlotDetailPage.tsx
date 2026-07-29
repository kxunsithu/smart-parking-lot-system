import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Suspense } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid, Text, Box } from "@react-three/drei"
import * as THREE from "three"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { EmptyState } from "@/components/common/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ArrowLeft, AlertCircle, Sun, Moon, Maximize, Minimize, RotateCw } from "lucide-react"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingLotsApi } from "@/api/parkingLots"
import { slotStatusTone } from "@/utils/statusColors"
import type { ParkingSlotOut, ParkingFloorOut, ParkingLotOut } from "@/types"

const floorColors = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#2563eb",
]

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
    </div>
  )
}

function Slot3DScene({ floors, slotsByFloor, isNightMode, highlightedSlotId, isAutoRotate }: { 
  floors: ParkingFloorOut[]; 
  slotsByFloor: Record<number, ParkingSlotOut[]>; 
  isNightMode: boolean; 
  highlightedSlotId: number | null;
  isAutoRotate: boolean
}) {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog(isNightMode ? "#0a0a0a" : "#f3f4f6", 10, 50)
    scene.background = new THREE.Color(isNightMode ? "#0a0a0a" : "#f3f4f6")
  }, [isNightMode, scene])

  return (
    <>
      <ambientLight intensity={isNightMode ? 0.2 : 0.6} />
      <directionalLight position={[10, 20, 10]} intensity={isNightMode ? 0.5 : 1.2} castShadow />
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
            highlightedSlotId={highlightedSlotId}
          />
        ))}
      </group>
    </>
  )
}

function ParkingSlot3D({ slot, position, isNightMode, isHighlighted }: { 
  slot: ParkingSlotOut; 
  position: [number, number, number]; 
  isNightMode: boolean; 
  isHighlighted: boolean 
}) {
  const statusColors: Record<string, string> = {
    AVAILABLE: isNightMode ? "#15803d" : "#22c55e",
    RESERVED: isNightMode ? "#a16207" : "#eab308",
    OCCUPIED: isNightMode ? "#b91c1c" : "#ef4444",
  }

  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  
  useFrame((state) => {
    if (isHighlighted && meshRef.current) {
      const time = state.clock.getElapsedTime()
      
      // Scale pulsing animation
      const scale = 1 + Math.sin(time * 3) * 0.15
      meshRef.current.scale.set(scale, 1, scale)
      
      // Emissive intensity pulsing for glow effect
      if (materialRef.current) {
        materialRef.current.emissiveIntensity = 0.4 + Math.sin(time * 4) * 0.3
      }
    }
  })

  return (
    <group position={position}>
      <Box 
        ref={meshRef}
        args={[2, isHighlighted ? 0.4 : 0.2, 3]}
      >
        <meshStandardMaterial 
          ref={materialRef}
          color={isHighlighted ? "#00BFFF" : (statusColors[slot.status] || (isNightMode ? "#374151" : "#6b7280"))}
          emissive={isHighlighted ? "#00BFFF" : undefined}
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
    </group>
  )
}

function ParkingFloor3D({ floor, slots, y, floorColor, isNightMode, highlightedSlotId }: { 
  floor: ParkingFloorOut; 
  slots: ParkingSlotOut[]; 
  y: number; 
  floorColor: string; 
  isNightMode: boolean; 
  highlightedSlotId: number | null 
}) {
  const slotWidth = 2.5
  const slotDepth = 3.5
  const slotGap = 0.5
  const sectionGap = 2
  const slotsPerRow = 5

  const slotsBySection = slots.reduce((acc, slot) => {
    const section = slot.section || 'No Section'
    if (!acc[section]) acc[section] = []
    acc[section].push(slot)
    return acc
  }, {} as Record<string, ParkingSlotOut[]>)

  const sections = Object.entries(slotsBySection)
  const sectionCount = sections.length

  const floorWidth = slotsPerRow * (slotWidth + slotGap) + 4
  let totalDepth = 0
  sections.forEach(([_, sectionSlots]) => {
    const slotsPerColumn = Math.ceil(sectionSlots.length / slotsPerRow)
    totalDepth += slotsPerColumn * (slotDepth + slotGap)
  })
  totalDepth += (sectionCount - 1) * sectionGap + 4

  return (
    <group position={[0, y, 0]}>
      <Box args={[floorWidth, 0.3, totalDepth]}>
        <meshStandardMaterial color={isNightMode ? adjustColorBrightness(floorColor, -30) : floorColor} />
      </Box>

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

      {sections.map(([sectionName, sectionSlots], sectionIndex) => {
        const slotsPerColumn = Math.ceil(sectionSlots.length / slotsPerRow)
        
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
            <Box args={[lineWidth, 0.02, 0.15]} position={[0, 0.16, dividerZ]}>
              <meshStandardMaterial color={isNightMode ? "#ffffff" : "#000000"} />
            </Box>
          </group>
        )
      })}

      {sections.map(([sectionName, sectionSlots], sectionIndex) => {
        const slotsPerColumn = Math.ceil(sectionSlots.length / slotsPerRow)
        
        let currentZ = -totalDepth / 2 + 2
        for (let i = 0; i < sectionIndex; i++) {
          const prevSectionSlots = sections[i][1]
          const prevSlotsPerColumn = Math.ceil(prevSectionSlots.length / slotsPerRow)
          currentZ += prevSlotsPerColumn * (slotDepth + slotGap) + sectionGap
        }
        
        return (
          <group key={sectionName} position={[0, 0.3, currentZ]}>
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
            
            {sectionSlots.map((slot, slotIndex) => {
              const row = Math.floor(slotIndex / slotsPerRow)
              const col = slotIndex % slotsPerRow
              const x = (col - slotsPerRow / 2) * (slotWidth + slotGap) + slotWidth / 2
              const z = (row - slotsPerColumn / 2) * (slotDepth + slotGap) + slotDepth / 2
              
              return (
                <group key={`markings-${slot.id}`}>
                  <Box args={[0.08, 0.02, slotDepth]} position={[x - slotWidth/2, 0.16, z]}>
                    <meshStandardMaterial color="#ffffff" />
                  </Box>
                  <Box args={[0.08, 0.02, slotDepth]} position={[x + slotWidth/2, 0.16, z]}>
                    <meshStandardMaterial color="#ffffff" />
                  </Box>
                  <Box args={[slotWidth, 0.02, 0.08]} position={[x, 0.16, z - slotDepth/2]}>
                    <meshStandardMaterial color="#ffffff" />
                  </Box>
                </group>
              )
            })}
            
            {sectionSlots.map((slot, slotIndex) => {
              const row = Math.floor(slotIndex / slotsPerRow)
              const col = slotIndex % slotsPerRow
              const x = (col - slotsPerRow / 2) * (slotWidth + slotGap) + slotWidth / 2
              const z = (row - slotsPerColumn / 2) * (slotDepth + slotGap) + slotDepth / 2
              return <ParkingSlot3D key={slot.id} slot={slot} position={[x, 0, z]} isNightMode={isNightMode} isHighlighted={slot.id === highlightedSlotId} />
            })}
          </group>
        )
      })}
    </group>
  )
}

export function SlotDetailPage() {
  const { slotId } = useParams<{ slotId: string }>()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const id = Number(slotId)
  const [slot, setSlot] = useState<ParkingSlotOut | null>(null)
  const [floor, setFloor] = useState<ParkingFloorOut | null>(null)
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floors, setFloors] = useState<ParkingFloorOut[]>([])
  const [slotsByFloor, setSlotsByFloor] = useState<Record<number, ParkingSlotOut[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [webGLError, setWebGLError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNightMode, setIsNightMode] = useState(false)
  const [isAutoRotate, setIsAutoRotate] = useState(false)

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

  useEffect(() => {
    const fetchData = async () => {
      if (!Number.isFinite(id)) return
      try {
        const slotData = await parkingSlotsApi.get(id)
        setSlot(slotData)

        const floorData = await parkingFloorsApi.get(slotData.floor_id)
        setFloor(floorData)

        const lotData = await parkingLotsApi.get(floorData.parking_lot_id)
        setLot(lotData)

        // Fetch all floors and slots for the lot
        const floorsData = await parkingFloorsApi.list({ parking_lot_id: lotData.id, limit: 100 })
        setFloors(floorsData.items)

        const slotsData: Record<number, ParkingSlotOut[]> = {}
        await Promise.all(
          floorsData.items.map(async (floor) => {
            const slotsResult = await parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
            slotsData[floor.id] = slotsResult.items
          })
        )
        setSlotsByFloor(slotsData)
      } catch (error) {
        console.error("Failed to fetch slot data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (isLoading) return <LoadingSpinner label="Loading slot details..." />
  if (!slot) return <EmptyState title="Slot not found" description="This slot may have been removed." />

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${lot?.name || 'Parking Lot'} - Slot ${slot.slot_number}`}
        description="Slot details and 3D location"
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
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Slot Number</p>
                <p className="mt-1 text-sm font-medium">{slot.slot_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Section</p>
                <p className="mt-1 text-sm font-medium">{slot.section || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Floor</p>
                <p className="mt-1 text-sm font-medium">{floor?.floor_name || `Floor ${floor?.id}` || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge label={slot.status} tone={slotStatusTone(slot.status)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div 
              ref={containerRef}
              className={`w-full rounded-lg overflow-hidden border transition-all h-[500px] ${isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-none' : ''} ${isNightMode ? 'bg-gray-900' : 'bg-gray-100'}`}
            >
              {webGLError ? (
                <WebGLFallback message={webGLError} />
              ) : (
                <Suspense fallback={<LoadingSpinner label="Loading 3D scene..." />}>
                  <Canvas 
                    camera={{ position: [15, 15, 15], fov: 50 }}
                    gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
                    dpr={[1, 2]}
                    frameloop="always"
                    onError={(error) => {
                      console.error('WebGL error:', error)
                      setWebGLError('Failed to initialize 3D rendering. Please try refreshing the page.')
                    }}
                  >
                    <Slot3DScene floors={floors} slotsByFloor={slotsByFloor} isNightMode={isNightMode} highlightedSlotId={id} isAutoRotate={isAutoRotate} />
                  </Canvas>
                </Suspense>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
