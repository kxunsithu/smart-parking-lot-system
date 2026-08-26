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

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-"
  const date = parseApiDateTime(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
