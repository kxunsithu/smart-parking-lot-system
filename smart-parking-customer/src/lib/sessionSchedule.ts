import type { ParkingSessionOut } from "@/api/types"

const ACTIVE_STATUSES = new Set(["ACTIVE", "PENDING"])

export function findCarSessionOverlap(
  start: Date,
  end: Date,
  sessions: ParkingSessionOut[]
): ParkingSessionOut | null {
  for (const session of sessions) {
    if (!ACTIVE_STATUSES.has(session.status)) continue

    const sessionStart = new Date(session.start_time)
    const sessionEnd = session.end_time ? new Date(session.end_time) : new Date()
    const hasGap = end <= sessionStart || start >= sessionEnd
    if (!hasGap) return session
  }

  return null
}
