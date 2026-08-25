import { useEffect, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft, MapPin, RotateCw, CheckCircle2, Loader2,
  CalendarDays, ChevronRight, Filter, Search, Layers, RotateCcw, Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import Navbar from "@/components/layout/Navbar"
import { LocationTrackBar } from "@/components/parking/LocationTrackBar"
import { ParkingTrackModal } from "@/components/parking/ParkingTrackModal"
import { parkingLotsApi } from "@/api/parkingLots"
import { carsApi } from "@/api/cars"
import { parkingSessionsApi } from "@/api/parkingSessions"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingSlotsApi } from "@/api/parkingSlots"
import { useCarStore } from "@/store/carStore"
import { paymentsApi } from "@/api/payments"
import { ReceiptModal } from "@/components/common/ReceiptModal"
import { useAuthStore } from "@/store/authStore"
import type { ParkingLotOut, ParkingSlotOut, ParkingSessionOut, WalletPaymentOut, PaymentListOut } from "@/api/types"
import type { ParkingFloorOut } from "@/api/parkingFloors"
import { toast } from "@/components/ui/toaster"
import { format, addHours } from "date-fns"
import { trackParkingSlot, type ParkingTrackTarget, type SlotTrackDetails } from "@/lib/parkingTrack"
import { findCarSessionOverlap } from "@/lib/sessionSchedule"

import { useLanguage } from "@/lib/i18n"

type BookingStep = "select" | "schedule" | "pay" | "success"

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
  const endDate = end ? new Date(end) : new Date()
  const mins = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 60000))
  return Math.round((mins / 60) * ratePerHour * 100) / 100
}

function getEmbedUrl(mapUrl?: string | null): string | null {
  if (!mapUrl) return null
  const str = mapUrl.trim()
  if (str.toLowerCase().includes("<iframe")) {
    const match = str.match(/src=["']([^"']+)["']/i)
    if (match && match[1]) return getEmbedUrl(match[1])
  }
  if (str.includes("maps/embed") || str.includes("output=embed")) {
    return str
  }
  if (str.includes("pb=")) {
    const match = str.match(/[?&]pb=([^&]+)/)
    if (match) return `https://www.google.com/maps/embed?pb=${match[1]}`
  }
  // Extract q parameter if present (e.g. ?q=16.77410,96.15940)
  const qMatch = str.match(/[?&]q=([^&]+)/)
  if (qMatch && qMatch[1]) {
    const query = decodeURIComponent(qMatch[1])
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
  }
  // Extract @lat,lng
  const llMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (llMatch) {
    return `https://maps.google.com/maps?q=${llMatch[1]},${llMatch[2]}&z=15&output=embed`
  }
  // Raw lat,lng string
  const coordMatch = str.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/)
  if (coordMatch) {
    return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=15&output=embed`
  }
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(str)}&z=15&output=embed`
  }
  return null
}

export default function ParkingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const { cars } = useCarStore()
  const [lot, setLot] = useState<ParkingLotOut | null>(null)
  const [floors, setFloors] = useState<ParkingFloorOut[]>([])
  const [lotSections, setLotSections] = useState<string[]>([])
  const [selectedCar, setSelectedCar] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingFloors, setLoadingFloors] = useState(true)
  const [step, setStep] = useState<BookingStep>("select")

  // Slot filters
  const [selectedFloorId, setSelectedFloorId] = useState<string>("all")
  const [selectedSection, setSelectedSection] = useState<string>("all")
  const [slotSearchQuery, setSlotSearchQuery] = useState("")

  // Scheduling
  const defaultStart = toLocalDatetimeValue(new Date())
  const defaultEnd = toLocalDatetimeValue(addHours(new Date(), 2))
  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime] = useState(defaultEnd)

  // Booking state
  const [previewFee, setPreviewFee] = useState<number>(0)
  const [bookedSession, setBookedSession] = useState<ParkingSessionOut | null>(null)
  const [booking, setBooking] = useState(false)
  const [selectedSlotDetails, setSelectedSlotDetails] = useState<SlotTrackDetails | null>(null)
  const [activeNavigation, setActiveNavigation] = useState<ParkingTrackTarget | null>(null)
  const [carSessions, setCarSessions] = useState<ParkingSessionOut[]>([])

  const user = useAuthStore((state) => state.user)

  // Wallet payment state
  const [paymentInfo, setPaymentInfo] = useState<WalletPaymentOut | null>(null)
  const [otpCode, setOtpCode] = useState("")
  const [pin, setPin] = useState("")
  const [walletPhone, setWalletPhone] = useState(user?.phone || "")
  const [initiating, setInitiating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paymentChecking, setPaymentChecking] = useState(false)
  const [payInitiateError, setPayInitiateError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [receiptPayment, setReceiptPayment] = useState<PaymentListOut | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    if (user?.phone && !walletPhone) {
      setWalletPhone(user.phone)
    }
  }, [user])

  useEffect(() => {
    if (id) {
      loadParkingLot(id)
      loadCars()
      loadFloors(parseInt(id))
    }
  }, [id])

  useEffect(() => {
    const slotIdParam = searchParams.get("slotId")
    if (slotIdParam) {
      const slotId = Number(slotIdParam)
      if (Number.isFinite(slotId)) {
        setSelectedSlot(slotId)
        setStep("select")
      }
    }

    const floorIdParam = searchParams.get("floorId")
    if (floorIdParam) {
      setSelectedFloorId(floorIdParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (!selectedSlot) {
      setSelectedSlotDetails(null)
      return
    }

    let isMounted = true
    async function loadSelectedSlotDetails() {
      try {
        const slot = await parkingSlotsApi.get(selectedSlot)
        const floor = await parkingFloorsApi.get(slot.floor_id)
        if (isMounted) {
          setSelectedSlotDetails({
            slotNumber: slot.slot_number,
            floorName: floor.floor_name || `Floor ${floor.id}`,
            latitude: slot.latitude,
            longitude: slot.longitude,
          })
        }
      } catch (e) {
        console.error("Failed to load selected slot details", e)
      }
    }

    loadSelectedSlotDetails()
    return () => {
      isMounted = false
    }
  }, [selectedSlot])

  useEffect(() => {
    if (!selectedCar) {
      setCarSessions([])
      return
    }

    let isMounted = true
    parkingSessionsApi.list({ car_id: selectedCar, limit: 100 })
      .then((sessions) => {
        if (isMounted) setCarSessions(sessions)
      })
      .catch((error) => {
        console.error("Failed to load car sessions", error)
      })

    return () => {
      isMounted = false
    }
  }, [selectedCar])

  const handleTrackSlot = (details: SlotTrackDetails) => {
    if (!lot) return
    trackParkingSlot(details, lot, setActiveNavigation)
  }

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

  const loadCars = async () => {
    try {
      const response = await carsApi.list()
      if (response?.length > 0) setSelectedCar(response[0].id)
    } catch {
      console.error("Failed to load cars")
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

  useEffect(() => {
    if (floors.length === 0) return
    let cancelled = false
    Promise.all(floors.map((f) => parkingSlotsApi.list({ floor_id: f.id, limit: 100 })))
      .then((results) => {
        if (cancelled) return
        setLotSections(
          Array.from(
            new Set(
              results
                .flatMap((r) => r.map((s) => s.section?.trim()).filter((x): x is string => Boolean(x)))
            )
          ).sort((a, b) => a.localeCompare(b))
        )
      })
      .catch((e) => console.error("Failed to load sections:", e))
    return () => {
      cancelled = true
    }
  }, [floors])

  // Step 1 → Step 2: validate selection then go to schedule
  const handleProceedToSchedule = () => {
    if (!selectedCar) { toast.error("Please select a car"); return }
    if (!selectedSlot) { toast.error("Please select a parking slot"); return }
    setStep("schedule")
  }

  // Step 2 → Book: validate times, check overlap, then create ACTIVE session
  // Step 2 → Book: validate times, check overlap, then initiate booking payment
  const handleProceedToBook = async () => {
    if (!lot || !selectedCar || !selectedSlot) return

    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()
    if (start <= now) { toast.error("Start time must be in the future"); return }
    if (end <= start) { toast.error("End time must be after start time"); return }

    const overlappingSession = findCarSessionOverlap(start, end, carSessions)
    if (overlappingSession) {
      toast.error(
        `This car already has a session during that time (${format(new Date(overlappingSession.start_time), "MMM d, hh:mm a")}${overlappingSession.end_time ? ` – ${format(new Date(overlappingSession.end_time), "hh:mm a")}` : ""}).`
      )
      return
    }

    const rate = lot?.rate_per_hour ?? 1000
    setPreviewFee(calcFee(toISOUTC(startTime), toISOUTC(endTime), rate))

    setBooking(true)
    try {
      const pendingPayment = await parkingSessionsApi.book({
        car_id: selectedCar,
        slot_id: selectedSlot,
        start_time: toISOUTC(startTime),
        end_time: toISOUTC(endTime),
        wallet_phone: walletPhone.trim() || null,
      })
      setPaymentInfo(pendingPayment)
      setBookedSession(null)
      setOtpCode("")
      setPin("")
      setPayError(null)
      setPayInitiateError(null)
      setPaymentChecking(false)

      if (pendingPayment.wallet_payment_url) {
        window.location.href = pendingPayment.wallet_payment_url
      } else {
        toast.success("Booking initiated. Enter your OTP and PIN to confirm payment.")
        setStep("pay")
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book parking session")
    } finally {
      setBooking(false)
    }
  }

  const handleInitiatePayment = async () => {
    if (!selectedCar || !selectedSlot) return
    setInitiating(true)
    setPayInitiateError(null)
    setPayError(null)
    try {
      const pendingPayment = await parkingSessionsApi.book({
        car_id: selectedCar,
        slot_id: selectedSlot,
        start_time: toISOUTC(startTime),
        end_time: toISOUTC(endTime),
        wallet_phone: walletPhone.trim() || null,
      })
      setPaymentInfo(pendingPayment)
      if (pendingPayment.wallet_payment_url) {
        window.location.href = pendingPayment.wallet_payment_url
      } else {
        toast.success("Payment initiated. Enter the OTP and your PIN to confirm.")
      }
    } catch (err: any) {
      setPayInitiateError(err.response?.data?.message || "Failed to initiate payment. Please try again.")
    } finally {
      setInitiating(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!paymentInfo) return
    if (!/^\d{6}$/.test(otpCode.trim())) { toast.error("Please enter the 6-digit OTP"); return }
    if (!/^\d{4}$/.test(pin.trim())) { toast.error("Please enter your 4-digit wallet PIN"); return }
    setPaying(true)
    setPayError(null)
    try {
      const result = await parkingSessionsApi.payConfirmByRef({
        reference: paymentInfo.reference,
        otp_code: otpCode.trim(),
        pin: pin.trim(),
      })
      setBookedSession(result.session)
      toast.success("Payment successful! Your parking session is now ACTIVE.")
      // Fetch the completed payment receipt
      try {
        const { items } = await paymentsApi.list({ limit: 1 })
        if (items.length > 0) setReceiptPayment(items[0])
      } catch {
        // receipt fetch is best-effort; don't block success
      }
      setStep("success")
    } catch (err: any) {
      setPayError(err.response?.data?.message || "Payment failed. Please check your OTP and PIN and try again.")
    } finally {
      setPaying(false)
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-fit">
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
                        <span className="flex items-center text-primary font-medium text-xs">
                          <MapPin className="h-4 w-4 mr-1" />
                          Location Configured
                        </span>
                      ) : (
                        <span className="flex items-center text-muted-foreground text-xs">
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

                {getEmbedUrl(lot.google_map_url) && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <MapPin className="size-3.5 text-primary" /> Location Map
                    </p>
                    <div className="relative w-full h-56 rounded overflow-hidden border border-border shadow-sm bg-slate-950">
                      <iframe
                        src={getEmbedUrl(lot.google_map_url)!}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`${lot.name} Embedded Map`}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─── Multi-step Booking Panel ─────────────────────────────── */}
          <div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {(() => {
                const steps: BookingStep[] = ["select", "schedule", "pay", "success"]
                const stepIndex = steps.indexOf(step)
                return steps.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${step === s
                        ? "bg-primary text-primary-foreground"
                        : i < stepIndex
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-0.5 w-4 ${stepIndex > i ? "bg-green-500" : "bg-muted"}`} />
                    )}
                  </div>
                ))
              })()}
            </div>

            {/* ── Step 1: Select ─── */}
            {step === "select" && (
              <Card>
                <CardHeader>
                  <CardTitle>Book Parking</CardTitle>
                  <CardDescription>Select your car and a slot — occupied slots can still be booked for a future time</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="car">Select Car</Label>
                    <Select
                      id="car"
                      value={selectedCar?.toString() || ""}
                      onChange={(e) => setSelectedCar(parseInt(e.target.value))}
                    >
                      <option value="">Choose a car...</option>
                      {cars.map((car) => (
                        <option key={car.id} value={car.id.toString()}>
                          {car.plate_number} — {car.brand || "Unknown"} {car.color || ""}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {cars.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No cars.{" "}
                      <button onClick={() => navigate("/cars")} className="text-primary hover:underline">
                        Add a car
                      </button>
                    </p>
                  )}

                  <div className="space-y-1 pt-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Selected Slot</span>
                      <span className="font-medium">
                        {selectedSlotDetails
                          ? `Slot ${selectedSlotDetails.slotNumber}`
                          : selectedSlot
                            ? `#${selectedSlot}`
                            : "None"}
                      </span>
                    </div>
                    {lot.rate_per_hour != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hourly Rate</span>
                        <span className="font-medium text-primary">{lot.rate_per_hour.toLocaleString()} MMK/hr</span>
                      </div>
                    )}
                  </div>

                  {selectedSlotDetails && (
                    <LocationTrackBar
                      lotName={lot.name}
                      floorName={selectedSlotDetails.floorName}
                      slotNumber={selectedSlotDetails.slotNumber}
                      onTrack={() => handleTrackSlot(selectedSlotDetails)}
                    />
                  )}

                  <Button
                    className="w-full"
                    disabled={!lot.is_active || !selectedCar || !selectedSlot}
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
                      className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1"
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
                      className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      min={startTime}
                    />
                  </div>

                  <div>
                    <Label htmlFor="schedule-wallet-phone" className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-primary" />
                      Sender Wallet Phone Number
                    </Label>
                    <Input
                      id="schedule-wallet-phone"
                      inputMode="tel"
                      placeholder="e.g. 09123456789"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Digital wallet account phone number to charge for this booking.
                    </p>
                  </div>

                  {durationMins > 0 && (
                    <div className="rounded bg-primary/10 border border-primary/20 p-4 space-y-2">
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
                    <Button variant="outline" className="flex-1" onClick={() => setStep("select")} disabled={booking}>
                      Back
                    </Button>
                    <Button className="flex-1" onClick={handleProceedToBook} disabled={booking || durationMins <= 0}>
                      {booking ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking...</>
                      ) : (
                        <>Confirm & Book
                          <ChevronRight className="h-4 w-4 ml-1" /></>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Pay with wallet ─── */}
            {step === "pay" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Confirm Wallet Payment
                  </CardTitle>
                  <CardDescription>Your slot is reserved. Pay to activate your session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!paymentInfo ? (
                    <div className="space-y-4">
                      {payInitiateError && (
                        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                          {payInitiateError}
                        </p>
                      )}
                      <div>
                        <Label htmlFor="wallet-phone">Wallet phone number</Label>
                        <Input
                          id="wallet-phone"
                          inputMode="tel"
                          placeholder="e.g. +959123456789"
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value)}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Optional. Use this if your wallet account phone is different from your profile phone.
                        </p>
                      </div>
                      <Button className="w-full" onClick={handleInitiatePayment} disabled={initiating}>
                        {initiating ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Requesting payment...</>
                        ) : (
                          <>Pay with Wallet</>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Estimated fee: <span className="font-semibold text-foreground">{(bookedSession?.fee ?? previewFee).toLocaleString()} MMK</span>
                      </p>
                    </div>
                  ) : paymentInfo.wallet_payment_url ? (
                    <div className="space-y-4">
                      <div className="rounded bg-primary/10 border border-primary/20 p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Summary</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Parking Fee</span>
                          <span className="font-medium">{paymentInfo.amount.toLocaleString()} MMK</span>
                        </div>
                        {paymentInfo.fee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Wallet Fee</span>
                            <span className="font-medium">{paymentInfo.fee.toLocaleString()} MMK</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2 mt-2">
                          <span>Total</span>
                          <span className="text-primary">{paymentInfo.total.toLocaleString()} MMK</span>
                        </div>
                      </div>

                      <div className="rounded bg-card border p-4 space-y-2">
                        <p className="text-sm font-medium">Complete your payment in the digital wallet</p>
                        <p className="text-xs text-muted-foreground">
                          You are being redirected to the digital wallet. Enter the OTP and your wallet PIN there,
                          and you will be brought back to this app automatically once the payment is confirmed.
                        </p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => { window.location.href = paymentInfo.wallet_payment_url! }}
                        >
                          Open payment page
                        </Button>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Waiting for payment confirmation...</span>
                      </div>

                      <Button className="w-full" onClick={handleCheckPaymentStatus} disabled={paymentChecking}>
                        {paymentChecking ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
                        ) : (
                          <>I've completed the payment</>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        <button
                          type="button"
                          onClick={handleInitiatePayment}
                          disabled={initiating}
                          className="text-primary hover:underline disabled:opacity-50"
                        >
                          Request a new payment
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded bg-primary/10 border border-primary/20 p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Summary</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Parking Fee</span>
                          <span className="font-medium">{paymentInfo.amount.toLocaleString()} MMK</span>
                        </div>
                        {paymentInfo.fee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Wallet Fee</span>
                            <span className="font-medium">{paymentInfo.fee.toLocaleString()} MMK</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2 mt-2">
                          <span>Total</span>
                          <span className="text-primary">{paymentInfo.total.toLocaleString()} MMK</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="otp">One-Time Password (OTP)</Label>
                        <Input
                          id="otp"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          className="mt-1 tracking-widest text-center"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter the 6-digit code sent to your phone by your wallet app.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="pin">Wallet PIN</Label>
                        <Input
                          id="pin"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="4-digit PIN"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                          className="mt-1 tracking-widest text-center"
                        />
                      </div>

                      {payError && (
                        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                          {payError}
                        </p>
                      )}

                      <Button className="w-full" onClick={handleConfirmPayment} disabled={paying}>
                        {paying ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing payment...</>
                        ) : (
                          <>Pay {paymentInfo.total.toLocaleString()} MMK</>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        <button
                          type="button"
                          onClick={handleInitiatePayment}
                          disabled={initiating || paying}
                          className="text-primary hover:underline disabled:opacity-50"
                        >
                          Request a new OTP
                        </button>
                      </p>
                    </div>
                  )}
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
                  <div className="rounded bg-card border p-3 space-y-1.5 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slot</span>
                      <span className="font-medium">#{selectedSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Car</span>
                      <span className="font-medium">
                        {cars.find(c => c.id === selectedCar)?.plate_number || `#${selectedCar}`}
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
                    <div className="flex justify-between font-bold border-t pt-1.5 mt-1">
                      <span>Parking Fee</span>
                      <span className="text-primary">
                        {(bookedSession?.fee ?? previewFee).toLocaleString()} MMK
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" onClick={() => navigate("/sessions")}>
                      View My Sessions
                    </Button>
                    {receiptPayment && (
                      <Button variant="outline" className="w-full" onClick={() => setShowReceipt(true)}>
                        View Receipt
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Floors and Slots */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Floors & Parking Slots</h2>

            {floors.length > 0 && (
              <Card className="border border-border/80 shadow-sm rounded">
                <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:justify-between flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider shrink-0">
                    <Filter className="size-4 text-primary" />
                    <span>Filter Slots:</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search slot number..."
                        value={slotSearchQuery}
                        onChange={(e) => setSlotSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded"
                      />
                    </div>

                    <div className="min-w-[150px]">
                      <div className="relative">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none z-10" />
                        <Select
                          value={selectedFloorId}
                          onChange={(e) => setSelectedFloorId(e.target.value)}
                          className="pl-9 h-9 text-xs rounded"
                        >
                          <option value="all">All Floors ({floors.length})</option>
                          {floors.map((floor) => (
                            <option key={floor.id} value={String(floor.id)}>
                              {floor.floor_name || `Floor ${floor.id}`}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="min-w-[150px]">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none z-10" />
                        <Select
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                          className="pl-9 h-9 text-xs rounded"
                        >
                          <option value="all">All Sections ({lotSections.length})</option>
                          <option value="none">No Section (—)</option>
                          {lotSections.map((sec) => (
                            <option key={sec} value={sec}>Section {sec}</option>
                          ))}
                        </Select>
                      </div>
                    </div>

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
                {floors
                  .filter((floor) => selectedFloorId === "all" || String(floor.id) === selectedFloorId)
                  .map((floor) => (
                    <FloorSection
                      key={floor.id}
                      floor={floor}
                      selectedSlot={selectedSlot}
                      selectedSection={selectedSection}
                      slotSearchQuery={slotSearchQuery}
                      onSelectSlot={(id) => {
                        setSelectedSlot(id)
                        if (step !== "select") setStep("select")
                      }}
                      onSlotClick={(id) => navigate(`/slots/${id}`)}
                      onTrack={handleTrackSlot}
                      disabled={step !== "select"}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeNavigation && (
        <ParkingTrackModal
          slotNumber={activeNavigation.slotNumber}
          floorName={activeNavigation.floorName}
          lotName={activeNavigation.lotName}
          destLatitude={activeNavigation.latitude}
          destLongitude={activeNavigation.longitude}
          onClose={() => setActiveNavigation(null)}
        />
      )}

      {showReceipt && receiptPayment && (
        <ReceiptModal payment={receiptPayment} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  )
}

function FloorSection({
  floor,
  selectedSlot,
  selectedSection = "all",
  slotSearchQuery = "",
  onSelectSlot,
  onSlotClick,
  onTrack,
  disabled,
}: {
  floor: ParkingFloorOut
  selectedSlot: number | null
  selectedSection?: string
  slotSearchQuery?: string
  onSelectSlot: (slotId: number) => void
  onSlotClick: (slotId: number) => void
  onTrack: (details: SlotTrackDetails) => void
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

  const filteredSlots = slots.filter((slot) => {
    if (
      slotSearchQuery.trim() &&
      !slot.slot_number.toLowerCase().includes(slotSearchQuery.trim().toLowerCase())
    ) {
      return false
    }
    if (selectedSection !== "all") {
      if (selectedSection === "none") {
        if (slot.section?.trim()) return false
      } else if (slot.section?.trim().toLowerCase() !== selectedSection.toLowerCase()) {
        return false
      }
    }
    return true
  })

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

  const isFiltered = selectedSection !== "all" || slotSearchQuery.trim() !== ""
  const floorName = floor.floor_name || `Floor ${floor.id}`

  return (
    <Card className="border border-border/80 shadow-sm rounded overflow-hidden">
      <CardHeader className="flex-row items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle className="text-base font-bold">
            {floor.floor_name || `Floor ${floor.id}`}
          </CardTitle>
          {filteredSlots.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium border border-emerald-500/20">
                {filteredSlots.filter((s) => s.status === "AVAILABLE").length} Available
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium border border-red-500/20">
                {filteredSlots.filter((s) => s.status === "OCCUPIED").length} Occupied
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading slots...
          </div>
        ) : filteredSlots.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {isFiltered ? "No slots match the current filter criteria on this floor." : "No slots on this floor."}
          </p>
        ) : (
          <div className="space-y-6">
            {sortedSections.map((section) => {
              const sectionSlots = sectionMap[section]
              const available = sectionSlots.filter((s) => s.status === "AVAILABLE").length
              const occupied = sectionSlots.filter((s) => s.status === "OCCUPIED").length

              return (
                <div key={section} className="space-y-3">
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

                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {sectionSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.id
                      const isAvailable = slot.status === "AVAILABLE"
                      const canSelect = !disabled

                      return (
                        <div
                          key={slot.id}
                          onClick={() => {
                            if (canSelect) onSelectSlot(slot.id)
                          }}
                          className={`group relative flex flex-col gap-1 rounded border p-2.5 transition-all ${isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm cursor-pointer"
                            : isAvailable
                              ? "border-emerald-500/30 bg-emerald-500/5 cursor-pointer hover:bg-emerald-500/10"
                              : "border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10"
                            }`}
                        >
                          <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`size-2 rounded-full shrink-0 ${isAvailable ? "bg-emerald-500" : "bg-amber-500"}`}
                              />
                              <span className="text-xs font-bold text-foreground truncate leading-none">
                                {slot.slot_number}
                              </span>
                            </div>
                            {isSelected && <CheckCircle2 className="size-3.5 text-primary shrink-0" />}
                          </div>

                          <span
                            className={`text-[9px] font-semibold uppercase tracking-wide ${isAvailable ? "text-emerald-600" : "text-amber-600"
                              }`}
                          >
                            {isAvailable ? "Free" : "Taken now"}
                          </span>

                          <div className="flex gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSlotClick(slot.id)
                              }}
                              className={`flex-1 rounded py-1 text-[10px] font-semibold transition-all border ${isAvailable
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                }`}
                            >
                              View 3D
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTrack({
                                  slotNumber: slot.slot_number,
                                  floorName,
                                  latitude: slot.latitude,
                                  longitude: slot.longitude,
                                })
                              }}
                              className="flex-1 rounded py-1 text-[10px] font-semibold transition-all border bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              Track
                            </button>
                          </div>
                        </div>
                      )
                    })}
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
