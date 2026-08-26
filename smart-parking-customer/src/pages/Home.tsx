import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Car,
  MapPin,
  Zap,
  Shield,
  Clock,
  CreditCard,
  ChevronRight,
  Navigation2,
  ParkingCircle,
  Smartphone,
  ArrowRight,
  Star,
  CheckCircle2,
} from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { useLanguage } from "@/lib/i18n"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { parkingLotsApi } from "@/api/parkingLots"
import { parkingSlotsApi } from "@/api/parkingSlots"
import type { ParkingLotOut } from "@/api/types"

/* ─── Animated Counter ──────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    started.current = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          if (target === 0) {
            setCount(0)
            return
          }
          const duration = 1200
          const step = Math.max(1, target / (duration / 16))
          let current = 0
          const timer = setInterval(() => {
            current += step
            if (current >= target) {
              setCount(target)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, 16)
        }
      },
      { threshold: 0.2 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </div>
  )
}

/* ─── Floating Orb Background ───────────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 dark:opacity-10 blur-3xl animate-pulse"
        style={{ background: "radial-gradient(circle, #FF8F00 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full opacity-10 dark:opacity-5 blur-3xl animate-pulse"
        style={{ background: "radial-gradient(circle, #FF8F00 0%, transparent 70%)", animationDelay: "1.5s" }}
      />
      <div
        className="absolute -bottom-20 right-1/3 w-[350px] h-[350px] rounded-full opacity-10 dark:opacity-5 blur-3xl animate-pulse"
        style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)", animationDelay: "3s" }}
      />
    </div>
  )
}

/* ─── Parking Lot Card ───────────────────────────────────────────── */
function LotCard({ lot, onBook }: { lot: ParkingLotOut; onBook: () => void }) {
  return (
    <div className="group relative bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
      {/* Color accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary via-amber-400 to-amber-500 opacity-90 group-hover:opacity-100 transition-opacity" />

      <div className="p-6 space-y-4">
        {/* Top bar with icon & status */}
        <div className="flex items-start justify-between gap-3">
          <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-all duration-300 shadow-xs">
            <ParkingCircle className="size-6 transition-transform group-hover:scale-110" />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border shadow-2xs ${
              lot.is_active
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <span className={`size-1.5 rounded-full ${lot.is_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
            {lot.is_active ? "Open Now" : "Closed"}
          </span>
        </div>

        {/* Title and location */}
        <div>
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {lot.name}
          </h3>
          {lot.google_map_url ? (
            <a
              href={lot.google_map_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1.5 truncate max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span className="truncate">View on Google Maps</span>
            </a>
          ) : (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
              <MapPin className="size-3.5 text-muted-foreground/60 shrink-0" />
              <span>Myanmar</span>
            </p>
          )}
        </div>
      </div>

      {/* Bottom price and action */}
      <div className="p-6 pt-0">
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Hourly Rate</p>
            <p className="text-lg font-extrabold text-primary">
              {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK` : "—"}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ hr</span>
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl gap-1.5 font-semibold text-xs px-4 shadow-sm group-hover:shadow-md transition-all cursor-pointer"
            disabled={!lot.is_active}
            onClick={onBook}
          >
            {lot.is_active ? "Reserve Slot" : "Closed"}
            {lot.is_active && <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Home Page ─────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const isAuthenticated = Boolean(user && accessToken)
  const [lots, setLots] = useState<ParkingLotOut[]>([])
  const [lotsLoading, setLotsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLots: 0,
    totalSlots: 0,
    availableSlots: 0,
  })

  useEffect(() => {
    async function loadRealStats() {
      try {
        const [lotsResult, slotsData] = await Promise.all([
          parkingLotsApi.list({ limit: 100 }).catch(() => ({ items: [], meta: null })),
          parkingSlotsApi.list({ limit: 1000 }).catch(() => []),
        ])
        const lotsData = lotsResult.items

        setLots(lotsData.slice(0, 6))

        const availCount = slotsData.filter((s) => s.status === "AVAILABLE").length

        setStats({
          totalLots: lotsData.length,
          totalSlots: slotsData.length,
          availableSlots: availCount,
        })
      } catch (err) {
        console.error("Failed to load real stats", err)
      } finally {
        setLotsLoading(false)
      }
    }

    loadRealStats()
  }, [])

  const features = [
    {
      icon: Navigation2,
      title: t("home.feat1_title", "Real-Time Parking"),
      desc: t("home.feat1_desc", "Locate available slots in real-time across all lots in Myanmar with live occupancy data."),
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: Clock,
      title: t("home.feat2_title", "Schedule Ahead"),
      desc: t("home.feat2_desc", "Pre-book your parking slot for a future time — no more driving around looking for space."),
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: CreditCard,
      title: t("home.feat3_title", "Digital Payment"),
      desc: t("home.feat3_desc", "Pay via digital wallet seamlessly. Instant receipts delivered to your account."),
      color: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      icon: Zap,
      title: t("home.feat4_title", "Instant Activation"),
      desc: t("home.feat4_desc", "Confirm payment and your session activates immediately. No waiting, no paperwork."),
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: Shield,
      title: t("home.feat5_title", "Secure & Reliable"),
      desc: t("home.feat5_desc", "All transactions are encrypted end-to-end. Your vehicles and data are always protected."),
      color: "text-rose-500 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      icon: Smartphone,
      title: t("home.feat6_title", "Mobile Friendly"),
      desc: t("home.feat6_desc", "Manage bookings, track sessions, and pay — all from your smartphone, anytime."),
      color: "text-cyan-500 dark:text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col text-foreground selection:bg-primary/20">
      <Navbar />

      {/* ── Hero Section (Full Width) ───────────────────────────── */}
      <section className="relative w-full border-b border-border/60 bg-gradient-to-b from-card/80 via-card/30 to-background py-16 sm:py-24 overflow-hidden shadow-xs text-center flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <FloatingOrbs />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#FF8F00 1px, transparent 1px), linear-gradient(to right, #FF8F00 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Nationwide badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary rounded-full px-4 py-1.5 text-xs font-semibold shadow-2xs">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>{t("home.hero_badge", "Save Money, Save Time")}</span>
          </div>

          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-normal tracking-normal max-w-5xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-center gap-x-2 text-center whitespace-normal sm:whitespace-nowrap">
            <span className="text-foreground shrink-0">{t("home.hero_title_1", "Park Smarter,")}</span>
            <span
              className="text-transparent bg-clip-text inline-block py-1.5 leading-normal shrink-0"
              style={{ backgroundImage: "linear-gradient(135deg, #FF8F00 0%, #fbbf24 100%)" }}
            >
              {t("home.hero_title_2", "Drive Faster")}
            </span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("home.hero_subtitle", "Find, reserve, and manage your vehicle parking easily across Myanmar.")}
          </p>

          {/* Action buttons */}
          <div className="pt-4">
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-6 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2.5 cursor-pointer font-bold"
                  onClick={() => navigate("/dashboard")}
                >
                  <ParkingCircle className="size-5" />
                  {t("nav.parking", "Explore Parking Lots")}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-6 rounded-2xl border-border/80 hover:bg-muted/60 transition-all gap-2.5 cursor-pointer font-bold"
                  onClick={() => navigate("/cars")}
                >
                  <Car className="size-5" />
                  {t("nav.cars", "My Vehicles")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-6 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2.5 cursor-pointer font-bold"
                  onClick={() => navigate("/register")}
                >
                  {t("home.create_account", "Create Account")}
                  <ArrowRight className="size-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-6 rounded-2xl border-border/80 hover:bg-muted/60 transition-all gap-2.5 cursor-pointer font-bold"
                  onClick={() => navigate("/login")}
                >
                  <ParkingCircle className="size-5" />
                  {t("nav.login", "Log in")}
                </Button>
              </div>
            )}
          </div>

          {/* Proof badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs sm:text-sm text-muted-foreground">
            {[t("home.proof1", "No credit card required"), t("home.proof2", "Instant setup"), t("home.proof3", "Available 24/7")].map((text) => (
              <span key={text} className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-full px-3.5 py-1.5">
                <CheckCircle2 className="size-4 text-primary shrink-0" />
                <span>{text}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Content Container ─────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-16 py-12">

        {/* ── Parking Lots Preview ─────────────────────────────────── */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Live Locations</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {t("home.nearby_lots", "Parking Lots in Myanmar")}
              </h2>
            </div>
            <Button
              variant="outline"
              className="self-start sm:self-auto rounded-xl gap-2 cursor-pointer border-border/80 hover:bg-muted/60"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
            >
              {t("common.all", "View all lots")}
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {lotsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-card/60 rounded-2xl animate-pulse border border-border/80" />
              ))}
            </div>
          ) : lots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lots.map((lot) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  onBook={() => navigate(isAuthenticated ? `/parking/${lot.id}` : "/login")}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border/80 rounded-2xl bg-card/40">
              <ParkingCircle className="size-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No parking lots available right now.</p>
            </div>
          )}
        </section>

        {/* ── Features Section ────────────────────────────────────── */}
        <section className="space-y-10 py-6">
          <div className="text-center space-y-2">
            <p className="text-primary text-xs font-bold uppercase tracking-widest">{t("home.why_smart", "Why Smart Parking?")}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {t("home.why_subtitle", "Everything you need, nothing you don't")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border border-border/80 bg-card/70 backdrop-blur-md hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 space-y-3"
              >
                <div className={`size-12 rounded-2xl border ${bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs`}>
                  <Icon className={`size-6 ${color}`} />
                </div>
                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
