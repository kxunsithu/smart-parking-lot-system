import { create } from "zustand"
import type { VehicleOut } from "@/api/types"

interface VehicleState {
  vehicles: VehicleOut[]
  selectedVehicle: VehicleOut | null
  setVehicles: (vehicles: VehicleOut[]) => void
  setSelectedVehicle: (vehicle: VehicleOut | null) => void
  addVehicle: (vehicle: VehicleOut) => void
  updateVehicle: (id: number, vehicle: VehicleOut) => void
  removeVehicle: (id: number) => void
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicles: [],
  selectedVehicle: null,
  setVehicles: (vehicles) => set({ vehicles }),
  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
  addVehicle: (vehicle) => set((state) => ({ vehicles: [...state.vehicles, vehicle] })),
  updateVehicle: (id, vehicle) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === id ? vehicle : v)),
    })),
  removeVehicle: (id) =>
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== id),
    })),
}))
