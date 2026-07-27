import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label?: string
  htmlFor?: string
  error?: string
  className?: string
  children: React.ReactNode
  hint?: string
  required?: boolean
}

export function FormField({ label, htmlFor, error, className, children, hint, required }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}
