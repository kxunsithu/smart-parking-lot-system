const HAS_TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/i

/** Parse API datetime strings. Naive ISO values from the backend are stored as UTC. */
export function parseApiDateTime(value: string): Date {
  const trimmed = value.trim()
  if (HAS_TIMEZONE_SUFFIX.test(trimmed)) {
    return new Date(trimmed)
  }
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T")
  return new Date(`${normalized}Z`)
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "-"
  return `${Math.round(amount).toLocaleString("en-US")} MMK`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-"
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "-"
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining}m`
  return `${hours}h ${remaining}m`
}

export function toDatetimeLocalInput(value: string | null | undefined): string {
  if (!value) return ""
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}
