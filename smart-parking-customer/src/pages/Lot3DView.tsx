import { useEffect, useState, Suspense, useRef, useCallback } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Text, Box } from "@react-three/drei"
import * as THREE from "three"
import Navbar from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, RotateCw, AlertCircle, Maximize2, Minimize2,
  Sun, Moon, RefreshCw, Layers, Car, ParkingSquare,
} from "lucide-react"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { parkingSessionsApi } from "@/api/parkingSessions"
import type { ParkingLotOut } from "@/api/types"
import type { ParkingFloorOut } from "@/api/parkingFloors"
import type { ParkingSlotOut } from "@/api/types"

// Vibrant car palette
const CAR_PALETTE = [
  "#f43f5e", // Rose Red
  "#3b82f6", // Vibrant Blue
  "#eab308", // Bright Gold
  "#f8fafc", // Pure White
  "#94a3b8", // Silver Chrome
  "#f97316", // Neon Orange
  "#10b981", // Emerald Green
  "#a855f7", // Electric Purple
]

function adjustBrightness(hex: string, amount: number): string {
  const c = hex.replace("#", "")
  const n = parseInt(c, 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amount))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function WebGLFallback({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
      <div className="size-16 rounded bg-amber-500/10 flex items-center justify-center">
        <AlertCircle className="size-8 text-amber-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold mb-1">3D View Unavailable</h3>
        <p className="text-muted-foreground text-sm">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">Try Chrome or Firefox for WebGL support.</p>
      </div>
    </div>
  )
}

/** Car silhouette rendered from top-down */
function CarTopView({ slotId, bw, bl }: { slotId: number; bw: number; bl: number }) {
  const color = CAR_PALETTE[slotId % CAR_PALETTE.length]
  const darker = adjustBrightness(color, -45)

  return (
    <group>
      <Box args={[bw, 0.32, bl]} position={[0, 0.16, 0]}>
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.4} />
      </Box>
      <Box args={[bw * 0.76, 0.34, bl * 0.24]} position={[0, 0.17, -bl * 0.2]}>
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.85} roughness={0.05} />
      </Box>
      <Box args={[bw * 0.70, 0.34, bl * 0.19]} position={[0, 0.17, bl * 0.26]}>
        <meshStandardMaterial color="#0284c7" transparent opacity={0.8} roughness={0.05} />
      </Box>
      <Box args={[bw * 0.78, 0.35, bl * 0.35]} position={[0, 0.18, bl * 0.04]}>
        <meshStandardMaterial color={adjustBrightness(color, -20)} roughness={0.25} />
      </Box>
      <Box args={[0.19, 0.2, 0.4]} position={[-bw / 2 - 0.1, 0.16, -bl * 0.14]}>
        <meshStandardMaterial color={color} />
      </Box>
      <Box args={[0.19, 0.2, 0.4]} position={[bw / 2 + 0.1, 0.16, -bl * 0.14]}>
        <meshStandardMaterial color={color} />
      </Box>
      <Box args={[bw * 0.88, 0.28, 0.2]} position={[0, 0.14, -bl / 2 + 0.1]}>
        <meshStandardMaterial color={darker} roughness={0.5} />
      </Box>
      <Box args={[bw * 0.88, 0.28, 0.2]} position={[0, 0.14, bl / 2 - 0.1]}>
        <meshStandardMaterial color={darker} roughness={0.5} />
      </Box>
    </group>
  )
}

/** Dashed center-lane line with electric blue glow in night mode */
function DashedCenterLine({
  totalWidth, z, isNightMode,
}: { totalWidth: number; z: number; isNightMode: boolean }) {
  const dashLen = 1.5
  const dashGap = 1.0
  const count = Math.floor(totalWidth / (dashLen + dashGap))
  const startX = -(count * (dashLen + dashGap)) / 2 + dashLen / 2

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          args={[dashLen, 0.06, 0.16]}
          position={[startX + i * (dashLen + dashGap), 0.03, z]}
        >
          <meshStandardMaterial
            color={isNightMode ? "#38bdf8" : "#ffffff"}
            emissive={isNightMode ? "#0284c7" : "#ffffff"}
            emissiveIntensity={isNightMode ? 0.6 : 0.1}
          />
        </Box>
      ))}
    </>
  )
}

/** Animated highlight beacon for selected slot */
function SelectedSlotAnimation({ sw, sd, isOccupied }: { sw: number; sd: number; isOccupied?: boolean }) {
  const padMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const ringMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const labelRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)

  // Red for occupied slots, blue for available/reserved
  const selColor = isOccupied ? "#ef4444" : "#3b82f6"
  const selLabelColor = isOccupied ? "#fca5a5" : "#60a5fa"

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    if (padMatRef.current) {
      padMatRef.current.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.4
      padMatRef.current.opacity = 0.45 + Math.sin(t * 3) * 0.18
    }

    if (ringRef.current && ringMatRef.current) {
      const ringScale = 1 + ((t * 0.8) % 1) * 0.4
      const ringOpacity = Math.max(0, 1 - ((t * 0.8) % 1))
      ringRef.current.scale.set(ringScale, 1, ringScale)
      ringMatRef.current.opacity = ringOpacity * 0.7
    }

    if (labelRef.current) {
      labelRef.current.position.y = 1.8 + Math.sin(t * 3.5) * 0.2
    }
  })

  return (
    <>
      <Box args={[sw - 0.08, 0.05, sd - 0.08]} position={[0, 0.025, 0]}>
        <meshStandardMaterial
          ref={padMatRef}
          color={selColor}
          emissive={selColor}
          emissiveIntensity={0.7}
          transparent
          opacity={0.45}
        />
      </Box>

      <group ref={ringRef} position={[0, 0.05, 0]}>
        <Box args={[sw + 0.2, 0.04, sd + 0.2]}>
          <meshStandardMaterial
            ref={ringMatRef}
            color={selColor}
            emissive={selColor}
            emissiveIntensity={0.9}
            transparent
            opacity={0.7}
          />
        </Box>
      </group>

      <group ref={labelRef} position={[0, 1.8, -sd / 2 - 0.5]}>
        <Text fontSize={0.65} color={selLabelColor} anchorX="center" anchorY="middle" fontWeight="bold">
          Selected
        </Text>
      </group>
    </>
  )
}

/** Single parking slot with full rectangular frame + pad tile */
function ParkingSlot3D({
  slot, position, sw, sd, isNightMode, onClick, isHighlighted, isReserved,
}: {
  slot: ParkingSlotOut
  position: [number, number, number]
  sw: number
  sd: number
  isNightMode: boolean
  onClick: () => void
  isHighlighted: boolean
  isReserved?: boolean
}) {
  const isOccupied = slot.status === "OCCUPIED"
  const lw = 0.18
  const lh = 0.08

  // Red = Occupied (car present), Amber = Reserved (session active, no car yet), Green = Available
  const padColor = isOccupied
    ? (isNightMode ? "#dc2626" : "#ef4444")
    : isReserved
      ? (isNightMode ? "#d97706" : "#f59e0b")
      : (isNightMode ? "#059669" : "#10b981")

  const padEmissive = isOccupied
    ? (isNightMode ? "#b91c1c" : "#dc2626")
    : isReserved
      ? (isNightMode ? "#f59e0b" : "#d97706")
      : (isNightMode ? "#10b981" : "#10b981")

  const padEmissiveIntensity = isNightMode
    ? (isOccupied ? 0.1 : isReserved ? 0.6 : 0.35)
    : (isOccupied ? 0.1 : isReserved ? 0.4 : 0.1)

  const padOpacity = isNightMode
    ? (isOccupied ? 0.5 : isReserved ? 0.55 : 0.35)
    : (isOccupied ? 0.3 : isReserved ? 0.45 : 0.28)

  const frameEmissive = isHighlighted
    ? "#f59e0b"
    : isReserved
      ? "#fbbf24"
      : isNightMode
        ? "#38bdf8"
        : "#ffffff"

  const frameEmissiveIntensity = isHighlighted ? 0.8 : isReserved ? 0.5 : isNightMode ? 0.5 : 0.08

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer" }}
      onPointerOut={() => { document.body.style.cursor = "default" }}
    >
      {isHighlighted ? (
        <SelectedSlotAnimation sw={sw} sd={sd} isOccupied={isOccupied} />
      ) : (
        <Box args={[sw - 0.08, 0.04, sd - 0.08]} position={[0, 0.02, 0]}>
          <meshStandardMaterial
            color={padColor}
            emissive={padEmissive}
            emissiveIntensity={padEmissiveIntensity}
            transparent
            opacity={padOpacity}
          />
        </Box>
      )}

      {/* 4-sided full rectangle frame lines */}
      <Box args={[lw, lh, sd]} position={[-sw / 2, lh / 2, 0]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={frameEmissive}
          emissiveIntensity={frameEmissiveIntensity}
        />
      </Box>
      <Box args={[lw, lh, sd]} position={[sw / 2, lh / 2, 0]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={frameEmissive}
          emissiveIntensity={frameEmissiveIntensity}
        />
      </Box>
      <Box args={[sw, lh, lw]} position={[0, lh / 2, sd / 2]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={frameEmissive}
          emissiveIntensity={frameEmissiveIntensity}
        />
      </Box>
      <Box args={[sw, lh, lw]} position={[0, lh / 2, -sd / 2]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={frameEmissive}
          emissiveIntensity={frameEmissiveIntensity}
        />
      </Box>

      {/* Car silhouette */}
      {isOccupied && (
        <group position={[0, 0, 0]}>
          <CarTopView slotId={slot.id} bw={sw * 0.68} bl={sd * 0.76} />
        </group>
      )}

      {/* Slot number label */}
      {!isOccupied && (
        <Text
          position={[0, 0.35, 0]}
          fontSize={0.6}
          color={isHighlighted ? "#fbbf24" : isReserved ? "#fbbf24" : isNightMode ? "#f8fafc" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {slot.slot_number}
        </Text>
      )}
    </group>
  )
}

function ParkingFloor3D({
  floor, slots, y, floorIndex, isNightMode, onSlotClick, highlightedSlotId, reservedSlotIds,
}: {
  floor: ParkingFloorOut
  slots: ParkingSlotOut[]
  y: number
  floorIndex: number
  isNightMode: boolean
  onSlotClick: (s: ParkingSlotOut) => void
  highlightedSlotId: number | null
  reservedSlotIds: Set<number>
}) {
  const sw = 3.2
  const sd = 5.2
  const sg = 0.6
  const laneW = 6.0
  const spr = 5
  const floorPad = 2

  const bySection = slots.reduce((acc, slot) => {
    const sec = slot.section || "Main"
    if (!acc[sec]) acc[sec] = []
    acc[sec].push(slot)
    return acc
  }, {} as Record<string, ParkingSlotOut[]>)

  const sections = Object.entries(bySection)
  let zCursor = 0
  const sectionLayouts = sections.map(([name, secSlots]) => {
    const rows = Math.ceil(secSlots.length / spr)
    const layout = { name, secSlots, startZ: zCursor, rows }
    zCursor += rows * (sd + sg) + laneW
    return layout
  })

  const totalDepth = Math.max(zCursor, 10) + floorPad
  const totalWidth = spr * (sw + sg) + 4 + floorPad

  // Sleek night mode obsidian asphalt tint vs day mode slate asphalt
  const nightAsphalts = ["#090d16", "#0b0f19", "#0e1322", "#0a0e1c"]
  const dayAsphalts = ["#334155", "#374151", "#475569", "#3b4252"]

  const asphaltColor = isNightMode
    ? nightAsphalts[floorIndex % nightAsphalts.length]
    : dayAsphalts[floorIndex % dayAsphalts.length]

  return (
    <group position={[0, y, 0]}>
      {/* Asphalt base */}
      <Box args={[totalWidth, 0.12, totalDepth]} position={[0, 0, (totalDepth - floorPad) / 2]}>
        <meshStandardMaterial
          color={asphaltColor}
          roughness={isNightMode ? 0.9 : 0.8}
          metalness={isNightMode ? 0.15 : 0.05}
        />
      </Box>

      {/* Floor label in neon cyan for night mode */}
      <Text
        position={[-totalWidth / 2 - 0.8, 1.4, (totalDepth - floorPad) / 2]}
        fontSize={1.0}
        color={isNightMode ? "#38bdf8" : "#475569"}
        anchorX="right"
        anchorY="middle"
        fontWeight="bold"
      >
        {floor.floor_name || `F${floorIndex + 1}`}
      </Text>

      {/* Sections */}
      {sectionLayouts.map(({ name, secSlots, startZ, rows }) => {
        const slotsPerColumn = rows
        const rowWidth = spr * (sw + sg) - sg
        const sectionMidZ = startZ + (slotsPerColumn * (sd + sg)) / 2 + sd / 2
        const laneZ = startZ + slotsPerColumn * (sd + sg) + laneW / 2

        return (
          <group key={name}>
            <DashedCenterLine totalWidth={rowWidth + 1} z={laneZ} isNightMode={isNightMode} />
            {name !== "Main" && (
              <Text
                position={[-rowWidth / 2 - 0.3, 0.8, sectionMidZ]}
                fontSize={0.5}
                color={isNightMode ? "#94a3b8" : "#94a3b8"}
                anchorX="right"
                anchorY="middle"
                fontWeight="bold"
              >
                {name}
              </Text>
            )}

            {secSlots.map((slot, idx) => {
              const row = Math.floor(idx / spr)
              const col = idx % spr
              const x = (col - (spr - 1) / 2) * (sw + sg)
              const z = startZ + row * (sd + sg) + sd / 2
              return (
                <ParkingSlot3D
                  key={slot.id}
                  slot={slot}
                  position={[x, 0.06, z]}
                  sw={sw}
                  sd={sd}
                  isNightMode={isNightMode}
                  onClick={() => onSlotClick(slot)}
                  isHighlighted={slot.id === highlightedSlotId}
                  isReserved={reservedSlotIds.has(slot.id)}
                />
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

function Scene3D({
  floors, slotsByFloor, isNightMode, onSlotClick, highlightedSlotId, isAutoRotate, reservedSlotIds,
}: {
  floors: ParkingFloorOut[]
  slotsByFloor: Record<number, ParkingSlotOut[]>
  isNightMode: boolean
  onSlotClick: (s: ParkingSlotOut) => void
  highlightedSlotId: number | null
  isAutoRotate: boolean
  reservedSlotIds: Set<number>
}) {
  const { scene } = useThree()

  useEffect(() => {
    // Rich midnight navy background in night mode vs daylight soft slate
    scene.background = new THREE.Color(isNightMode ? "#050814" : "#f1f5f9")
    scene.fog = new THREE.FogExp2(isNightMode ? "#050814" : "#f1f5f9", 0.008)
  }, [isNightMode, scene])

  return (
    <>
      <ambientLight intensity={isNightMode ? 0.85 : 1.6} />

      <directionalLight
        position={[0, 60, 20]}
        intensity={isNightMode ? 0.7 : 2.0}
        color={isNightMode ? "#cbd5e1" : "#ffffff"}
        castShadow
      />

      {/* Night canopy LED lights & sodium streetlamp glow */}
      {isNightMode && (
        <>
          <pointLight position={[0, 30, 10]} intensity={2.2} color="#38bdf8" distance={60} />
          <pointLight position={[-18, 22, -10]} intensity={1.8} color="#818cf8" distance={50} />
          <pointLight position={[18, 22, 30]} intensity={1.8} color="#fbbf24" distance={50} />
          <pointLight position={[0, 15, -20]} intensity={1.5} color="#34d399" distance={45} />
        </>
      )}

      {!isNightMode && (
        <directionalLight position={[-20, 40, -20]} intensity={0.8} color="#fef08a" />
      )}

      <OrbitControls
        enableZoom
        enablePan
        enableRotate
        autoRotate={isAutoRotate}
        autoRotateSpeed={2.0}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={0}
      />

      <group>
        {floors.map((floor, index) => (
          <ParkingFloor3D
            key={floor.id}
            floor={floor}
            slots={slotsByFloor[floor.id] || []}
            y={index * 4}
            floorIndex={index}
            isNightMode={isNightMode}
            onSlotClick={onSlotClick}
            highlightedSlotId={highlightedSlotId}
            reservedSlotIds={reservedSlotIds}
          />
        ))}
      </group>
    </>
  )
}

/** Listens for WebGL context loss and triggers a Canvas remount for recovery */
function WebGLContextHandler({ onContextLost }: { onContextLost: () => void }) {
  const { gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement
    const handleLost = (e: Event) => { e.preventDefault(); onContextLost() }
    canvas.addEventListener("webglcontextlost", handleLost)
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost)
    }
  }, [gl, onContextLost])

  return null
}

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas")
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
    if (!gl) return false
    return true
  } catch {
    return false
  }
}

export default function Lot3DView() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const lotId = Number(id)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floors, setFloors] = useState<ParkingFloorOut[]>([])
  const [slotsByFloor, setSlotsByFloor] = useState<Record<number, ParkingSlotOut[]>>({})
  const [reservedSlotIds, setReservedSlotIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [webGLError, setWebGLError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNightMode, setIsNightMode] = useState(false)
  const [isAutoRotate, setIsAutoRotate] = useState(true)
  const [canvasKey, setCanvasKey] = useState(0)
  const [contextLost, setContextLost] = useState(false)
  const highlightedSlotId = searchParams.get("slotId") ? Number(searchParams.get("slotId")) : null

  const handleContextLost = useCallback(() => {
    setContextLost(true)
    setTimeout(() => {
      setCanvasKey(k => k + 1)
      setContextLost(false)
    }, 300)
  }, [])

  useEffect(() => {
    if (!checkWebGLSupport()) setWebGLError("WebGL is not supported in your browser")
  }, [])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) containerRef.current.requestFullscreen?.()
    else document.exitFullscreen?.()
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const handleSlotClick = (slot: ParkingSlotOut) => {
    navigate(`/slots/${slot.id}`)
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!Number.isFinite(lotId)) return
      try {
        const [lotData, floorsData, sessionsData] = await Promise.all([
          parkingLotsApi.get(lotId),
          parkingFloorsApi.list({ parking_lot_id: lotId, limit: 100 }),
          parkingSessionsApi.list({ limit: 1000 }).catch(() => []),
        ])
        setLot(lotData)
        const safeFloors = Array.isArray(floorsData) ? floorsData : []
        setFloors(safeFloors)
        // Build set of slot IDs with active/pending sessions
        const safeSessions = Array.isArray(sessionsData) ? sessionsData : []
        const activeIds = new Set<number>(
          safeSessions
            .filter((s) => s.status === "ACTIVE" || s.status === "PENDING")
            .map((s) => s.slot_id)
        )
        setReservedSlotIds(activeIds)
        const slotsData: Record<number, ParkingSlotOut[]> = {}
        await Promise.all(
          safeFloors.map(async (floor) => {
            const r = await parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
            slotsData[floor.id] = Array.isArray(r) ? r : []
          })
        )
        setSlotsByFloor(slotsData)
      } catch (e) { console.error(e) }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [lotId])

  const allSlots = Object.values(slotsByFloor).flat()
  const occupiedCount = allSlots.filter((s) => s.status === "OCCUPIED").length
  const reservedCount = allSlots.filter((s) => s.status !== "OCCUPIED" && reservedSlotIds.has(s.id)).length
  const availableCount = allSlots.filter((s) => s.status === "AVAILABLE" && !reservedSlotIds.has(s.id)).length

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Loading 3D view...</p>
      </div>
    </div>
  )
  if (!lot) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="text-center py-20 text-muted-foreground">Parking lot not found.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="icon" className="size-8 -ml-2" onClick={() => navigate(`/parking/${lotId}`)}>
                <ArrowLeft className="size-4" />
              </Button>
              <h1 className="text-xl font-bold">{lot.name}</h1>
              <Badge variant="outline" className="text-xs">3D View</Badge>
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              Interactive 3D parking lot · {floors.length} floor{floors.length !== 1 ? "s" : ""} · {allSlots.length} total slots
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={isNightMode ? "default" : "outline"} onClick={() => setIsNightMode(!isNightMode)} className="gap-2">
              {isNightMode ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {isNightMode ? "Day Mode" : "Night Mode"}
            </Button>
            <Button size="sm" variant={isAutoRotate ? "default" : "outline"} onClick={() => setIsAutoRotate(!isAutoRotate)} className="gap-2">
              <RotateCw className={`size-3.5 ${isAutoRotate ? "animate-spin" : ""}`} />
              {isAutoRotate ? "Stop" : "Rotate"}
            </Button>
            <Button size="sm" variant="outline" onClick={toggleFullscreen} className="gap-2">
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              {isFullscreen ? "Exit" : "Fullscreen"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded border p-3 flex items-center gap-3">
            <div className="size-9 rounded bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
              <Layers className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Floors</p>
              <p className="text-lg font-bold leading-tight">{floors.length}</p>
            </div>
          </div>
          <div className="rounded border p-3 flex items-center gap-3">
            <div className="size-9 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <ParkingSquare className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-bold leading-tight text-emerald-500">{availableCount}</p>
            </div>
          </div>
          <div className="rounded border p-3 flex items-center gap-3">
            <div className="size-9 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <RotateCw className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reserved</p>
              <p className="text-lg font-bold leading-tight text-amber-500">{reservedCount}</p>
            </div>
          </div>
          <div className="rounded border p-3 flex items-center gap-3">
            <div className="size-9 rounded bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
              <Car className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Occupied</p>
              <p className="text-lg font-bold leading-tight text-red-500">{occupiedCount}</p>
            </div>
          </div>
        </div>

        {/* 3D Canvas Container */}
        <div
          ref={containerRef}
          className={`relative w-full rounded overflow-hidden border shadow-xl transition-colors duration-300 ${isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none" : "h-[600px]"
            } ${isNightMode ? "bg-[#050814] border-slate-800" : "bg-slate-100 border-slate-200"}`}
        >
          {webGLError ? (
            <WebGLFallback message={webGLError} />
          ) : (
            <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading scene...</div>}>
              <Canvas
                key={canvasKey}
                camera={{ position: [0, 48, 22], fov: 42 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 1.5]}
                frameloop="always"
                onError={() => setWebGLError("Failed to initialize 3D rendering.")}
                onCreated={({ gl }) => {
                  const canvas = gl.domElement
                  const onLost = (e: Event) => { e.preventDefault(); handleContextLost() }
                  canvas.addEventListener("webglcontextlost", onLost)
                }}
              >
                <WebGLContextHandler onContextLost={handleContextLost} />
                <Scene3D
                  floors={floors}
                  slotsByFloor={slotsByFloor}
                  isNightMode={isNightMode}
                  onSlotClick={handleSlotClick}
                  highlightedSlotId={highlightedSlotId}
                  isAutoRotate={isAutoRotate}
                  reservedSlotIds={reservedSlotIds}
                />
              </Canvas>
            </Suspense>
          )}

          {/* Floating legend */}
          <div
            className={`absolute bottom-4 left-4 flex items-center gap-3 px-4 py-2 rounded text-xs font-medium backdrop-blur-md border transition-colors duration-300 ${isNightMode
              ? "bg-slate-950/80 border-slate-800 text-slate-100 shadow-xl"
              : "bg-white/80 border-slate-200 text-slate-800 shadow-md"
              }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`size-3 rounded inline-block shadow-sm ${isNightMode ? "bg-[#dc2626]" : "bg-[#ef4444]"}`} />
              Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`size-3 rounded inline-block ${isNightMode ? "bg-[#d97706] shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-[#f59e0b]"}`} />
              Reserved
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`size-3 rounded border inline-block ${isNightMode ? "border-emerald-400 bg-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "border-emerald-600 bg-emerald-500/30"
                  }`}
              />{" "}
              Available
            </span>
            {highlightedSlotId && (
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-[#3b82f6] inline-block shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> Selected
              </span>
            )}
            <span className={`hidden sm:block ml-1 ${isNightMode ? "text-slate-400" : "text-slate-500"}`}>
              Click a slot to view details
            </span>
          </div>
        </div>

        {/* Floor breakdown */}
        {floors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {floors.map((floor, index) => {
              const fSlots = slotsByFloor[floor.id] || []
              const avail = fSlots.filter((s) => s.status === "AVAILABLE" && !reservedSlotIds.has(s.id)).length
              const res = fSlots.filter((s) => s.status !== "OCCUPIED" && reservedSlotIds.has(s.id)).length
              const occ = fSlots.filter((s) => s.status === "OCCUPIED").length
              return (
                <div key={floor.id} className="rounded border p-4 space-y-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded">F{index + 1}</span>
                    <p className="font-semibold text-sm">{floor.floor_name || `Floor ${index + 1}`}</p>
                    <span className="text-xs text-muted-foreground ml-auto">{fSlots.length} slots</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-500 font-medium">{avail} free</span>
                    {res > 0 && <span className="text-amber-500 font-medium">{res} reserved</span>}
                    <span className="text-red-500 font-medium">{occ} occupied</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{ width: fSlots.length > 0 ? `${(avail / fSlots.length) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
