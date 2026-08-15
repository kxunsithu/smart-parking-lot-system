import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  length?: number
}

export function OTPInput({ value, onChange, disabled = false, length = 6 }: OTPInputProps) {
  const handleChange = (index: number, char: string) => {
    const newValue = value.split("")
    newValue[index] = char
    const result = newValue.join("")
    
    if (result.length <= length) {
      onChange(result)
      
      // Auto-focus next input
      if (char && index < length - 1) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          id={`otp-${index}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={cn(
            "w-12 h-14 text-center text-xl font-bold rounded-lg border bg-background",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          )}
        />
      ))}
    </div>
  )
}
