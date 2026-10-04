import { useState, useEffect, useRef, useCallback } from "react"
import * as tf from "@tensorflow/tfjs"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import { toast } from "sonner"
import {
  CameraOff,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  X,
  Play,
  Pause,
  Layers,
  Zap,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { parkingSlotsApi } from "@/api/parkingSlots"
import type { ParkingFloorOut, SlotStatus } from "@/types"

interface SlotROI {
  slotId: number
  slotNumber: string
  section?: string | null
  currentStatus: SlotStatus
  detectedStatus: SlotStatus
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

const VEHICLE_CLASSES = ["car", "truck", "bus", "motorcycle"]

interface FloorCameraScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  floor: ParkingFloorOut | null
  parkingLotName?: string
  onSlotsUpdated?: () => void
}

export function FloorCameraScannerModal({
  open,
  onOpenChange,
  floor,
  onSlotsUpdated,
}: FloorCameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const [slotROIs, setSlotROIs] = useState<SlotROI[]>([])
  const [isScanning, setIsScanning] = useState(true)
  const [autoSync, setAutoSync] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedRoiIndex, setSelectedRoiIndex] = useState<number | null>(null)
  const [detectedVehicleCount, setDetectedVehicleCount] = useState(0)
  const animFrameId = useRef<number | null>(null)
  const lastSyncTimeRef = useRef<number>(0)

  // ── 1. Load COCO-SSD Model ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    let isMounted = true
    setIsModelLoading(true)
    tf.ready()
      .then(() => cocoSsd.load({ base: "lite_mobilenet_v2" }))
      .then((m) => { if (isMounted) { setModel(m); setIsModelLoading(false) } })
      .catch((err) => {
        console.error("TF model load failed:", err)
        if (isMounted) {
          setIsModelLoading(false)
          toast.error("Failed to load AI model. Check internet connection.")
        }
      })
    return () => { isMounted = false }
  }, [open])

  // ── 2. Fetch Floor Slots → build grid ROIs ─────────────────────────────────
  const fetchFloorSlots = useCallback(async () => {
    if (!floor?.id) return
    try {
      const res = await parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
      const total = res.items.length
      const cols = total <= 4 ? 2 : total <= 9 ? 3 : 4
      const rows = Math.ceil(total / cols)
      const gridW = 90 / cols
      const gridH = 80 / rows
      setSlotROIs(
        res.items.map((slot, i) => ({
          slotId: slot.id,
          slotNumber: slot.slot_number,
          section: slot.section,
          currentStatus: slot.status as SlotStatus,
          detectedStatus: slot.status as SlotStatus,
          x: 5 + (i % cols) * gridW + 2,
          y: 8 + Math.floor(i / cols) * gridH + 2,
          width: gridW - 4,
          height: gridH - 4,
          confidence: 0,
        }))
      )
    } catch {
      toast.error("Failed to load floor slots from database.")
    }
  }, [floor?.id])

  useEffect(() => {
    if (open && floor?.id) fetchFloorSlots()
  }, [open, floor?.id, fetchFloorSlots])

  // ── 3. Camera Start / Stop ──────────────────────────────────────────────────
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setCameraError(null)
      if (videoRef.current?.srcObject) {
        ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const vids = devices.filter((d) => d.kind === "videoinput")
      setAvailableDevices(vids)
      const target = deviceId ?? vids[0]?.deviceId
      if (target) setSelectedDeviceId(target)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: target
          ? { deviceId: { exact: target }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsCameraActive(true)
      }
    } catch (err: any) {
      setCameraError(err?.message ?? "Unable to access camera. Check browser permissions.")
      setIsCameraActive(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    setIsCameraActive(false)
  }, [])

  useEffect(() => {
    if (open) startCamera()
    else stopCamera()
    return stopCamera
  }, [open, startCamera, stopCamera])

  // ── 4. Detection Loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !isCameraActive || !model || !isScanning) return
    let active = true

    const loop = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState !== 4 || !active) {
        if (active) animFrameId.current = requestAnimationFrame(loop)
        return
      }

      const W = video.clientWidth || video.videoWidth || 640
      const H = video.clientHeight || video.videoHeight || 360
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext("2d")!
      ctx.clearRect(0, 0, W, H)

      try {
        const preds = await model.detect(video, 10, 0.35)
        const vehicles = preds.filter((p) => VEHICLE_CLASSES.includes(p.class.toLowerCase()))
        setDetectedVehicleCount(vehicles.length)

        // Draw vehicle boxes
        const sx = W / video.videoWidth
        const sy = H / video.videoHeight
        vehicles.forEach((pred) => {
          const [vx, vy, vw, vh] = pred.bbox
          const x = vx * sx, y = vy * sy, w = vw * sx, h = vh * sy
          ctx.setLineDash([4, 4])
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.strokeRect(x, y, w, h)
          ctx.fillStyle = "rgba(59,130,246,0.85)"
          ctx.fillRect(x, Math.max(0, y - 20), Math.min(110, w), 20)
          ctx.fillStyle = "#fff"
          ctx.font = "bold 11px sans-serif"
          ctx.fillText(`${pred.class} ${Math.round(pred.score * 100)}%`, x + 4, Math.max(14, y - 5))
        })

        // Update slot detections
        setSlotROIs((prev) => {
          let changed = false
          const next = prev.map((roi) => {
            const rx = (roi.x / 100) * W, ry = (roi.y / 100) * H
            const rw = (roi.width / 100) * W, rh = (roi.height / 100) * H
            const cx = rx + rw / 2, cy = ry + rh / 2
            let occupied = false, conf = 0
            for (const v of vehicles) {
              const [vx, vy, vw, vh] = v.bbox
              if (cx >= vx * sx && cx <= (vx + vw) * sx && cy >= vy * sy && cy <= (vy + vh) * sy) {
                occupied = true; conf = v.score; break
              }
            }
            const ds: SlotStatus = roi.currentStatus === "RESERVED" ? "RESERVED" : occupied ? "OCCUPIED" : "AVAILABLE"
            if (ds !== roi.detectedStatus || Math.abs(roi.confidence - conf) > 0.05) {
              changed = true
              return { ...roi, detectedStatus: ds, confidence: conf }
            }
            return roi
          })
          return changed ? next : prev
        })

        // Draw slot ROI overlays
        slotROIs.forEach((roi, idx) => {
          const rx = (roi.x / 100) * W, ry = (roi.y / 100) * H
          const rw = (roi.width / 100) * W, rh = (roi.height / 100) * H
          const isOcc = roi.detectedStatus === "OCCUPIED"
          const isRes = roi.detectedStatus === "RESERVED"
          const isSel = selectedRoiIndex === idx
          ctx.setLineDash([])
          ctx.lineWidth = isSel ? 3 : 2
          ctx.strokeStyle = isSel ? "#f59e0b" : isRes ? "#d97706" : isOcc ? "#ef4444" : "#10b981"
          ctx.fillStyle = isRes ? "rgba(217,119,6,0.15)" : isOcc ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.12)"
          ctx.fillRect(rx, ry, rw, rh)
          ctx.strokeRect(rx, ry, rw, rh)
          ctx.fillStyle = isRes ? "#d97706" : isOcc ? "#ef4444" : "#10b981"
          ctx.fillRect(rx, ry, Math.min(80, rw), 18)
          ctx.fillStyle = "#fff"
          ctx.font = "bold 10px sans-serif"
          ctx.fillText(roi.slotNumber, rx + 4, ry + 13)
        })

        // Auto-sync
        if (autoSync && Date.now() - lastSyncTimeRef.current > 4000) {
          lastSyncTimeRef.current = Date.now()
          applyDetectedStatuses(true)
        }
      } catch { /* ignore mid-frame errors */ }

      if (active) animFrameId.current = requestAnimationFrame(loop)
    }

    animFrameId.current = requestAnimationFrame(loop)
    return () => {
      active = false
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCameraActive, model, isScanning, autoSync, selectedRoiIndex, slotROIs])

  // ── 5. Apply to DB ─────────────────────────────────────────────────────────
  const applyDetectedStatuses = async (silent = false) => {
    try {
      setIsApplying(true)
      const changed = slotROIs.filter((r) => r.detectedStatus !== r.currentStatus && r.currentStatus !== "RESERVED")
      if (!changed.length) {
        if (!silent) toast.info("No slot status changes detected.")
        return
      }
      await Promise.all(changed.map((r) => parkingSlotsApi.updateStatus(r.slotId, r.detectedStatus)))
      setSlotROIs((prev) => prev.map((r) => ({ ...r, currentStatus: r.detectedStatus })))
      if (!silent) toast.success(`Updated ${changed.length} slot(s) in database!`)
      onSlotsUpdated?.()
    } catch {
      if (!silent) toast.error("Failed to update database slot statuses.")
    } finally {
      setIsApplying(false)
    }
  }

  const changedCount = slotROIs.filter(
    (r) => r.detectedStatus !== r.currentStatus && r.currentStatus !== "RESERVED"
  ).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[92vw] xl:max-w-6xl w-full p-0 gap-0 overflow-hidden rounded-xl bg-background border border-border/70 shadow-2xl"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="size-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">
                {floor?.floor_name ?? `Floor ${floor?.id}`} — AI Camera Scan
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Detect vehicles in real-time · update DB in one click
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-Sync toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border/70 text-xs">
              <Zap className="size-3 text-amber-500 fill-amber-500 shrink-0" />
              <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">Auto-Sync</span>
              <Switch
                id="auto-sync"
                checked={autoSync}
                onCheckedChange={setAutoSync}
                size="sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Body: Camera | Sidebar ───────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row h-[72vh] min-h-[440px] overflow-hidden">

          {/* ── Camera Panel ────────────────────────────────────────────────── */}
          <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden min-h-[240px]">

            {/* AI loading overlay */}
            {isModelLoading && (
              <div className="absolute inset-0 z-20 bg-slate-950/95 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="size-7 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Loading AI Model...</p>
                  <p className="text-slate-400 text-xs mt-1">TensorFlow.js MobileNet initializing</p>
                </div>
              </div>
            )}

            {cameraError ? (
              /* Camera error state */
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="size-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <CameraOff className="size-7 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-sm text-red-400">Camera Unavailable</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">{cameraError}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-800" onClick={() => startCamera()}>
                  <RefreshCw className="size-3.5" />
                  Retry Camera
                </Button>
              </div>
            ) : (
              /* Camera feed */
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />

                {/* Bottom status bar */}
                <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-t from-slate-950/90 to-transparent">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isScanning ? "bg-emerald-400" : "bg-slate-500"}`} />
                      <span className={`relative inline-flex rounded-full size-2 ${isScanning ? "bg-emerald-500" : "bg-slate-500"}`} />
                    </span>
                    <span className="text-white text-[11px] font-semibold">
                      {isScanning ? "Scanning" : "Paused"}
                    </span>
                    <Badge className="border-blue-500/40 text-blue-300 bg-blue-500/15 text-[10px] py-0 h-5 border">
                      {detectedVehicleCount} vehicle{detectedVehicleCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Camera switcher */}
                    {availableDevices.length > 1 && (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => startCamera(e.target.value)}
                        className="bg-slate-800/90 border border-slate-700 text-white text-[11px] rounded px-2 py-1 max-w-[130px] truncate"
                      >
                        {availableDevices.map((d, i) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Camera ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsScanning(!isScanning)}
                      className="h-7 text-[11px] gap-1 text-white hover:bg-white/15 px-2"
                    >
                      {isScanning ? <Pause className="size-3" /> : <Play className="size-3" />}
                      {isScanning ? "Pause" : "Resume"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────────── */}
          <div className="w-full lg:w-72 xl:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-border/60 bg-muted/5 shrink-0">

            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Slots ({slotROIs.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {slotROIs.filter((r) => r.detectedStatus === "AVAILABLE").length} Free
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                  {slotROIs.filter((r) => r.detectedStatus === "OCCUPIED").length} Taken
                </span>
              </div>
            </div>

            {/* Slot list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {slotROIs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No slots registered for this floor.
                </p>
              ) : (
                slotROIs.map((roi, idx) => {
                  const needsSync = roi.detectedStatus !== roi.currentStatus && roi.currentStatus !== "RESERVED"
                  return (
                    <div
                      key={roi.slotId}
                      onClick={() => setSelectedRoiIndex(selectedRoiIndex === idx ? null : idx)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                        selectedRoiIndex === idx
                          ? "border-amber-500 bg-amber-500/10"
                          : needsSync
                          ? "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/8"
                          : "border-border/50 bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: indicator + name */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`size-2 rounded-full shrink-0 ${
                            roi.detectedStatus === "AVAILABLE" ? "bg-emerald-500" :
                            roi.detectedStatus === "RESERVED" ? "bg-amber-500" : "bg-red-500"
                          }`} />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground leading-tight truncate">
                              {roi.slotNumber}
                              {roi.section && (
                                <span className="text-muted-foreground font-normal ml-1 text-[10px]">
                                  · {roi.section}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              DB: <span className="font-semibold text-foreground/80">{roi.currentStatus}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right: detected badge */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            roi.detectedStatus === "AVAILABLE"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                              : roi.detectedStatus === "RESERVED"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                              : "bg-red-500/10 border-red-500/30 text-red-600"
                          }`}>
                            {roi.detectedStatus === "AVAILABLE" ? "Free" : roi.detectedStatus === "RESERVED" ? "Reserved" : "Taken"}
                          </span>
                          {needsSync && (
                            <span className="text-[9px] text-blue-500 font-bold flex items-center gap-0.5">
                              <Sparkles className="size-2.5" />
                              Changed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Action button — always pinned at bottom */}
            <div className="p-3 border-t border-border/60 shrink-0">
              {changedCount > 0 && (
                <p className="text-[11px] text-blue-600 font-semibold text-center mb-2">
                  {changedCount} slot{changedCount !== 1 ? "s" : ""} ready to sync
                </p>
              )}
              <Button
                onClick={() => applyDetectedStatuses()}
                disabled={isApplying || slotROIs.length === 0}
                className="w-full gap-2 font-bold text-sm h-10"
              >
                {isApplying ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Apply to Database
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
