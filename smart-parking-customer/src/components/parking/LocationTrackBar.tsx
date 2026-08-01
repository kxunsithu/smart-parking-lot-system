import { MapPin } from "lucide-react"

export function LocationTrackBar({
  lotName,
  floorName,
  slotNumber,
  onTrack,
  showTrack = true,
}: {
  lotName: string
  floorName: string
  slotNumber: string
  onTrack: () => void
  showTrack?: boolean
}) {
  return (
    <div className="p-3 rounded bg-muted/40 border border-border/40 flex items-center justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1">
            Location
          </p>
          <p className="text-xs font-semibold text-foreground truncate">
            {lotName} — {floorName} (Slot {slotNumber})
          </p>
        </div>
      </div>
      {showTrack && (
        <button
          type="button"
          onClick={onTrack}
          className="shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded transition-colors border border-primary/20"
        >
          Track
        </button>
      )}
    </div>
  )
}
