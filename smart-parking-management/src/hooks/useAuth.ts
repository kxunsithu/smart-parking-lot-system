import { useAuthStore } from "@/stores/authStore"

/** Convenience hook exposing the current authenticated user and role helpers. */
export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const logout = useAuthStore((s) => s.logout)

  return {
    user,
    isAuthenticated: Boolean(accessToken && user),
    role: user?.role?.name ?? null,
    logout,
  }
}
