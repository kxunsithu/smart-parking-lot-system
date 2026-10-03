import { useEffect, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft, MapPin, RotateCw, CheckCircle2, Loader2,
  CalendarDays, ChevronRight, Filter, Search, RotateCcw, Wallet,
  Clock, Car, ShieldAlert, Calculator, Info, X, Maximize2, Minimize2,
  Briefcase, User, Mail, Phone, Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Embedded3DView from "@/components/parking/Embedded3DView"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
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

type BookingStep = "rules" | "select" | "schedule" | "pay" | "success"

function toLocalDatetimeValue(date: Date): string {
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
  if (str.includes("maps/embed") || str.includes("output=embed")) return str
  if (str.includes("pb=")) {
    const match = str.match(/[?&]pb=([^&]+)/)
    if (match) return `https://www.google.com/maps/embed?pb=${match[1]}`
  }
  const qMatch = str.match(/[?&]q=([^&]+)/)
  if (qMatch && qMatch[1]) {
    const query = decodeURIComponent(qMatch[1])
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
  }
  const llMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (llMatch) return `https://maps.google.com/maps?q=${llMatch[1]},${llMatch[2]}&z=15&output=embed`
  const coordMatch = str.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/)
  if (coordMatch) return `https://maps.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=15&output=embed`
  if (str.startsWith("http://") || str.startsWith("https://"))
    return `https://maps.google.com/maps?q=${encodeURIComponent(str)}&z=15&output=embed`
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
  const [slotsByFloor, setSlotsByFloor] = useState<Record<number, ParkingSlotOut[]>>({})
  const [mapFullscreen, setMapFullscreen] = useState(false)
  const [lotSections, setLotSections] = useState<string[]>([])
  const [selectedCar, setSelectedCar] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingFloors, setLoadingFloors] = useState(true)
  const [step, setStep] = useState<BookingStep>("rules")

  // Booking modal open state
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

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
  const [initiating, setInitiating] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payInitiateError, setPayInitiateError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [receiptPayment, setReceiptPayment] = useState<PaymentListOut | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

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
        if (!user) {
          toast.error(t("auth.login_required_booking", "Please log in to book a parking slot."))
          navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)
          return
        }
        setSelectedSlot(slotId)
        setStep("select")
        setBookingModalOpen(true)
      }
    }
    const floorIdParam = searchParams.get("floorId")
    if (floorIdParam) setSelectedFloorId(floorIdParam)
  }, [searchParams, user])

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
    return () => { isMounted = false }
  }, [selectedSlot])

  useEffect(() => {
    if (!selectedCar) { setCarSessions([]); return }
    let isMounted = true
    parkingSessionsApi.list({ car_id: selectedCar, limit: 100 })
      .then((sessions) => { if (isMounted) setCarSessions(sessions) })
      .catch((error) => console.error("Failed to load car sessions", error))
    return () => { isMounted = false }
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
        const map: Record<number, ParkingSlotOut[]> = {}
        results.forEach((r, idx) => {
          map[floors[idx].id] = r
        })
        setSlotsByFloor(map)
        setLotSections(
          Array.from(
            new Set(results.flatMap((r) => r.map((s) => s.section?.trim()).filter((x): x is string => Boolean(x))))
          ).sort((a, b) => a.localeCompare(b))
        )
      })
      .catch((e) => console.error("Failed to load sections and slots:", e))
    return () => { cancelled = true }
  }, [floors])

  const handleSlotSelect = (slotId: number) => {
    if (!user) {
      toast.error(t("auth.login_required_booking", "Please log in to book a parking slot."))
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)
      return
    }
    setSelectedSlot(slotId)
    setStep("rules")
    setPaymentInfo(null)
    setBookedSession(null)
    setOtpCode("")
    setPin("")
    setPayError(null)
    setPayInitiateError(null)
    setBookingModalOpen(true)
  }

  const handleCloseModal = () => {
    if (step === "success") {
      setSelectedSlot(null)
      setSelectedSlotDetails(null)
    }
    setBookingModalOpen(false)
  }

  const handleProceedToSchedule = () => {
    if (!selectedCar) { toast.error("Please select a car"); return }
    if (!selectedSlot) { toast.error("Please select a parking slot"); return }
    setStep("schedule")
  }

  const ensureProfilePhone = (): boolean => {
    if (user?.phone?.trim()) return true
    toast.error("Add your wallet phone number in Profile before making a payment.")
    navigate("/profile")
    return false
  }

  const handleProceedToBook = async () => {
    if (!lot || !selectedCar || !selectedSlot) return
    if (!ensureProfilePhone()) return

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
      })
      setPaymentInfo(pendingPayment)
      setBookedSession(null)
      setOtpCode("")
      setPin("")
      setPayError(null)
      setPayInitiateError(null)
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
    if (!ensureProfilePhone()) return
    setInitiating(true)
    setPayInitiateError(null)
    setPayError(null)
    try {
      const pendingPayment = await parkingSessionsApi.book({
        car_id: selectedCar,
        slot_id: selectedSlot,
        start_time: toISOUTC(startTime),
        end_time: toISOUTC(endTime),
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
      try {
        const { items } = await paymentsApi.list({ limit: 1 })
        if (items.length > 0) setReceiptPayment(items[0])
      } catch { /* best-effort */ }
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

  // ── Booking Modal steps indicator helper ──
  const bookingSteps: BookingStep[] = ["rules", "select", "schedule", "pay", "success"]
  const stepIndex = bookingSteps.indexOf(step)

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
          <p>{t("parking.no_slots", "Parking lot not found")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("parking.back_to_lots", "Back to Parking Lots")}
        </Button>

        {/* ── Lot Info Header Card ── */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">{lot.name}</CardTitle>
                <CardDescription className="flex items-center mt-1 text-xs">
                  {lot.google_map_url ? (
                    <span className="flex items-center text-primary font-medium">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {t("parking.location_configured", "Location Configured")}
                    </span>
                  ) : (
                    <span className="flex items-center text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {t("parking.location_not_set", "Location not configured")}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 shrink-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("parking.rate_per_hour", "Hourly Rate")}</p>
                <p className="text-base font-extrabold text-primary">
                  {lot.rate_per_hour != null
                    ? `${lot.rate_per_hour.toLocaleString()} MMK / ${t("common.hour", "hr")}`
                    : t("parking.contact_owner", "Contact owner for rate")}
                </p>
              </div>
            </div>

            {/* Company / Operating Business Info */}
            {lot.owner && (
              <div className="mt-4 pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-muted/30 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  {lot.owner.user?.profile_image_url || (lot.owner.user as any)?.profile_image ? (
                    <img
                      src={lot.owner.user?.profile_image_url || (lot.owner.user as any)?.profile_image}
                      alt={lot.owner.company_name || "Company"}
                      className="size-10 rounded-full object-cover border border-primary/30 shadow-sm"
                    />
                  ) : (
                    <div className="size-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {(lot.owner.company_name || lot.owner.user?.full_name || lot.owner.user?.username || "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                      <Briefcase className="size-4 text-primary" />
                      {lot.owner.company_name || "Independent Operator"}
                    </p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                      <User className="size-3 text-muted-foreground" />
                      <span>{lot.owner.user?.full_name || lot.owner.user?.username || "Owner"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  {lot.owner.user?.email && (
                    <a
                      href={`mailto:${lot.owner.user.email}`}
                      title={`Email ${lot.owner.user.email}`}
                      className="p-2 rounded-lg bg-background/80 border border-border/60 text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                    >
                      <Mail className="size-4" />
                    </a>
                  )}
                  {lot.owner.user?.phone && (
                    <a
                      href={`tel:${lot.owner.user.phone}`}
                      title={`Call ${lot.owner.user.phone}`}
                      className="p-2 rounded-lg bg-background/80 border border-border/60 text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center"
                    >
                      <Phone className="size-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* ── 2-Column Layout: Left Panel = Location Map | Right Panel = Interactive 3D View ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Location Map View */}
          <Card className="flex flex-col h-full border border-border/80 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">{t("parking.location_map", "Location Map")}</CardTitle>
              </div>
              {getEmbedUrl(lot.google_map_url) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMapFullscreen(true)}
                  className="h-7 text-xs gap-1.5 px-2.5 rounded-lg border-border/80 hover:bg-accent"
                >
                  <Maximize2 className="size-3.5" />
                  {t("common.full_view", "Full View")}
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-[340px] sm:min-h-[400px] relative bg-slate-950">
              {getEmbedUrl(lot.google_map_url) ? (
                <iframe
                  src={getEmbedUrl(lot.google_map_url)!}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "340px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${lot.name} Embedded Map`}
                  className="w-full h-full min-h-[340px] sm:min-h-[400px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[340px] sm:min-h-[400px] text-center p-6 text-muted-foreground">
                  <MapPin className="size-8 mb-2 opacity-50 text-primary" />
                  <p className="text-sm font-medium">{t("parking.location_not_set", "Location map not configured")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Interactive 3D View */}
          <Card className="flex flex-col h-full border border-border/80 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <RotateCw className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">{t("parking.interactive_3d", "Interactive 3D View")}</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-primary/40 text-primary">
                Live 3D View
              </Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-[340px] sm:min-h-[400px]">
              <Embedded3DView
                floors={floors}
                slotsByFloor={slotsByFloor}
                onSlotClick={(slot) => navigate(`/slots/${slot.id}`)}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Map Fullscreen Modal ── */}
        {mapFullscreen && getEmbedUrl(lot.google_map_url) && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4 text-white">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                <h3 className="text-lg font-bold">{lot.name} — Location Map</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 rounded-full"
                onClick={() => setMapFullscreen(false)}
              >
                <X className="size-6" />
              </Button>
            </div>
            <div className="flex-1 w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
              <iframe
                src={getEmbedUrl(lot.google_map_url)!}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${lot.name} Fullscreen Map`}
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* ── Floors & Slots (full width) ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">{t("parking.floors_slots", "Floors & Parking Slots")}</h2>

          {floors.length > 0 && (
            <Card className="border border-border/80 shadow-sm rounded">
              <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 sm:justify-between flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider shrink-0">
                  <Filter className="size-4 text-primary" />
                  <span>{t("parking.filter_slots", "Filter Slots:")}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("parking.search_slot", "Search slot number...")}
                      value={slotSearchQuery}
                      onChange={(e) => setSlotSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded"
                    />
                  </div>
                  <div className="min-w-[150px]">
                    <Select
                      value={selectedFloorId}
                      onChange={(e) => setSelectedFloorId(e.target.value)}
                      options={[
                        { value: "all", label: `All Floors (${floors.length})` },
                        ...floors.map((floor) => ({
                          value: String(floor.id),
                          label: floor.floor_name || `Floor ${floor.id}`,
                        }))
                      ]}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="min-w-[150px]">
                    <Select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      options={[
                        { value: "all", label: `All Sections (${lotSections.length})` },
                        { value: "none", label: "No Section (—)" },
                        ...lotSections.map((sec) => ({ value: sec, label: `Section ${sec}` }))
                      ]}
                      className="h-9 text-xs"
                    />
                  </div>
                  {(selectedFloorId !== "all" || selectedSection !== "all" || slotSearchQuery.trim() !== "") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedFloorId("all"); setSelectedSection("all"); setSlotSearchQuery("") }}
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
                    onSelectSlot={handleSlotSelect}
                    onSlotClick={(id) => navigate(`/slots/${id}`)}
                    onTrack={handleTrackSlot}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={step !== "pay" ? handleCloseModal : undefined}
          />

          {/* Modal Panel */}
          <div className="relative z-10 w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div className="flex items-center gap-1">
                  {bookingSteps.map((s, i) => (
                    <div key={s} className="flex items-center gap-1">
                      <div
                        className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold transition-colors ${step === s
                          ? "bg-primary text-primary-foreground"
                          : i < stepIndex
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {i + 1}
                      </div>
                      {i < bookingSteps.length - 1 && (
                        <div className={`h-0.5 w-3 ${stepIndex > i ? "bg-green-500" : "bg-muted"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {step !== "pay" && (
                <button
                  onClick={handleCloseModal}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Modal Body (scrollable) */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* ── Step 0: Rules ── */}
              {step === "rules" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      {t("parking.booking_rules_title", "Booking Rules")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("parking.booking_rules_desc", "Please read these rules before booking a parking slot.")}
                    </p>
                  </div>

                  {selectedSlotDetails && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">{t("parking.selected_slot", "Selected Slot")}</span>
                      <span className="font-bold text-primary">{selectedSlotDetails.slotNumber}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{t("parking.rule_time_title", "Future Time Only")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("parking.rule_time_desc", "Start time must be in the future. End time must be after start time.")}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Car className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{t("parking.rule_car_title", "No Overlapping Car Sessions")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("parking.rule_car_desc", "The same car cannot have two bookings that overlap in time.")}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{t("parking.rule_buffer_title", "2-Hour Slot Gap Required")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("parking.rule_buffer_desc", "Each parking slot requires a 2-hour gap before and after any existing booking.")}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Calculator className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{t("parking.rule_fee_title", "Fee Calculation")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t("parking.rule_fee_desc", "Fee = ⌈duration in minutes⌉ ÷ 60 × hourly rate.")}</p>
                        {lot.rate_per_hour != null && (
                          <p className="text-xs font-mono text-primary mt-1 bg-primary/10 px-2 py-0.5 rounded inline-block">
                            {t("parking.rule_fee_example", "e.g. 90 min ×")} {lot.rate_per_hour.toLocaleString()} MMK/hr = {(lot.rate_per_hour * 1.5).toLocaleString()} MMK
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => setStep("select")}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {t("parking.rules_understood", "I Understand — Start Booking")}
                  </Button>
                </div>
              )}

              {/* ── Step 1: Select car ── */}
              {step === "select" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base">{t("parking.book_parking", "Book Parking")}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t("parking.book_desc", "Select your car — occupied slots can still be booked for a future time")}</p>
                  </div>

                  <div>
                    <Label htmlFor="car">{t("parking.select_car", "Select Car")}</Label>
                    <Select
                      id="car"
                      value={selectedCar?.toString() || ""}
                      onChange={(e) => setSelectedCar(parseInt(e.target.value))}
                      placeholder={t("parking.choose_car", "Choose a car...")}
                      options={cars.map((car) => ({
                        value: car.id.toString(),
                        label: `${car.plate_number} — ${car.brand || "Unknown"} ${car.color || ""}`.trim(),
                      }))}
                    />
                  </div>

                  {cars.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("parking.no_cars", "No cars.")}{" "}
                      <button onClick={() => navigate("/cars")} className="text-primary hover:underline">
                        {t("parking.add_car", "Add a car")}
                      </button>
                    </p>
                  )}

                  <div className="space-y-1 pt-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("parking.selected_slot", "Selected Slot")}</span>
                      <span className="font-medium">
                        {selectedSlotDetails
                          ? `${t("parking.slot", "Slot")} ${selectedSlotDetails.slotNumber}`
                          : selectedSlot ? `#${selectedSlot}` : t("parking.none", "None")}
                      </span>
                    </div>
                    {lot.rate_per_hour != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("parking.rate_per_hour", "Hourly Rate")}</span>
                        <span className="font-medium text-primary">{lot.rate_per_hour.toLocaleString()} MMK/{t("common.hour", "hr")}</span>
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
                    {t("parking.next_schedule", "Next: Set Schedule")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>

                  {!lot.is_active && (
                    <p className="text-sm text-destructive text-center">{t("parking.lot_closed", "This parking lot is currently closed")}</p>
                  )}
                </div>
              )}

              {/* ── Step 2: Schedule ── */}
              {step === "schedule" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {t("parking.set_schedule", "Set Parking Schedule")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{t("parking.schedule_desc", "Enter your planned start and end times")}</p>
                  </div>

                  <div>
                    <Label htmlFor="start-time">{t("parking.start_time", "Start Time")}</Label>
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
                    <Label htmlFor="end-time">{t("parking.end_time", "End Time")}</Label>
                    <input
                      id="end-time"
                      type="datetime-local"
                      className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm mt-1"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      min={startTime}
                    />
                  </div>

                  <div className="rounded bg-muted/50 border border-border/60 p-3 text-sm">
                    <p className="text-xs text-muted-foreground">{t("parking.wallet_phone", "Wallet Phone Number")}</p>
                    <p className="font-medium mt-1">{user?.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("parking.wallet_phone_profile_hint", "This number from your profile will be charged automatically.")}
                    </p>
                  </div>

                  {durationMins > 0 && (
                    <div className="rounded bg-primary/10 border border-primary/20 p-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("parking.fee_preview", "Fee Preview")}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("parking.duration", "Duration")}</span>
                        <span className="font-medium">
                          {Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins / 60)}h ` : ""}{durationMins % 60}m
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("parking.rate", "Rate")}</span>
                        <span className="font-medium">{effectiveRate.toLocaleString()} MMK/{t("common.hour", "hr")}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2 mt-2">
                        <span>{t("parking.estimated_fee", "Estimated Fee")}</span>
                        <span className="text-primary">{calcFee(toISOUTC(startTime), toISOUTC(endTime), effectiveRate).toLocaleString()} MMK</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("select")} disabled={booking}>
                      {t("parking.back", "Back")}
                    </Button>
                    <Button className="flex-1" onClick={handleProceedToBook} disabled={booking || durationMins <= 0}>
                      {booking ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("parking.booking", "Booking...")}</>
                      ) : (
                        <>{t("parking.confirm_book", "Confirm & Book")}<ChevronRight className="h-4 w-4 ml-1" /></>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Pay ── */}
              {step === "pay" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      {t("parking.confirm_payment", "Confirm Wallet Payment")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{t("parking.slot_reserved", "Your slot is reserved. Pay to activate your session.")}</p>
                  </div>

                  {!paymentInfo ? (
                    <div className="space-y-4">
                      {payInitiateError && (
                        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">{payInitiateError}</p>
                      )}
                      <div className="rounded bg-muted/50 border border-border/60 p-3 text-sm">
                        <p className="text-xs text-muted-foreground">{t("parking.wallet_phone_label", "Wallet phone number")}</p>
                        <p className="font-medium mt-1">{user?.phone ?? "—"}</p>
                      </div>
                      <Button className="w-full" onClick={handleInitiatePayment} disabled={initiating}>
                        {initiating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("parking.requesting_payment", "Requesting payment...")}</> : t("parking.pay_with_wallet", "Pay with Wallet")}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        {t("parking.estimated_fee_short", "Estimated fee:")} <span className="font-semibold text-foreground">{(bookedSession?.fee ?? previewFee).toLocaleString()} MMK</span>
                      </p>
                    </div>
                  ) : paymentInfo.wallet_payment_url ? (
                    <div className="space-y-4">
                      <div className="rounded bg-primary/10 border border-primary/20 p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("parking.payment_summary", "Payment Summary")}</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("parking.parking_fee", "Parking Fee")}</span>
                          <span className="font-medium">{paymentInfo.amount.toLocaleString()} MMK</span>
                        </div>
                        {paymentInfo.fee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("parking.wallet_fee", "Wallet Fee")}</span>
                            <span className="font-medium">{paymentInfo.fee.toLocaleString()} MMK</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2 mt-2">
                          <span>{t("parking.total", "Total")}</span>
                          <span className="text-primary">{paymentInfo.total.toLocaleString()} MMK</span>
                        </div>
                      </div>
                      <div className="rounded bg-card border p-4 space-y-2">
                        <p className="text-sm font-medium">{t("parking.complete_in_wallet", "Complete your payment in the digital wallet")}</p>
                        <p className="text-xs text-muted-foreground">{t("parking.wallet_redirect_desc", "You are being redirected to the digital wallet.")}</p>
                        <Button variant="outline" className="w-full" onClick={() => { window.location.href = paymentInfo.wallet_payment_url! }}>
                          {t("parking.open_payment", "Open payment page")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded bg-primary/10 border border-primary/20 p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("parking.payment_summary", "Payment Summary")}</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t("parking.parking_fee", "Parking Fee")}</span>
                          <span className="font-medium">{paymentInfo.amount.toLocaleString()} MMK</span>
                        </div>
                        {paymentInfo.fee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("parking.wallet_fee", "Wallet Fee")}</span>
                            <span className="font-medium">{paymentInfo.fee.toLocaleString()} MMK</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t border-primary/20 pt-2 mt-2">
                          <span>{t("parking.total", "Total")}</span>
                          <span className="text-primary">{paymentInfo.total.toLocaleString()} MMK</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="otp">{t("parking.otp", "One-Time Password (OTP)")}</Label>
                        <Input
                          id="otp"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder={t("parking.otp_placeholder", "6-digit OTP")}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          className="mt-1 tracking-widest text-center"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t("parking.otp_hint", "Enter the 6-digit code sent to your phone by your wallet app.")}</p>
                      </div>
                      <div>
                        <Label htmlFor="pin">{t("parking.pin", "Wallet PIN")}</Label>
                        <Input
                          id="pin"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder={t("parking.pin_placeholder", "4-digit PIN")}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                          className="mt-1 tracking-widest text-center"
                        />
                      </div>
                      {payError && (
                        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">{payError}</p>
                      )}
                      <Button className="w-full" onClick={handleConfirmPayment} disabled={paying}>
                        {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("parking.processing", "Processing payment...")}</> : <>{t("parking.pay", "Pay")} {paymentInfo.total.toLocaleString()} MMK</>}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        <button type="button" onClick={handleInitiatePayment} disabled={initiating || paying} className="text-primary hover:underline disabled:opacity-50">
                          {t("parking.new_otp", "Request a new OTP")}
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 4: Success ── */}
              {step === "success" && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-bold">{t("parking.booking_confirmed", "Booking Confirmed!")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("parking.session_active", "Your parking session is now")} <span className="text-green-600 font-semibold">{t("parking.active_label", "ACTIVE")}</span>
                    </p>
                  </div>
                  <div className="rounded bg-card border p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("parking.slot", "Slot")}</span>
                      <span className="font-medium">#{selectedSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("parking.car", "Car")}</span>
                      <span className="font-medium">{cars.find(c => c.id === selectedCar)?.plate_number || `#${selectedCar}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("parking.start", "Start")}</span>
                      <span className="font-medium">{format(new Date(startTime), "MMM d, hh:mm a")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("parking.end", "End")}</span>
                      <span className="font-medium">{format(new Date(endTime), "MMM d, hh:mm a")}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1.5 mt-1">
                      <span>{t("parking.parking_fee", "Parking Fee")}</span>
                      <span className="text-primary">{(bookedSession?.fee ?? previewFee).toLocaleString()} MMK</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button className="w-full" onClick={() => navigate("/sessions")}>
                      {t("parking.view_sessions", "View My Sessions")}
                    </Button>
                    {receiptPayment && (
                      <Button variant="outline" className="w-full" onClick={() => { setShowReceipt(true); handleCloseModal() }}>
                        {t("parking.view_receipt", "View Receipt")}
                      </Button>
                    )}
                    <Button variant="ghost" className="w-full" onClick={handleCloseModal}>
                      {t("parking.back_to_lots", "Back to Lots")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
      <Footer />
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
}: {
  floor: ParkingFloorOut
  selectedSlot: number | null
  selectedSection?: string
  slotSearchQuery?: string
  onSelectSlot: (slotId: number) => void
  onSlotClick: (slotId: number) => void
  onTrack: (details: SlotTrackDetails) => void
}) {
  const { t } = useLanguage()
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
    if (slotSearchQuery.trim() && !slot.slot_number.toLowerCase().includes(slotSearchQuery.trim().toLowerCase())) return false
    if (selectedSection !== "all") {
      if (selectedSection === "none") { if (slot.section?.trim()) return false }
      else if (slot.section?.trim().toLowerCase() !== selectedSection.toLowerCase()) return false
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
          <CardTitle className="text-base font-bold">{floor.floor_name || `Floor ${floor.id}`}</CardTitle>
          {filteredSlots.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium border border-emerald-500/20">
                {filteredSlots.filter((s) => s.status === "AVAILABLE").length} Available
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium border border-amber-500/20">
                {filteredSlots.filter((s) => s.status === "RESERVED").length} Reserved
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
              const reserved = sectionSlots.filter((s) => s.status === "RESERVED").length
              const occupied = sectionSlots.filter((s) => s.status === "OCCUPIED").length

              return (
                <div key={section} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded bg-muted border border-border/60">
                      <span className="text-xs font-bold text-foreground tracking-wide uppercase">
                        {section === "—" ? "No Section" : `Section ${section}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">{sectionSlots.length} slots</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium">
                      {available > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{available} {t("parking.free", "free")}</span>}
                      {reserved > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">{reserved} reserved</span>}
                      {occupied > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20">{occupied} {t("parking.occupied", "taken")}</span>}
                    </div>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {sectionSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.id
                      const isAvailable = slot.status === "AVAILABLE"
                      const isReserved = slot.status === "RESERVED"

                      return (
                        <div
                          key={slot.id}
                          onClick={() => onSelectSlot(slot.id)}
                          className={`group relative flex flex-col gap-1 rounded border p-2.5 transition-all cursor-pointer ${isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                            : isAvailable
                              ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/60"
                              : isReserved
                                ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/60"
                                : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/60"
                            }`}
                        >
                          <div className="flex items-center gap-1.5 justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`size-2 rounded-full shrink-0 ${isAvailable ? "bg-emerald-500" : isReserved ? "bg-amber-500" : "bg-red-500"}`} />
                              <span className="text-xs font-bold text-foreground truncate leading-none">{slot.slot_number}</span>
                            </div>
                            {isSelected && <CheckCircle2 className="size-3.5 text-primary shrink-0" />}
                          </div>

                          <span className={`text-[9px] font-semibold uppercase tracking-wide ${isAvailable ? "text-emerald-600" : isReserved ? "text-amber-600" : "text-red-600"}`}>
                            {isAvailable ? t("parking.available", "Free") : isReserved ? "Reserved" : t("parking.occupied", "Taken now")}
                          </span>

                          <div className="flex gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onSlotClick(slot.id) }}
                              className={`flex-1 rounded py-1 text-[10px] font-semibold transition-all border opacity-0 group-hover:opacity-100 ${isAvailable
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20"
                                : isReserved
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20"
                                  : "bg-red-500/10 border-red-500/30 text-red-700 hover:bg-red-500/20"
                                }`}
                            >
                              {t("parking.view_3d", "3D View")}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTrack({ slotNumber: slot.slot_number, floorName, latitude: slot.latitude, longitude: slot.longitude })
                              }}
                              className="flex-1 rounded py-1 text-[10px] font-semibold transition-all border bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 opacity-0 group-hover:opacity-100"
                            >
                              {t("parking.track", "Track")}
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
