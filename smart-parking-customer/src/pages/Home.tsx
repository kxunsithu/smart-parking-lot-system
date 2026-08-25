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
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { LanguageToggle } from "@/components/theme/LanguageToggle"
import { useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { parkingLotsApi } from "@/api/parkingLots"
import type { ParkingLotOut } from "@/api/types"

/* ─── Animated Counter ──────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1500
          const step = target / (duration / 16)
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
      { threshold: 0.5 }
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
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
      {/* Color accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary to-amber-400" />
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <ParkingCircle className="size-6 text-primary" />
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            lot.is_active
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            {lot.is_active ? "● Open" : "● Closed"}
          </span>
        </div>

        <h3 className="font-bold text-lg text-foreground mb-1 leading-tight">{lot.name}</h3>

        {lot.google_map_url && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <MapPin className="size-3 text-primary shrink-0" />
            <span>Location available</span>
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground">Hourly Rate</p>
            <p className="text-base font-bold text-primary">
              {lot.rate_per_hour != null ? `${lot.rate_per_hour.toLocaleString()} MMK` : "—"}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ hr</span>
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-lg gap-1.5 text-xs"
            disabled={!lot.is_active}
            onClick={onBook}
          >
            {lot.is_active ? "Book" : "Closed"}
            {lot.is_active && <ChevronRight className="size-3.5" />}
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
  const [lots, setLots] = useState<ParkingLotOut[]>([])
  const [lotsLoading, setLotsLoading] = useState(true)

  useEffect(() => {
    parkingLotsApi.list({ limit: 6 })
      .then(setLots)
      .catch(() => {})
      .finally(() => setLotsLoading(false))
  }, [])

  const features = [
    {
      icon: Navigation2,
      title: t("nav.parking", "Find Parking"),
      desc: "Locate available slots in real-time across all lots in Yangon with live occupancy data.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Clock,
      title: "Schedule Ahead",
      desc: "Pre-book your parking slot for a future time — no more driving around looking for space.",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: CreditCard,
      title: "Digital Payment",
      desc: "Pay via digital wallet seamlessly. Instant receipts delivered to your account.",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      icon: Zap,
      title: "Instant Activation",
      desc: "Confirm payment and your session activates immediately. No waiting, no paperwork.",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      desc: "All transactions are encrypted end-to-end. Your vehicles and data are always protected.",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      icon: Smartphone,
      title: "Mobile Friendly",
      desc: "Manage bookings, track sessions, and pay — all from your smartphone, anytime.",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
  ]

  const steps = [
    { step: "01", title: "Register & Add Vehicle", desc: "Create your account and register your vehicle plate number in seconds." },
    { step: "02", title: "Find a Parking Lot", desc: "Browse all available parking lots in Yangon and check real-time slot availability." },
    { step: "03", title: "Book Your Slot", desc: "Select your preferred slot, set your parking schedule, and proceed to payment." },
    { step: "04", title: "Pay & Park", desc: "Complete payment via digital wallet and your session goes live instantly." },
  ]

  const stats = [
    { value: 20, suffix: "+", label: "Parking Lots" },
    { value: 500, suffix: "+", label: "Parking Slots" },
    { value: 1000, suffix: "+", label: "Happy Drivers" },
    { value: 24, suffix: "/7", label: "Always Online" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Brand */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Car className="size-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-sm leading-tight">Smart Parking</p>
              <p className="text-[10px] text-primary font-semibold uppercase tracking-widest">Myanmar</p>
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              {t("nav.login", "Log in")}
            </Button>
            <Button size="sm" onClick={() => navigate("/register")} className="hidden sm:flex gap-1.5">
              {t("nav.register", "Register")}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <FloatingOrbs />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(#FF8F00 1px, transparent 1px), linear-gradient(to right, #FF8F00 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-full px-4 py-1.5 text-xs font-semibold mb-8 animate-bounce">
            <span className="size-1.5 rounded-full bg-primary animate-ping" />
            {t("home.hero_badge", "Yangon's Smart Parking Platform")}
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            <span className="text-foreground">{t("home.hero_title_1", "Park Smarter,")}</span>
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #FF8F00, #fbbf24)" }}
            >
              {t("home.hero_title_2", "Drive Faster")}
            </span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("home.hero_subtitle", "Find, reserve, and manage your vehicle parking easily across Yangon.")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-6 rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-shadow gap-2"
              onClick={() => navigate("/register")}
            >
              {t("home.get_started", "Get Started Free")}
              <ArrowRight className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-6 rounded-xl gap-2"
              onClick={() => navigate("/login")}
            >
              <ParkingCircle className="size-5" />
              {t("nav.login", "Log in")}
            </Button>
          </div>

          {/* Proof badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
            {[t("home.proof1", "No credit card required"), t("home.proof2", "Instant setup"), t("home.proof3", "Available 24/7")].map((text) => (
              <span key={text} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-primary" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ──────────────────────────────────────── */}
      <section className="py-16 border-y border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 20, suffix: "+", label: t("home.stat_lots", "Parking Lots") },
              { value: 500, suffix: "+", label: t("home.stat_slots", "Parking Slots") },
              { value: 1000, suffix: "+", label: t("home.stat_drivers", "Happy Drivers") },
              { value: 24, suffix: "/7", label: t("home.stat_online", "Always Online") },
            ].map(({ value, suffix, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">
                  <AnimatedCounter target={value} suffix={suffix} />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">{t("home.why_smart", "Why Smart Parking?")}</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            {t("home.why_subtitle", "Everything you need, nothing you don't")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className={`size-12 rounded-xl ${bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <Icon className={`size-6 ${color}`} />
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="py-24 bg-muted/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">{t("home.how_it_works", "Park in 4 simple steps")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: t("home.step1_title", "Register & Add Vehicle"), desc: t("home.step1_desc", "Create your account and register your vehicle plate number in seconds.") },
              { step: "02", title: t("home.step2_title", "Find a Parking Lot"), desc: t("home.step2_desc", "Browse all available parking lots in Yangon and check real-time slot availability.") },
              { step: "03", title: t("home.step3_title", "Book Your Slot"), desc: t("home.step3_desc", "Select your preferred slot, set your parking schedule, and proceed to payment.") },
              { step: "04", title: t("home.step4_title", "Pay & Park"), desc: t("home.step4_desc", "Complete payment via digital wallet and your session goes live instantly.") },
            ].map(({ step, title, desc }, i) => (
              <div key={step} className="relative">
                {/* Connector line */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%-8px)] w-full h-px border-t-2 border-dashed border-border z-0" />
                )}
                <div className="relative z-10">
                  <div className="size-12 rounded-2xl bg-primary flex items-center justify-center text-white font-extrabold text-sm mb-4 shadow-lg shadow-primary/25">
                    {step}
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Parking Lots Preview ─────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              {t("home.nearby_lots", "Parking Lots in Yangon")}
            </h2>
          </div>
          <Button
            variant="outline"
            className="self-start sm:self-auto rounded-xl gap-2"
            onClick={() => navigate("/login")}
          >
            {t("common.all", "View all lots")}
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {lotsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 bg-muted/50 rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : lots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lots.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                onBook={() => navigate("/login")}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <ParkingCircle className="size-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No parking lots available right now.</p>
          </div>
        )}
      </section>

      {/* ── CTA Section ──────────────────────────────────────────── */}
      <section className="py-28 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div
          className="relative rounded-3xl overflow-hidden p-10 sm:p-16"
          style={{
            background: "linear-gradient(135deg, #FF8F00 0%, #f59e0b 100%)",
          }}
        >
          <div className="relative">
            <div className="size-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <Car className="size-9 text-white" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
              {t("home.cta_title", "Ready to park smarter?")}
            </h2>
            <p className="text-white/80 text-base sm:text-lg mb-10 max-w-xl mx-auto">
              {t("home.cta_subtitle", "Join thousands of drivers using Smart Parking to save time and money in Yangon.")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 text-base px-8 py-6 rounded-xl font-bold shadow-xl gap-2"
                onClick={() => navigate("/register")}
              >
                {t("home.create_account", "Create Free Account")}
                <ArrowRight className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto text-white hover:bg-white/10 text-base px-8 py-6 rounded-xl gap-2"
                onClick={() => navigate("/login")}
              >
                {t("home.login_instead", "Log in instead")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Car className="size-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Smart Parking</p>
              <p className="text-[10px] text-muted-foreground">Myanmar Parking System</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Smart Parking Lot Management System. Built for Myanmar.
          </p>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  )
}
