import { apiClient } from "@/api/client"
import type { AdminDashboardOut, ApiSuccess, OwnerDashboardOut, StaffDashboardOut } from "@/types"

export const dashboardApi = {
  async admin() {
    const res = await apiClient.get<ApiSuccess<AdminDashboardOut>>("/dashboard/admin")
    return res.data.data
  },

  async owner() {
    const res = await apiClient.get<ApiSuccess<OwnerDashboardOut>>("/dashboard/owner")
    return res.data.data
  },

  async staff() {
    const res = await apiClient.get<ApiSuccess<StaffDashboardOut>>("/dashboard/staff")
    return res.data.data
  },
}
