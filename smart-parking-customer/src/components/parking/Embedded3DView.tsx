import { useEffect, useState, Suspense, useRef, useCallback } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Text, Box } from "@react-three/drei"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RotateCw, AlertCircle, Maximize2, Minimize2,
  Sun, Moon, Layers, Car, ParkingSquare,
} from "lucide-react"
import type { ParkingFloorOut } from "@/api/parkingFloors"
import type { ParkingSlotOut } from "@/api/types"
import { useTheme } from "next-themes"

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

/** Hero-style 3D Car model matching Customer Landing Hero Section SVG design */
function CarTopView({ slotId, bw, bl }: { slotId: number; bw: number; bl: number }) {
  const color = CAR_PALETTE[slotId % CAR_PALETTE.length]
  const isWhite = color === "#f8fafc" || color === "#ffffff"
  const isTaxi = (slotId % 5 === 2) || color === "#eab308"
  const darker = adjustBrightness(color, -40)

  const carW = bw * 0.82
  const carL = bl * 0.82

  return (
    <group position={[0, 0, 0]}>
      {/* Soft Ground Shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[carW * 1.15, carL * 1.1]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>

      {/* Main Car Body Chassis */}
      <Box args={[carW, 0.32, carL]} position={[0, 0.22, 0]}>
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.45} />
      </Box>

      {/* Front Hood Curve */}
      <Box args={[carW * 0.94, 0.18, carL * 0.28]} position={[0, 0.28, -carL * 0.34]}>
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.45} />
      </Box>

      {/* Cabin / Roof Structure */}
      <Box args={[carW * 0.78, 0.26, carL * 0.44]} position={[0, 0.44, carL * 0.02]}>
        <meshStandardMaterial color={isWhite ? "#f1f5f9" : darker} roughness={0.3} metalness={0.3} />
      </Box>

      {/* Front Windshield (Angled dark glass) */}
      <Box args={[carW * 0.74, 0.24, 0.08]} position={[0, 0.43, -carL * 0.2]} rotation={[0.4, 0, 0]}>
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} transparent opacity={0.9} />
      </Box>

      {/* Rear Window */}
      <Box args={[carW * 0.72, 0.22, 0.08]} position={[0, 0.43, carL * 0.23]} rotation={[-0.35, 0, 0]}>
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} transparent opacity={0.9} />
      </Box>

      {/* Side Windows */}
      <Box args={[carW * 0.81, 0.2, carL * 0.36]} position={[0, 0.44, carL * 0.02]}>
        <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.7} transparent opacity={0.85} />
      </Box>

      {/* Side Mirrors */}
      <Box args={[0.18, 0.12, 0.22]} position={[-carW / 2 - 0.08, 0.34, -carL * 0.15]}>
        <meshStandardMaterial color={color} roughness={0.3} />
      </Box>
      <Box args={[0.18, 0.12, 0.22]} position={[carW / 2 + 0.08, 0.34, -carL * 0.15]}>
        <meshStandardMaterial color={color} roughness={0.3} />
      </Box>

      {/* Front Headlights (Glow Amber/Yellow LED) */}
      <Box args={[carW * 0.24, 0.1, 0.08]} position={[-carW * 0.28, 0.26, -carL / 2 - 0.01]}>
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.9} />
      </Box>
      <Box args={[carW * 0.24, 0.1, 0.08]} position={[carW * 0.28, 0.26, -carL / 2 - 0.01]}>
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.9} />
      </Box>

      {/* Rear Taillights (Red LED) */}
      <Box args={[carW * 0.26, 0.08, 0.08]} position={[-carW * 0.28, 0.26, carL / 2 + 0.01]}>
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} />
      </Box>
      <Box args={[carW * 0.26, 0.08, 0.08]} position={[carW * 0.28, 0.26, carL / 2 + 0.01]}>
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.8} />
      </Box>

      {/* 4 Wheels */}
      <Box args={[0.14, 0.24, 0.44]} position={[-carW / 2 - 0.02, 0.12, -carL * 0.28]}>
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </Box>
      <Box args={[0.14, 0.24, 0.44]} position={[carW / 2 + 0.02, 0.12, -carL * 0.28]}>
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </Box>
      <Box args={[0.14, 0.24, 0.44]} position={[-carW / 2 - 0.02, 0.12, carL * 0.28]}>
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </Box>
      <Box args={[0.14, 0.24, 0.44]} position={[carW / 2 + 0.02, 0.12, carL * 0.28]}>
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </Box>

      {/* TAXI Roof Box Sign */}
      {isTaxi && (
        <group position={[0, 0.62, 0]}>
          <Box args={[carW * 0.45, 0.14, 0.22]}>
            <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={0.7} roughness={0.2} />
          </Box>
          <Text position={[0, 0, -0.12]} fontSize={0.1} color="#000000" fontWeight="bold" anchorX="center" anchorY="middle">
            TAXI
          </Text>
        </group>
      )}
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

  const nightAsphalts = ["#121215", "#18181b", "#1c1c20", "#141418"]
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

      {/* Floor label in brand amber for night mode */}
      <Text
        position={[-totalWidth / 2 - 0.8, 1.4, (totalDepth - floorPad) / 2]}
        fontSize={1.0}
        color={isNightMode ? "#FF8F00" : "#475569"}
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
    scene.background = new THREE.Color(isNightMode ? "#09090b" : "#f1f5f9")
    scene.fog = new THREE.FogExp2(isNightMode ? "#09090b" : "#f1f5f9", 0.008)
  }, [isNightMode, scene])

  return (
    <>
      <ambientLight intensity={isNightMode ? 0.95 : 1.6} />

      <directionalLight
        position={[0, 60, 20]}
        intensity={isNightMode ? 0.8 : 2.0}
        color={isNightMode ? "#fed7aa" : "#ffffff"}
        castShadow
      />

      {isNightMode && (
        <>
          <pointLight position={[0, 30, 10]} intensity={2.2} color="#FF8F00" distance={60} />
          <pointLight position={[-18, 22, -10]} intensity={1.8} color="#fbbf24" distance={50} />
          <pointLight position={[18, 22, 30]} intensity={1.8} color="#f59e0b" distance={50} />
          <pointLight position={[0, 15, -20]} intensity={1.5} color="#10b981" distance={45} />
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

export interface Embedded3DViewProps {
  floors: ParkingFloorOut[]
  slotsByFloor: Record<number, ParkingSlotOut[]>
  onSlotClick: (slot: ParkingSlotOut) => void
  highlightedSlotId?: number | null
}

export default function Embedded3DView({
  floors,
  slotsByFloor,
  onSlotClick,
  highlightedSlotId = null,
}: Embedded3DViewProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isNightMode = resolvedTheme === "dark"

  const containerRef = useRef<HTMLDivElement>(null)
  const [webGLError, setWebGLError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoRotate, setIsAutoRotate] = useState(true)
  const [canvasKey, setCanvasKey] = useState(0)

  const handleContextLost = useCallback(() => {
    setTimeout(() => {
      setCanvasKey((k) => k + 1)
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

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border shadow-lg transition-colors duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none" : "h-[340px] sm:h-[400px]"
      } ${isNightMode ? "bg-[#09090b] border-zinc-800" : "bg-card border-border"}`}
    >
      {/* Top Floating Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 backdrop-blur-md bg-background/60 p-1.5 rounded-xl border border-border/60 shadow-sm">
        <Button
          size="icon"
          variant="ghost"
          className="size-7 rounded-lg text-foreground hover:bg-accent"
          onClick={() => setTheme(isNightMode ? "light" : "dark")}
          title={isNightMode ? "Day Mode" : "Night Mode"}
        >
          {isNightMode ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={`size-7 rounded-lg text-foreground hover:bg-accent ${isAutoRotate ? "text-primary" : ""}`}
          onClick={() => setIsAutoRotate(!isAutoRotate)}
          title={isAutoRotate ? "Stop Rotation" : "Auto Rotate"}
        >
          <RotateCw className={`size-3.5 ${isAutoRotate ? "animate-spin" : ""}`} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 rounded-lg text-foreground hover:bg-accent"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Full View"}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </Button>
      </div>

      {webGLError ? (
        <WebGLFallback message={webGLError} />
      ) : (
        <Suspense fallback={<div className="flex items-center justify-center h-full text-xs text-muted-foreground">Loading 3D scene...</div>}>
          <Canvas
            key={canvasKey}
            camera={{ position: [0, 36, 18], fov: 45 }}
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
              onSlotClick={onSlotClick}
              highlightedSlotId={highlightedSlotId}
              isAutoRotate={isAutoRotate}
              reservedSlotIds={new Set()}
            />
          </Canvas>
        </Suspense>
      )}

      {/* Bottom Floating Legend */}
      <div
        className={`absolute bottom-3 left-3 z-10 flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[11px] font-medium backdrop-blur-md border transition-colors duration-300 ${
          isNightMode
            ? "bg-[#09090b]/85 border-zinc-800 text-zinc-100 shadow-md"
            : "bg-white/85 border-slate-200 text-slate-800 shadow-sm"
        }`}
      >
        <span className="flex items-center gap-1">
          <span className={`size-2.5 rounded-full ${isNightMode ? "bg-[#dc2626]" : "bg-[#ef4444]"}`} />
          Occupied
        </span>
        <span className="flex items-center gap-1">
          <span className={`size-2.5 rounded-full ${isNightMode ? "bg-[#d97706]" : "bg-[#f59e0b]"}`} />
          Reserved
        </span>
        <span className="flex items-center gap-1">
          <span className={`size-2.5 rounded-full ${isNightMode ? "bg-emerald-500" : "bg-emerald-500"}`} />
          Available
        </span>
      </div>
    </div>
  )
}
