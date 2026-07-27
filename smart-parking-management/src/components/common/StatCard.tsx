import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  hint?: string
  className?: string
}

export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <Card className={cn("gap-3", className)}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="size-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
