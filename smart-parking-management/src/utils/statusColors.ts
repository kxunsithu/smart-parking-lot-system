export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral"

const SLOT_STATUS_TONE: Record<string, BadgeTone> = {
  AVAILABLE: "success",
  OCCUPIED: "danger",
}

const SESSION_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "info",
  FINISHED: "success",
}

const USER_STATUS_TONE: Record<string, BadgeTone> = {
  true: "success",
  false: "danger",
}

export function slotStatusTone(status: string): BadgeTone {
  return SLOT_STATUS_TONE[status] ?? "neutral"
}

export function sessionStatusTone(status: string): BadgeTone {
  return SESSION_STATUS_TONE[status] ?? "neutral"
}

export function activeStatusTone(isActive: boolean): BadgeTone {
  return USER_STATUS_TONE[String(isActive)] ?? "neutral"
}

export const badgeToneClasses: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-transparent",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-transparent",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-transparent",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-transparent",
  neutral: "bg-muted text-muted-foreground border-transparent",
}
