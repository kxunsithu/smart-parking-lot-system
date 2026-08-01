import { parkingSlotsApi } from "@/api/parkingSlots"
import { parkingFloorsApi } from "@/api/parkingFloors"
import { parkingLotsApi } from "@/api/parkingLots"

export type SlotTrackDetails = {
  slotNumber: string
  floorName: string
  latitude?: number | null
  longitude?: number | null
}

export type ParkingTrackTarget = SlotTrackDetails & {
  lotName: string
  latitude: number
  longitude: number
}

export type SlotTrackContext = SlotTrackDetails & {
  lotName: string
  googleMapUrl?: string | null
}

export function trackParkingSlot(
  details: SlotTrackDetails,
  lot: { name: string; google_map_url?: string | null },
  onNavigate: (target: ParkingTrackTarget) => void
) {
  if (details.latitude != null && details.longitude != null) {
    onNavigate({
      ...details,
      lotName: lot.name,
      latitude: details.latitude,
      longitude: details.longitude,
    })
    return
  }

  if (lot.google_map_url) {
    window.open(lot.google_map_url, "_blank", "noopener,noreferrer")
    return
  }

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lot.name} Parking Slot ${details.slotNumber}`)}`,
    "_blank",
    "noopener,noreferrer"
  )
}

export async function loadSlotTrackContext(slotId: number): Promise<SlotTrackContext | null> {
  try {
    const slot = await parkingSlotsApi.get(slotId)
    const floor = await parkingFloorsApi.get(slot.floor_id)
    const lot = await parkingLotsApi.get(floor.parking_lot_id)
    return {
      slotNumber: slot.slot_number,
      floorName: floor.floor_name || `Floor ${floor.id}`,
      latitude: slot.latitude,
      longitude: slot.longitude,
      lotName: lot.name,
      googleMapUrl: lot.google_map_url,
    }
  } catch (e) {
    console.error("Failed to load slot track context", e)
    return null
  }
}
