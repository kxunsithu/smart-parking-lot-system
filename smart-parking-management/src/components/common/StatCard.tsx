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
    <Card className={cn("gap-0 p-5", className)}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground">{label}</span>
          {Icon ? (
            <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
              <Icon className="size-4" />
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="truncate text-3xl font-extrabold text-foreground">{value}</span>
          {hint ? <span className="text-xs font-medium text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}
