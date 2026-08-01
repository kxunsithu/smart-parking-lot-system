import * as React from "react"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
}

const Tooltip = ({ children, content }: TooltipProps) => {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="invisible absolute z-50 inline-block w-auto rounded border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        {content}
      </div>
    </div>
  )
}

export { Tooltip }
