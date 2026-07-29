import { useState, useEffect, useRef, Suspense } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Text, Box } from "@react-three/drei"
import * as THREE from "three"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowLeft, AlertCircle, Sun, Moon, Maximize2, Minimize2,
  RotateCw, Layers, Hash, MapPin, ParkingSquare, Car
} from "lucide-react"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingLotsApi } from "@/api/parkingLots"
import { slotStatusTone } from "@/utils/statusColors"
import type { ParkingSlotOut, ParkingFloorOut, ParkingLotOut } from "@/types"

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
      <div className="size-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <AlertCircle className="size-8 text-amber-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold mb-1">3D View Unavailable</h3>
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  )
}

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

function DashedCenterLine({ totalWidth, z, isNightMode }: { totalWidth: number; z: number; isNightMode: boolean }) {
  const dashLen = 1.5
  const dashGap = 1.0
  const count = Math.floor(totalWidth / (dashLen + dashGap))
  const startX = -(count * (dashLen + dashGap)) / 2 + dashLen / 2

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} args={[dashLen, 0.06, 0.16]} position={[startX + i * (dashLen + dashGap), 0.03, z]}>
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

function SelectedSlotAnimation({ sw, sd }: { sw: number; sd: number }) {
  const padMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const ringMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const labelRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()

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
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.7}
          transparent
          opacity={0.45}
        />
      </Box>

      <group ref={ringRef} position={[0, 0.05, 0]}>
        <Box args={[sw + 0.2, 0.04, sd + 0.2]}>
          <meshStandardMaterial
            ref={ringMatRef}
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.9}
            transparent
            opacity={0.7}
          />
        </Box>
      </group>

      <group ref={labelRef} position={[0, 1.8, -sd / 2 - 0.5]}>
        <Text fontSize={0.65} color="#60a5fa" anchorX="center" anchorY="middle" fontWeight="bold">
          Target Slot
        </Text>
      </group>
    </>
  )
}

function ParkingSlot3D({
  slot, position, sw, sd, isNightMode, onClick, isHighlighted,
}: {
  slot: ParkingSlotOut
  position: [number, number, number]
  sw: number
  sd: number
  isNightMode: boolean
  onClick: () => void
  isHighlighted: boolean
}) {
  const isOccupied = slot.status === "OCCUPIED"
  const lw = 0.12
  const lh = 0.08

  const padColor = isOccupied
    ? (isNightMode ? "#dc2626" : "#ef4444")
    : (isNightMode ? "#059669" : "#10b981")

  const padEmissive = isOccupied
    ? (isNightMode ? "#b91c1c" : "#dc2626")
    : (isNightMode ? "#10b981" : "#10b981")

  const padOpacity = isNightMode ? (isOccupied ? 0.5 : 0.35) : (isOccupied ? 0.3 : 0.28)

  return (
    <group
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer" }}
      onPointerOut={() => { document.body.style.cursor = "default" }}
    >
      {isHighlighted ? (
        <SelectedSlotAnimation sw={sw} sd={sd} />
      ) : (
        <Box args={[sw - 0.08, 0.04, sd - 0.08]} position={[0, 0.02, 0]}>
          <meshStandardMaterial
            color={padColor}
            emissive={padEmissive}
            emissiveIntensity={isNightMode ? (isOccupied ? 0.1 : 0.35) : 0.1}
            transparent
            opacity={padOpacity}
          />
        </Box>
      )}

      <Box args={[lw, lh, sd]} position={[-sw / 2, lh / 2, 0]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={isHighlighted ? "#f59e0b" : isNightMode ? "#38bdf8" : "#ffffff"}
          emissiveIntensity={isHighlighted ? 0.8 : isNightMode ? 0.5 : 0.08}
        />
      </Box>
      <Box args={[lw, lh, sd]} position={[sw / 2, lh / 2, 0]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={isHighlighted ? "#f59e0b" : isNightMode ? "#38bdf8" : "#ffffff"}
          emissiveIntensity={isHighlighted ? 0.8 : isNightMode ? 0.5 : 0.08}
        />
      </Box>
      <Box args={[sw, lh, lw]} position={[0, lh / 2, sd / 2]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={isHighlighted ? "#f59e0b" : isNightMode ? "#38bdf8" : "#ffffff"}
          emissiveIntensity={isHighlighted ? 0.8 : isNightMode ? 0.5 : 0.08}
        />
      </Box>
      <Box args={[sw, lh, lw]} position={[0, lh / 2, -sd / 2]}>
        <meshStandardMaterial
          color={isNightMode ? "#e0f2fe" : "#ffffff"}
          emissive={isHighlighted ? "#f59e0b" : isNightMode ? "#38bdf8" : "#ffffff"}
          emissiveIntensity={isHighlighted ? 0.8 : isNightMode ? 0.5 : 0.08}
        />
      </Box>

      {isOccupied && (
        <group position={[0, 0, 0]}>
          <CarTopView slotId={slot.id} bw={sw * 0.68} bl={sd * 0.76} />
        </group>
      )}

      {!isOccupied && (
        <Text
          position={[0, 0.35, 0]}
          fontSize={0.6}
          color={isHighlighted ? "#fbbf24" : isNightMode ? "#f8fafc" : "#ffffff"}
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
  floor, slots, y, floorIndex, isNightMode, onSlotClick, highlightedSlotId,
}: {
  floor: ParkingFloorOut
  slots: ParkingSlotOut[]
  y: number
  floorIndex: number
  isNightMode: boolean
  onSlotClick: (s: ParkingSlotOut) => void
  highlightedSlotId: number | null
}) {
  const sw = 3.2
  const sd = 5.2
  const sg = 0.12
  const laneW = 6.0
  const spr = 5

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

  const totalDepth = Math.max(zCursor, 10)
  const totalWidth = spr * (sw + sg) + 4

  const nightAsphalts = ["#090d16", "#0b0f19", "#0e1322", "#0a0e1c"]
  const dayAsphalts = ["#334155", "#374151", "#475569", "#3b4252"]

  const asphaltColor = isNightMode
    ? nightAsphalts[floorIndex % nightAsphalts.length]
    : dayAsphalts[floorIndex % dayAsphalts.length]

  return (
    <group position={[0, y, 0]}>
      <Box args={[totalWidth, 0.12, totalDepth]} position={[0, 0, totalDepth / 2]}>
        <meshStandardMaterial
          color={asphaltColor}
          roughness={isNightMode ? 0.9 : 0.8}
          metalness={isNightMode ? 0.15 : 0.05}
        />
      </Box>

      <Text
        position={[-totalWidth / 2 - 0.8, 1.4, totalDepth / 2]}
        fontSize={1.0}
        color={isNightMode ? "#38bdf8" : "#475569"}
        anchorX="right"
        anchorY="middle"
        fontWeight="bold"
      >
        {floor.floor_name || `F${floorIndex + 1}`}
      </Text>

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
                />
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

function Slot3DScene({
  floors, slotsByFloor, isNightMode, highlightedSlotId, isAutoRotate,
}: {
  floors: ParkingFloorOut[]
  slotsByFloor: Record<number, ParkingSlotOut[]>
  isNightMode: boolean
  highlightedSlotId: number | null
  isAutoRotate: boolean
}) {
  const { scene } = useThree()

  useEffect(() => {
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
            onSlotClick={() => {}}
            highlightedSlotId={highlightedSlotId}
          />
        ))}
      </group>
    </>
  )
}

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas")
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null
    if (!gl) return false
    const loseContext = gl.getExtension("WEBGL_lose_context")
    if (loseContext) loseContext.loseContext()
    return true
  } catch {
    return false
  }
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
  const [isNightMode, setIsNightMode] = useState(false) // Default to Day Mode
  const [isAutoRotate, setIsAutoRotate] = useState(true) // Default to auto-rotate for 360 view

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
        const floorsData = await parkingFloorsApi.list({ parking_lot_id: lotData.id, limit: 100 })
        setFloors(floorsData.items)
        const slotsData: Record<number, ParkingSlotOut[]> = {}
        await Promise.all(floorsData.items.map(async (f) => {
          const r = await parkingSlotsApi.list({ floor_id: f.id, limit: 100 })
          slotsData[f.id] = r.items
        }))
        setSlotsByFloor(slotsData)
      } catch (e) { console.error(e) }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [id])

  if (isLoading) return <LoadingSpinner label="Loading slot details…" />
  if (!slot) return <EmptyState title="Slot not found" description="This slot may have been removed." />

  const isAvailable = slot.status === "AVAILABLE"

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" className="size-8 -ml-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-xl font-bold">Slot {slot.slot_number}</h1>
            <StatusBadge label={slot.status} tone={slotStatusTone(slot.status)} />
          </div>
          <p className="text-sm text-muted-foreground pl-8">
            {lot?.name} · {floor?.floor_name || `Floor ${floor?.id}`}
            {slot.section ? ` · Section ${slot.section}` : ""}
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <div className={`rounded-2xl border p-4 space-y-3 ${isAvailable ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <div className="flex items-center gap-3">
              <div className={`size-12 rounded-xl flex items-center justify-center ${isAvailable ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                {isAvailable ? <ParkingSquare className="size-6" /> : <Car className="size-6" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Status</p>
                <p className={`text-lg font-bold leading-tight ${isAvailable ? "text-emerald-500" : "text-red-500"}`}>
                  {isAvailable ? "Available" : "Occupied"}
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="pt-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slot Info</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Hash className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Slot Number</p>
                    <p className="text-sm font-semibold">{slot.slot_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Layers className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Floor</p>
                    <p className="text-sm font-semibold">{floor?.floor_name || `Floor ${floor?.id}`}</p>
                  </div>
                </div>
                {slot.section && (
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <MapPin className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Section</p>
                      <p className="text-sm font-semibold">{slot.section}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div
            ref={containerRef}
            className={`relative w-full rounded-2xl overflow-hidden border shadow-xl transition-colors duration-300 ${
              isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none" : "h-[560px]"
            } ${isNightMode ? "bg-[#050814] border-slate-800" : "bg-slate-100 border-slate-200"}`}
          >
            {webGLError ? (
              <WebGLFallback message={webGLError} />
            ) : (
              <Suspense fallback={<LoadingSpinner label="Loading scene…" />}>
                <Canvas
                  camera={{ position: [0, 40, 18], fov: 42 }}
                  gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
                  dpr={[1, 2]}
                  frameloop="always"
                  onError={() => setWebGLError("Failed to initialize 3D rendering.")}
                >
                  <Slot3DScene
                    floors={floors}
                    slotsByFloor={slotsByFloor}
                    isNightMode={isNightMode}
                    highlightedSlotId={id}
                    isAutoRotate={isAutoRotate}
                  />
                </Canvas>
              </Suspense>
            )}

            <div
              className={`absolute bottom-4 left-4 flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium backdrop-blur-md border transition-colors duration-300 ${
                isNightMode
                  ? "bg-slate-950/80 border-slate-800 text-slate-100 shadow-xl"
                  : "bg-white/80 border-slate-200 text-slate-800 shadow-md"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`size-3 rounded-sm ${isNightMode ? "bg-[#dc2626]" : "bg-[#ef4444]"}`} />
                Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`size-3 rounded-sm border ${
                    isNightMode ? "border-emerald-400 bg-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "border-emerald-600 bg-emerald-500/30"
                  }`}
                />{" "}
                Available
              </span>
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" /> Selected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
