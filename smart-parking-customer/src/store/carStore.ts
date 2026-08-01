import { create } from "zustand"
import type { CarOut } from "@/api/types"

interface CarState {
  cars: CarOut[]
  selectedCar: CarOut | null
  setCars: (cars: CarOut[]) => void
  setSelectedCar: (car: CarOut | null) => void
  addCar: (car: CarOut) => void
  updateCar: (id: number, car: CarOut) => void
  removeCar: (id: number) => void
}

export const useCarStore = create<CarState>((set) => ({
  cars: [],
  selectedCar: null,
  setCars: (cars) => set({ cars }),
  setSelectedCar: (car) => set({ selectedCar: car }),
  addCar: (car) => set((state) => ({ cars: [...state.cars, car] })),
  updateCar: (id, car) =>
    set((state) => ({
      cars: state.cars.map((c) => (c.id === id ? car : c)),
    })),
  removeCar: (id) =>
    set((state) => ({
      cars: state.cars.filter((c) => c.id !== id),
    })),
}))
