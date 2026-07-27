import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { badgeToneClasses, type BadgeTone } from "@/utils/statusColors"

interface StatusBadgeProps {
  label: string
  tone: BadgeTone
  className?: string
}

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(badgeToneClasses[tone], "font-medium", className)}>
      {label}
    </Badge>
  )
}
