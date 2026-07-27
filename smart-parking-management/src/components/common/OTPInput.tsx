import { Input } from "@/components/ui/input"

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
}

export function OTPInput({ value, onChange, length = 6, disabled = false }: OTPInputProps) {
  const handleChange = (index: number, newValue: string) => {
    // Only allow numbers
    const numericValue = newValue.replace(/[^0-9]/g, "")
    
    if (numericValue.length > 1) {
      // Handle paste or multiple characters
      const newOTP = value.split("")
      for (let i = 0; i < numericValue.length && index + i < length; i++) {
        newOTP[index + i] = numericValue[i]
      }
      onChange(newOTP.join(""))
    } else if (numericValue.length === 1) {
      // Handle single character input
      const newOTP = value.split("")
      newOTP[index] = numericValue
      onChange(newOTP.join(""))
      
      // Auto-focus next input
      if (index < length - 1 && numericValue) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }
    } else {
      // Handle backspace
      const newOTP = value.split("")
      newOTP[index] = ""
      onChange(newOTP.join(""))
      
      // Focus previous input
      if (index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`)
        prevInput?.focus()
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length)
    onChange(pastedData.padEnd(length, ""))
  }

  return (
    <div className="flex gap-2">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          id={`otp-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="h-12 w-12 text-center text-lg font-semibold"
        />
      ))}
    </div>
  )
}
