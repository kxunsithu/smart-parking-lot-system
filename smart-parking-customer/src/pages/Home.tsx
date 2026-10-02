import { useEffect, useState } from "react"
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
  CheckCircle2,
  Building2,
} from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import heroBg from "@/assets/hero-backgound.png"
import Hero3DParkingLot from "@/components/home/Hero3DParkingLot"
import Footer from "@/components/layout/Footer"
import { useLanguage } from "@/lib/i18n"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { citiesApi, type CityOut } from "@/api/cities"
import { parkingLotsApi } from "@/api/parkingLots"
import { API_ORIGIN } from "@/api/client"
import { Kayin_STATE_CITIES } from "@/lib/KayinCities"

/* ─── Main Home Page ─────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const isAuthenticated = Boolean(user && accessToken)

  const [cities, setCities] = useState<CityOut[]>([])
  const [lotCounts, setLotCounts] = useState<Record<string, number>>({})
  const [citiesLoading, setCitiesLoading] = useState(true)

  useEffect(() => {
    async function loadCitiesData() {
      try {
        setCitiesLoading(true)
        let apiCities: CityOut[] = []
        try {
          apiCities = await citiesApi.list({ is_active: true })
        } catch {
          apiCities = []
        }

        const existingNames = new Set(apiCities.map((c) => c.name.toLowerCase()))

        const fallbackCities: CityOut[] = Kayin_STATE_CITIES.filter(
          (c) => !existingNames.has(c.value.toLowerCase())
        ).map((c, i) => ({
          id: 1000 + i,
          name: c.value,
          name_mm: c.labelMm,
          description: null,
          image_url: null,
          is_active: true,
          created_at: "",
        }))

        const allCities = [...apiCities, ...fallbackCities]
        setCities(allCities)

        // Fetch counts
        const counts: Record<string, number> = {}
        await Promise.all(
          allCities.map(async (c) => {
            try {
              const res = await parkingLotsApi.list({ city: c.name, page: 1, limit: 1 })
              counts[c.name] = res.meta?.total ?? 0
            } catch {
              counts[c.name] = 0
            }
          })
        )
        setLotCounts(counts)
      } catch (err) {
        console.error("Failed to load cities data", err)
      } finally {
        setCitiesLoading(false)
      }
    }

    loadCitiesData()
  }, [])

  const getFullImageUrl = (path: string | null) => {
    if (!path) return null
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return `${API_ORIGIN}${path}`
  }

  const handleCityClick = (cityName: string) => {
    const targetUrl = `/dashboard?city=${encodeURIComponent(cityName)}`
    if (isAuthenticated) {
      navigate(targetUrl)
    } else {
      navigate("/login")
    }
  }

  const features = [
    {
      icon: Navigation2,
      title: t("home.feat1_title", "Real-Time Parking"),
      desc: t("home.feat1_desc", "Locate available slots in real-time across all lots in Kayin State with live occupancy data."),
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

      {/* ── Hero Section (Two Column with High-Contrast Photo Background) ────────── */}
      <section className="relative w-full border-b border-border/60 overflow-hidden shadow-xs min-h-[calc(100vh-4rem)] flex items-center">
        {/* Background image container (fixed attachment on scroll) */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed pointer-events-none"
          style={{ backgroundImage: `url(${heroBg})`, backgroundAttachment: "fixed" }}
        />
        {/* Softened Primary Amber Gradient Overlay over hero background photo */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-amber-950/45 to-slate-950/70 backdrop-blur-[2.5px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
        {/* Soft Ambient Primary Amber Glow */}
        <div className="absolute top-1/4 right-10 w-[400px] h-[400px] bg-amber-500/12 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── Left: Text Content ── */}
            <div className="flex flex-col gap-6">
              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight">
                <span className="text-white drop-shadow-md">{t("home.hero_title_1", "SMART PARKING")}</span>
                <br />
                <span
                  className="text-transparent bg-clip-text drop-shadow-md"
                  style={{ backgroundImage: "linear-gradient(135deg, #FF8F00 0%, #fbbf24 100%)" }}
                >
                  {t("home.hero_title_2", "IN Kayin STATE")}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed max-w-lg drop-shadow-sm">
                {t("home.hero_subtitle", "Find, reserve, and manage your parking easily with our smart parking system across Kayin State.")}
              </p>

              {/* Action buttons */}
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-base px-8 py-6 rounded shadow-lg shadow-amber-500/25 hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                    onClick={() => navigate("/dashboard")}
                  >
                    {t("nav.parking", "Explore Parking Lots")}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto text-base px-8 py-6 rounded border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer font-bold"
                    onClick={() => navigate("/cars")}
                  >
                    {t("nav.cars", "My Vehicles")}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto text-base px-8 py-6 rounded shadow-lg shadow-amber-500/25 hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                    onClick={() => navigate("/register")}
                  >
                    {t("home.create_account", "Create Account")}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto text-base px-8 py-6 rounded border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md transition-all cursor-pointer font-bold"
                    onClick={() => navigate("/login")}
                  >
                    {t("nav.login", "Log in")}
                  </Button>
                </div>
              )}

              {/* Proof badges */}
              <div className="flex flex-wrap gap-3 pt-2 text-xs sm:text-sm text-slate-200">
                {[t("home.proof1", "No credit card required"), t("home.proof2", "Instant setup"), t("home.proof3", "Available 24/7")].map((text) => (
                  <span key={text} className="flex items-center gap-1.5 bg-black/50 border border-white/20 backdrop-blur-md rounded-full px-3.5 py-1.5 shadow-sm text-white font-medium">
                    <CheckCircle2 className="size-3.5 text-amber-400 shrink-0" />
                    <span>{text}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right: Interactive 3D Parking Lot Preview ── */}
            <div className="relative flex items-center justify-center lg:justify-end w-full">
              <Hero3DParkingLot />
            </div>

          </div>
        </div>
      </section>

      {/* ── Main Content Container ─────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-16 py-12">

        {/* ── City Cards Section (Replaces individual parking lots) ───────────────── */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Explore Locations</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Cities in Kayin State (ကရင်ပြည်နယ်)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a township or city to explore available smart parking lots and reserve your slot.
              </p>
            </div>
            <Button
              variant="outline"
              className="self-start sm:self-auto rounded gap-2 cursor-pointer border-border/80 hover:bg-muted/60"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
            >
              View all cities
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {citiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 bg-card/60 rounded-2xl animate-pulse border border-border/80" />
              ))}
            </div>
          ) : cities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cities.map((city) => {
                const count = lotCounts[city.name] ?? 0
                const imgUrl = getFullImageUrl(city.image_url)

                return (
                  <button
                    key={city.id}
                    onClick={() => handleCityClick(city.name)}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-primary/60 hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-300 text-left cursor-pointer"
                  >
                    {/* Image Cover Container */}
                    <div className="relative h-64 w-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={city.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900">
                          <Building2 className="w-12 h-12 mb-2 text-primary/40" />
                          <span className="text-xs font-medium text-slate-400">Kayin State Township</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                      {/* Lot Count Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge
                          className={
                            count > 0
                              ? "bg-primary text-primary-foreground font-bold shadow-md"
                              : "bg-black/60 text-slate-300 border-none"
                          }
                        >
                          {count} {count === 1 ? "Lot" : "Lots"}
                        </Badge>
                      </div>

                      {/* City Name Banner */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="text-xl font-bold tracking-tight leading-tight group-hover:text-primary transition-colors drop-shadow">
                          {city.name}
                        </h3>
                        {city.name_mm && (
                          <p className="text-sm font-medium text-amber-300 drop-shadow">
                            {city.name_mm}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* City Description Footer */}
                    <div className="p-4 bg-card/60 backdrop-blur-sm flex items-center justify-between">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {city.description || "Explore available smart parking lots in this township."}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border/80 rounded-2xl bg-card/40">
              <Building2 className="size-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No cities available right now.</p>
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
                className="group p-6 rounded border border-border/80 bg-card/70 backdrop-blur-md hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 space-y-3"
              >
                <div className={`size-12 rounded border ${bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xs`}>
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
