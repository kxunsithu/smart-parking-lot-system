import { useEffect, useState, useRef } from "react"
import { CheckCircle2, Clock, ParkingCircle, Car, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/authStore"
import { parkingSessionsApi } from "@/api/parkingSessions"
import type { ParkingSessionOut } from "@/api/types"
import { formatDateTime, parseApiDateTime } from "@/lib/datetime"
import { useLanguage } from "@/lib/i18n"
import { differenceInMinutes } from "date-fns"

const STORAGE_KEY = "dismissed_finished_session_ids"

function getDismissedIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveDismissedId(id: number) {
  try {
    const current = getDismissedIds()
    if (!current.includes(id)) {
      current.push(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    }
  } catch {
    // Ignore storage quota errors
  }
}

function formatSessionDuration(start: string, end?: string | null): string {
  const startDate = parseApiDateTime(start)
  const endDate = end ? parseApiDateTime(end) : new Date()
  const totalMins = Math.max(1, differenceInMinutes(endDate, startDate))
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

export function SessionEndedModalListener() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const { t } = useLanguage()

  const [alertSession, setAlertSession] = useState<ParkingSessionOut | null>(null)
  const [dismissedIds, setDismissedIds] = useState<number[]>(getDismissedIds)

  // Track known active sessions to detect transitions from active -> finished
  const knownActiveRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!accessToken || !user) {
      setAlertSession(null)
      return
    }

    let isMounted = true

    const checkSessions = async () => {
      try {
        const items = await parkingSessionsApi.list({ limit: 50 })
        if (!isMounted) return

        const currentDismissed = getDismissedIds()
        const now = new Date()

        let sessionToAlert: ParkingSessionOut | null = null

        for (const session of items) {
          // Only alert for sessions that are explicitly FINISHED status
          // OR if time has expired AND session is not ACTIVE anymore
          const isFinishedStatus = session.status === "FINISHED"
          const isTimeExpired =
            session.status !== "ACTIVE" &&
            session.status !== "CANCELLED" &&
            session.end_time != null &&
            parseApiDateTime(session.end_time).getTime() <= now.getTime()

          const isEnded = isFinishedStatus || isTimeExpired

          if (isEnded) {
            if (!currentDismissed.includes(session.id)) {
              sessionToAlert = session
              break
            }
          } else if (session.status === "ACTIVE") {
            knownActiveRef.current.add(session.id)
          }
        }

        if (sessionToAlert && isMounted) {
          setAlertSession(sessionToAlert)
        }
      } catch {
        // Ignore network check errors
      }
    }

    // Initial check
    checkSessions()

    // Poll every 5 seconds to detect status changes or time expiry
    const interval = setInterval(checkSessions, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [accessToken, user])

  const handleAccept = () => {
    if (!alertSession) return
    const id = alertSession.id
    saveDismissedId(id)
    setDismissedIds((prev) => [...prev, id])
    setAlertSession(null)
  }

  if (!alertSession) return null

  const plateNumber = alertSession.car?.plate_number ?? "—"
  const durationText = alertSession.duration
    ? `${Math.floor(alertSession.duration / 60) > 0 ? `${Math.floor(alertSession.duration / 60)}h ` : ""}${alertSession.duration % 60}m`
    : formatSessionDuration(alertSession.start_time, alertSession.end_time)

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-emerald-500/40 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner">
            <CheckCircle2 className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-foreground leading-snug">
            {t("sessions.alert_ended_title", "Parking Session Ended")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("sessions.alert_ended_msg", "Your parking session has been completed and the slot is now free.")}
          </p>
        </div>

        {/* Info Grid */}
        <div className="rounded-lg bg-muted/40 border border-border/60 p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-primary" /> {t("sessions.car", "Car")}
            </span>
            <span className="font-semibold font-mono text-foreground text-sm">{plateNumber}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <ParkingCircle className="w-3.5 h-3.5 text-primary" /> {t("sessions.slot", "Slot")}
            </span>
            <span className="font-medium text-foreground">#{alertSession.slot_id}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" /> {t("sessions.duration", "Duration")}
            </span>
            <span className="font-medium text-foreground">{durationText}</span>
          </div>

          {alertSession.end_time && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {t("sessions.end", "Ended At")}
              </span>
              <span className="font-medium text-foreground">{formatDateTime(alertSession.end_time)}</span>
            </div>
          )}

          {alertSession.fee != null && (
            <div className="flex justify-between items-center border-t border-border/50 pt-2 text-sm font-semibold">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> {t("sessions.fee", "Paid Fee")}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {alertSession.fee.toLocaleString()} MMK
              </span>
            </div>
          )}
        </div>

        {/* Accept Action */}
        <Button
          onClick={handleAccept}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all active:scale-[0.98]"
        >
          {t("sessions.accept", "Accept")}
        </Button>
      </div>
    </div>
  )
}
