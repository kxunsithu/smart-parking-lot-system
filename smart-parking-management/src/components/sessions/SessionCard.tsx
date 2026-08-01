import {
  MoreHorizontal,
  Car,
  User,
  Mail,
  Phone,
  Timer,
  Wallet,
  Square,
  Clock3,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/common/StatusBadge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { sessionStatusTone } from "@/utils/statusColors"
import { formatCurrency, formatDateTime, formatDuration, initials } from "@/utils/formatters"
import type { ParkingSessionOut } from "@/types"

interface SessionCardProps {
  session: ParkingSessionOut
  onFinish?: (session: ParkingSessionOut) => void
}

export function SessionCard({ session, onFinish }: SessionCardProps) {
  const car = session.car
  const customer = session.customer

  return (
    <Card className="overflow-hidden rounded border border-border/80 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col">
      {/* Header */}
      <div className="p-4 pb-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 shrink-0 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Car className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground leading-tight truncate">
                {car?.plate_number ?? `Car #${session.car_id}`}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                <span className="font-mono">Session #{session.id}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Square className="size-3" />
                  {session.slot_number ?? `Slot #${session.slot_id}`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge label={session.status} tone={sessionStatusTone(session.status)} />
            {onFinish && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 hover:bg-muted text-muted-foreground hover:text-foreground rounded">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {session.status === "ACTIVE" && onFinish && (
                    <DropdownMenuItem onClick={() => onFinish(session)}>
                      <LogOut className="size-4 mr-2" />
                      Finish session
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Customer & Car details */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer */}
          <div className="rounded bg-muted/30 border border-border/40 p-3 space-y-1.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <User className="size-3 text-primary" /> Customer
            </p>
            {customer ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                  {initials(customer.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{customer.name}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </p>
                  {customer.phone && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3 shrink-0" />
                      {customer.phone}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Car */}
          <div className="rounded bg-muted/30 border border-border/40 p-3 space-y-1.5 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Car className="size-3 text-primary" /> Car
            </p>
            <p className="font-semibold text-sm text-foreground truncate">
              {car?.plate_number ?? `Car #${session.car_id}`}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {[car?.brand, car?.color].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>

        {/* Session stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted/30 border border-border/40 p-2 space-y-1">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock3 className="size-3 text-primary" /> Start
            </span>
            <p className="font-semibold text-foreground">{formatDateTime(session.start_time)}</p>
          </div>
          <div className="rounded bg-muted/30 border border-border/40 p-2 space-y-1">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock3 className="size-3 text-primary" /> End
            </span>
            <p className="font-semibold text-foreground">{session.end_time ? formatDateTime(session.end_time) : "—"}</p>
          </div>
          <div className="rounded bg-muted/30 border border-border/40 p-2 space-y-1">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Timer className="size-3 text-primary" /> Duration
            </span>
            <p className="font-semibold text-foreground">{session.duration != null ? formatDuration(session.duration) : "—"}</p>
          </div>
          <div className="rounded bg-muted/30 border border-border/40 p-2 space-y-1">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Wallet className="size-3 text-emerald-500" /> Fee
            </span>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">
              {session.fee != null ? formatCurrency(session.fee) : "—"}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function SessionCardGrid({ sessions, isFetching, onFinish }: {
  sessions: ParkingSessionOut[]
  isFetching?: boolean
  onFinish?: (session: ParkingSessionOut) => void
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 ${isFetching ? "opacity-60" : ""}`}>
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onFinish={onFinish}
        />
      ))}
    </div>
  )
}

export function SessionCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="rounded border border-border/80 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 rounded" />
            <Skeleton className="h-12 rounded" />
            <Skeleton className="h-12 rounded" />
            <Skeleton className="h-12 rounded" />
          </div>
        </Card>
      ))}
    </div>
  )
}
