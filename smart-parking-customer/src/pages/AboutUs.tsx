import { useState } from "react"
import {
  Users,
  Target,
  Lightbulb,
  Mail,
  Sparkles,
  MapPin,
  GraduationCap,
  Award,
  Code2,
  Database,
  TestTube2,
  FileText,
  ShieldCheck,
} from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

/* ─── Social Icons ──────────────────────────────────────────────── */
function TelegramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  )
}

function FacebookIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
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


/* ─── Team Member Data ──────────────────────────────────────────── */
interface TeamMember {
  name: string
  image: string
  isLeader?: boolean
  initial: string
  gradient: string
  badgeIcon: React.ElementType
  socials: {
    telegram?: string
    facebook?: string
    email?: string
  }
}

const teamMembers: TeamMember[] = [
  {
    name: "Khun Si Thu Aung",
    image: "/team/khun-si-thu-aung.png",
    isLeader: true,
    initial: "K",
    gradient: "from-amber-400 to-orange-500",
    badgeIcon: Award,
    socials: {
      telegram: "https://t.me/khunsithuaung",
      facebook: "https://facebook.com/khunsithuaung",
      email: "khunsithuaung@gmail.com",
    },
  },
  {
    name: "Saw Paing Wathone San",
    image: "/team/saw-paing-wathone-san.png",
    isLeader: false,
    initial: "S",
    gradient: "from-emerald-400 to-teal-500",
    badgeIcon: ShieldCheck,
    socials: {
      telegram: "https://t.me/sawpaingwathonesan",
      facebook: "https://facebook.com/sawpaingwathonesan",
      email: "sawpaingwathonesan@gmail.com",
    },
  },
  {
    name: "Mg Si Thu Aung",
    image: "/team/mg-si-thu-aung.png",
    isLeader: false,
    initial: "M",
    gradient: "from-purple-400 to-violet-500",
    badgeIcon: Code2,
    socials: {
      telegram: "https://t.me/mgsithuaung",
      facebook: "https://facebook.com/mgsithuaung",
      email: "mgsithuaung@gmail.com",
    },
  },
  {
    name: "Myo Min Oo",
    image: "/team/myo-min-oo.png",
    isLeader: false,
    initial: "M",
    gradient: "from-rose-400 to-pink-500",
    badgeIcon: TestTube2,
    socials: {
      telegram: "https://t.me/myominoo",
      facebook: "https://facebook.com/myominoo",
      email: "myominoo@gmail.com",
    },
  },
  {
    name: "Yadanar Htun",
    image: "/team/yadanar-htun.png",
    isLeader: false,
    initial: "Y",
    gradient: "from-cyan-400 to-sky-500",
    badgeIcon: FileText,
    socials: {
      telegram: "https://t.me/yadanarhtun",
      facebook: "https://facebook.com/yadanarhtun",
      email: "yadanarhtun@gmail.com",
    },
  },
  {
    name: "Nan Hnin Chit Aung",
    image: "/team/nan-hnin-chit-aung.png",
    isLeader: false,
    initial: "N",
    gradient: "from-indigo-400 to-blue-500",
    badgeIcon: Database,
    socials: {
      telegram: "https://t.me/nanhninchitaung",
      facebook: "https://facebook.com/nanhninchitaung",
      email: "nanhninchitaung@gmail.com",
    },
  },
]

/* ─── Team Member Card ──────────────────────────────────────────── */
function TeamMemberCard({ member, index }: { member: TeamMember; index: number }) {
  const [imgError, setImgError] = useState(false)
  const BadgeIcon = member.badgeIcon

  return (
    <div
      className="group relative bg-card/80 backdrop-blur-md border border-border/80 rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 flex flex-col items-center text-center p-6"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Leader badge */}
      {member.isLeader && (
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-sm">
            <Sparkles className="size-2.5" />
            Leader
          </span>
        </div>
      )}

      {/* Avatar Image with ring */}
      <div className="relative mt-2 mb-4">
        <div className={`size-28 sm:size-32 rounded-full p-1 bg-gradient-to-tr ${member.gradient} shadow-xl group-hover:scale-105 transition-transform duration-300`}>
          {!imgError ? (
            <img
              src={member.image}
              alt={member.name}
              onError={() => setImgError(true)}
              className="size-full rounded-full object-cover bg-background"
            />
          ) : (
            <div className="size-full rounded-full bg-muted flex items-center justify-center text-foreground font-extrabold text-2xl">
              {member.initial}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 size-8 rounded-full bg-card border border-border flex items-center justify-center text-primary shadow-md">
          <BadgeIcon className="size-4" />
        </div>
      </div>

      {/* Name */}
      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-snug mb-6">
        {member.name}
      </h3>

      {/* Social Links with Icons */}
      <div className="mt-auto flex items-center justify-center gap-2.5 w-full pt-4 border-t border-border/60">
        {member.socials.telegram && (
          <a
            href={member.socials.telegram}
            target="_blank"
            rel="noreferrer"
            title={`Telegram: ${member.name}`}
            className="size-9 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-500 hover:bg-sky-500 hover:text-white transition-all flex items-center justify-center shadow-xs hover:scale-110"
          >
            <TelegramIcon className="size-4" />
          </a>
        )}
        {member.socials.facebook && (
          <a
            href={member.socials.facebook}
            target="_blank"
            rel="noreferrer"
            title={`Facebook: ${member.name}`}
            className="size-9 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-xs hover:scale-110"
          >
            <FacebookIcon className="size-4" />
          </a>
        )}
        {member.socials.email && (
          <a
            href={`mailto:${member.socials.email}`}
            title={`Email: ${member.socials.email}`}
            className="size-9 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center shadow-xs hover:scale-110"
          >
            <Mail className="size-4" />
          </a>
        )}
      </div>
    </div>
  )
}

/* ─── About Us Page ─────────────────────────────────────────────── */
export default function AboutUs() {
  const values = [
    {
      icon: Target,
      title: "Our Mission",
      desc: "To simplify urban parking in Myanmar by providing a smart, digital-first parking management ecosystem that saves time, reduces congestion, and improves the daily commute for every driver.",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: Lightbulb,
      title: "Our Vision",
      desc: "A Myanmar where every parking lot is connected, every driver can find a spot in seconds, and every transaction is seamless — powered by technology built right here in our country.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: Users,
      title: "Our Team",
      desc: "We are 6 Computer Science students passionate about solving real-world problems with modern technology. This project represents our commitment to innovation and engineering excellence.",
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col text-foreground selection:bg-primary/20">
      <Navbar />

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="relative w-full border-b border-border/60 bg-gradient-to-b from-card/80 via-card/30 to-background py-20 sm:py-28 overflow-hidden shadow-xs text-center flex flex-col items-center justify-center">
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

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 text-primary rounded-full px-4 py-1.5 text-xs font-semibold shadow-2xs">
            <GraduationCap className="size-3.5" />
            <span>Computer Science Capstone Project</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            <span className="text-foreground">About </span>
            <span
              className="text-transparent bg-clip-text inline-block py-1"
              style={{ backgroundImage: "linear-gradient(135deg, #FF8F00 0%, #fbbf24 100%)" }}
            >
              Smart Parking
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A full-stack smart parking lot management system designed and built by 6 passionate
            Computer Science students — bringing modern technology to Myanmar's urban parking challenges.
          </p>

          {/* Location */}
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary" />
            <span>Myanmar · Computer Science Department</span>
          </div>
        </div>
      </section>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-20">

        {/* ── Mission / Vision / Team ─────────────────────────── */}
        <section className="space-y-10">
          <div className="text-center space-y-2">
            <p className="text-primary text-xs font-bold uppercase tracking-widest">What We Stand For</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Driven by Purpose, Built with Passion
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="group p-6 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 space-y-4"
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

        {/* ── Team Section ────────────────────────────────────── */}
        <section className="space-y-10" id="team">
          <div className="text-center space-y-2">
            <p className="text-primary text-xs font-bold uppercase tracking-widest">The People Behind It</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Meet Our Team
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Six dedicated Computer Science students working together to build a smarter future for parking in Myanmar.
            </p>
          </div>

          {/* 2 rows × 3 columns grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member, i) => (
              <TeamMemberCard key={member.name} member={member} index={i} />
            ))}
          </div>
        </section>


      </main>

      <Footer />
    </div>
  )
}
