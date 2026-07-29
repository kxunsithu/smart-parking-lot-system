import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { UserOut } from "@/api/types"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserOut | null
  isVerifying: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserOut) => void
  setVerifying: (isVerifying: boolean) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isVerifying: false,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setVerifying: (isVerifying) => set({ isVerifying }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, isVerifying: false }),
      isAuthenticated: () => Boolean(get().accessToken && get().user),
    }),
    {
      name: "smart-parking-customer-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isVerifying: state.isVerifying,
      }),
    }
  )
)
