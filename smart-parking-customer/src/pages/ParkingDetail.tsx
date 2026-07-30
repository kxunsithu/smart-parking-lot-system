import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft, MapPin, RotateCw, Car as CarIcon, Clock, DollarSign,
  CheckCircle2, CreditCard, Loader2, CalendarDays, ChevronRight, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import Navbar from "@/components/layout/Navbar"
import { parkingLotsApi } from "@/api/parkingLots"
import { vehiclesApi } from "@/api/vehicles"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { useVehicleStore } from "@/store/vehicleStore"
import type { ParkingLotOut, VehicleOut, ParkingSlotOut, PaymentMethod } from "@/api/types"
import type { ParkingFloorOut } from "@/api/parkingFloors"
import { toast } from "@/components/ui/toaster"
import { differenceInMinutes, format, addHours } from "date-fns"

type BookingStep = "select" | "schedule" | "pay" | "success"

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "CASH", label: "Cash", icon: "💵" },
  { value: "KBZPAY", label: "KBZ Pay", icon: "📱" },
  { value: "WAVEPAY", label: "Wave Pay", icon: "🌊" },
  { value: "AYAPAY", label: "AYA Pay", icon: "💳" },
  { value: "UABPAY", label: "UAB Pay", icon: "🏦" },
]

function toLocalDatetimeValue(date: Date): string {
  // Returns "YYYY-MM-DDTHH:MM" for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toISOUTC(localDatetimeValue: string): string {
  return new Date(localDatetimeValue).toISOString()
}

function calcFee(start: string, end: string, ratePerHour: number): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const mins = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 60000))
  return Math.round((mins / 60) * ratePerHour * 100) / 100
}

export default function ParkingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { vehicles } = useVehicleStore()
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floors, setFloors] = useState<ParkingFloorOut[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingFloors, setLoadingFloors] = useState(true)
  const [step, setStep] = useState<BookingStep>("select")

  // Scheduling
  const defaultStart = toLocalDatetimeValue(new Date())
  const defaultEnd = toLocalDatetimeValue(addHours(new Date(), 2))
  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime] = useState(defaultEnd)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [previewFee, setPreviewFee] = useState<number>(0)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    if (id) {
      loadParkingLot(id)
      loadVehicles()
      loadFloors(parseInt(id))
    }
  }, [id])

  const loadParkingLot = async (lotId: string) => {
    try {
      const response = await parkingLotsApi.get(parseInt(lotId))
      setLot(response)
    } catch {
      toast.error("Failed to load parking lot details")
      navigate("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const loadVehicles = async () => {
    try {
      const response = await vehiclesApi.list()
      if (response?.length > 0) setSelectedVehicle(response[0].id)
    } catch {
      console.error("Failed to load vehicles")
    }
  }

  const loadFloors = async (lotId: number) => {
    try {
      const response = await parkingFloorsApi.list({ parking_lot_id: lotId, limit: 100 })
      setFloors(response)
    } catch {
      console.error("Failed to load floors")
    } finally {
      setLoadingFloors(false)
    }
  }

  // Step 1 → Step 2: validate selection then go to schedule
  const handleProceedToSchedule = () => {
    if (!selectedVehicle) { toast.error("Please select a vehicle"); return }
    if (!selectedSlot) { toast.error("Please select an available slot"); return }
    setStep("schedule")
  }

  // Step 2 → Step 3: validate times then go to payment
  const handleProceedToPayment = () => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()
    if (start <= now) { toast.error("Start time must be in the future"); return }
    if (end <= start) { toast.error("End time must be after start time"); return }
    const rate = lot?.rate_per_hour ?? 1000
    setPreviewFee(calcFee(toISOUTC(startTime), toISOUTC(endTime), rate))
    setStep("pay")
  }

  // Step 3: Book (directly creates ACTIVE session + PAID payment)
  const handleConfirmPayment = async () => {
    if (!lot || !selectedVehicle || !selectedSlot) return

    setBooking(true)
    try {
      await parkingSessionsApi.book({
        vehicle_id: selectedVehicle,
        slot_id: selectedSlot,
        start_time: toISOUTC(startTime),
        end_time: toISOUTC(endTime),
        payment_method: paymentMethod,
      })
      toast.success("Payment confirmed! Your parking session is now ACTIVE.")
      setStep("success")
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process booking and payment")
    } finally {
      setBooking(false)
    }
  }

  const effectiveRate = lot?.rate_per_hour ?? 1000
  const durationMins = (() => {
    const s = new Date(startTime), e = new Date(endTime)
    return e > s ? Math.ceil((e.getTime() - s.getTime()) / 60000) : 0
  })()

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!lot) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <p>Parking lot not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Parking Lots
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lot Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{lot.name}</CardTitle>
                    <CardDescription className="flex items-center mt-2">
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
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={lot.is_active ? "default" : "secondary"} className="text-sm">
                      {lot.is_active ? "Open" : "Closed"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/parking/${id}/3d`)} className="gap-2">
                      <RotateCw className="h-4 w-4" />
                      3D View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="mt-1 text-sm font-medium">{lot.is_active ? "Active" : "Inactive"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hourly Rate</p>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK/hr` : "Contact owner for rate"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Multi-step Booking Panel ─────────────────────────────── */}
          <div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {(["select", "schedule", "pay", "success"] as BookingStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : ["success", "pay", "schedule"].slice(0, ["select","schedule","pay","success"].indexOf(step)).includes(s)
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 3 && <div className={`h-0.5 w-4 ${["select","schedule","pay","success"].indexOf(step) > i ? "bg-green-500" : "bg-muted"}`} />}
                </div>
              ))}
            </div>

            {/* ── Step 1: Select ─── */}
            {step === "select" && (
              <Card>
                <CardHeader>
                  <CardTitle>Book Parking</CardTitle>
                  <CardDescription>Select your vehicle and an available slot</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="vehicle">Select Vehicle</Label>
                    <Select
                      id="vehicle"
                      value={selectedVehicle?.toString() || ""}
                      onChange={(e) => setSelectedVehicle(parseInt(e.target.value))}
                    >
                      <option value="">Choose a vehicle...</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id.toString()}>
                          {vehicle.plate_number} — {vehicle.brand || "Unknown"} {vehicle.color || ""}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {vehicles.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No vehicles.{" "}
                      <button onClick={() => navigate("/vehicles")} className="text-primary hover:underline">
                        Add a vehicle
                      </button>
                    </p>
                  )}

                  <div className="space-y-1 pt-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Selected Slot</span>
                      <span className="font-medium">{selectedSlot ? `Slot #${selectedSlot}` : "None"}</span>
                    </div>
                    {lot.rate_per_hour != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hourly Rate</span>
                        <span className="font-medium text-primary">{lot.rate_per_hour.toLocaleString()} MMK/hr</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    disabled={!lot.is_active || !selectedVehicle || !selectedSlot}
                    onClick={handleProceedToSchedule}
                  >
                    Next: Set Schedule
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>

                  {!lot.is_active && (
                    <p className="text-sm text-destructive text-center">This parking lot is currently closed</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Step 2: Schedule ─── */}
            {step === "schedule" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Set Parking Schedule
                  </CardTitle>
                  <CardDescription>Enter your planned start and end times</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <input
                      id="start-time"
                      type="datetime-local"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      min={toLocalDatetimeValue(new Date())}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <input
                      id="end-time"
                      type="datetime-local"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      min={startTime}
                    />
                  </div>

                  {durationMins > 0 && (
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fee Preview</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins / 60)}h ` : ""}{durationMins % 60}m
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-medium">{effectiveRate.toLocaleString()} MMK/hr</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2 mt-2">
                        <span>Estimated Fee</span>
                        <span className="text-primary">{calcFee(toISOUTC(startTime), toISOUTC(endTime), effectiveRate).toLocaleString()} MMK</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>
                      Back
                    </Button>
                    <Button className="flex-1" onClick={handleProceedToPayment} disabled={durationMins <= 0}>
                      Next: Payment
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Pay ─── */}
            {step === "pay" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Confirm Payment
                  </CardTitle>
                  <CardDescription>Review your booking and select payment method</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Booking summary */}
                  <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slot</span>
                      <span className="font-medium">#{selectedSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle</span>
                      <span className="font-medium">
                        {vehicles.find(v => v.id === selectedVehicle)?.plate_number || `#${selectedVehicle}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start</span>
                      <span className="font-medium">{format(new Date(startTime), "MMM d, hh:mm a")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End</span>
                      <span className="font-medium">{format(new Date(endTime), "MMM d, hh:mm a")}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-2 mt-1">
                      <span>Total Fee</span>
                      <span className="text-primary">{previewFee.toLocaleString()} MMK</span>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div>
                    <Label>Payment Method</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setPaymentMethod(m.value)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                            paymentMethod === m.value
                              ? "border-primary bg-primary/10 font-medium"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="text-base">{m.icon}</span>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Your booking and payment will be processed immediately. Once confirmed, your session will be ACTIVE.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("schedule")} disabled={booking}>
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleConfirmPayment}
                      disabled={booking}
                    >
                      {booking ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing payment...</>
                      ) : (
                        <>Pay {previewFee.toLocaleString()} MMK & Activate</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 4: Success ─── */}
            {step === "success" && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-8 pb-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Booking Confirmed!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your parking session is now <span className="text-green-600 font-semibold">ACTIVE</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-card border p-3 space-y-1.5 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slot</span>
                      <span className="font-medium">#{selectedSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">
                        {format(new Date(startTime), "hh:mm a")} → {format(new Date(endTime), "hh:mm a")}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1.5 mt-1">
                      <span>Fee Paid</span>
                      <span className="text-primary">{previewFee.toLocaleString()} MMK</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => navigate("/sessions")}>
                    View My Sessions
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Floors and Slots */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold tracking-tight mb-4">Floors & Parking Slots</h2>
            {loadingFloors ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading floors...
              </div>
            ) : floors.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No floors configured for this parking lot.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {floors.map((floor) => (
                  <FloorSection
                    key={floor.id}
                    floor={floor}
                    selectedSlot={selectedSlot}
                    onSelectSlot={(id) => {
                      setSelectedSlot(id)
                      if (step !== "select") setStep("select")
                    }}
                    onSlotClick={(id) => navigate(`/slots/${id}`)}
                    disabled={step !== "select"}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FloorSection({
  floor,
  selectedSlot,
  onSelectSlot,
  onSlotClick,
  disabled,
}: {
  floor: ParkingFloorOut
  selectedSlot: number | null
  onSelectSlot: (slotId: number) => void
  onSlotClick: (slotId: number) => void
  disabled?: boolean
}) {
  const [slots, setSlots] = useState<ParkingSlotOut[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    parkingSlotsApi.list({ floor_id: floor.id, limit: 100 })
      .then(setSlots)
      .catch((e) => {
        console.error("Failed to load slots:", e)
        toast.error("Failed to load parking slots")
      })
      .finally(() => setLoading(false))
  }, [floor.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{floor.floor_name || `Floor ${floor.id}`}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading slots...
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No slots configured for this floor.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot.id
              const isOccupied = slot.status === "OCCUPIED"
              return (
                <div
                  key={slot.id}
                  className={`relative rounded-xl border p-3 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm cursor-pointer"
                      : disabled
                        ? "cursor-default border-border"
                        : "cursor-pointer hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    if (!disabled) onSelectSlot(slot.id)
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm">{slot.slot_number}</p>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  {slot.section && <p className="text-xs text-muted-foreground">{slot.section}</p>}
                  <Badge
                    variant={isOccupied ? "secondary" : "default"}
                    className={`text-[10px] mt-1 ${!isOccupied ? "bg-green-500" : ""}`}
                  >
                    {isOccupied ? "Occupied" : "Available"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSlotClick(slot.id)
                    }}
                  >
                    View 3D
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
