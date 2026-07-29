import { create } from "zustand"
import type { ParkingLotOut, ParkingSessionOut } from "@/api/types"

interface ParkingState {
  parkingLots: ParkingLotOut[]
  selectedLot: ParkingLotOut | null
  activeSession: ParkingSessionOut | null
  sessions: ParkingSessionOut[]
  setParkingLots: (lots: ParkingLotOut[]) => void
  setSelectedLot: (lot: ParkingLotOut | null) => void
  setActiveSession: (session: ParkingSessionOut | null) => void
  setSessions: (sessions: ParkingSessionOut[]) => void
  addSession: (session: ParkingSessionOut) => void
  updateSession: (id: number, session: ParkingSessionOut) => void
}

export const useParkingStore = create<ParkingState>((set) => ({
  parkingLots: [],
  selectedLot: null,
  activeSession: null,
  sessions: [],
  setParkingLots: (parkingLots) => set({ parkingLots }),
  setSelectedLot: (selectedLot) => set({ selectedLot }),
  setActiveSession: (activeSession) => set({ activeSession }),
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
  updateSession: (id, session) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? session : s)),
      activeSession: state.activeSession?.id === id ? session : state.activeSession,
    })),
}))
