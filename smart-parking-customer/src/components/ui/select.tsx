import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface CustomSelectProps {
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  onValueChange?: (value: string) => void
  placeholder?: string
  options?: SelectOption[]
  className?: string
  disabled?: boolean
  children?: React.ReactNode
  id?: string
}

export function Select({
  value,
  onChange,
  onValueChange,
  placeholder = "Select...",
  options: customOptions,
  className,
  disabled = false,
  children,
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Extract options from children <option> elements if options prop is not passed directly
  const options: SelectOption[] = customOptions || (
    React.Children.map(children, (child) => {
      if (React.isValidElement(child) && (child.type === "option" || child.props?.value !== undefined)) {
        const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>
        return {
          value: String(props.value ?? ""),
          label: String(props.children ?? props.value ?? ""),
          disabled: Boolean(props.disabled),
        }
      }
      return null
    })?.filter(Boolean) as SelectOption[]
  ) || []

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0]

  const handleSelect = (optionValue: string) => {
    if (disabled) return
    onValueChange?.(optionValue)
    onChange?.({ target: { value: optionValue } })
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-2xs transition-all hover:bg-card/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-medium",
          className,
          isOpen && "ring-2 ring-primary/30 border-primary"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2", isOpen && "rotate-180 text-primary")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl animate-in fade-in-0 zoom-in-95">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer select-none text-left mb-0.5 last:mb-0",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground hover:bg-primary/15 hover:text-primary active:bg-primary/20",
                  opt.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="size-4 shrink-0 ml-2" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
