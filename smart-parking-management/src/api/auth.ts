import { apiClient } from "@/api/client"
import type { ApiSuccess, TokenResponse, UserOut, LoginRequest, ChangePasswordRequest, SendOTPRequest, VerifyOTPRequest, RegisterOwnerRequest, UserUpdate } from "@/types"

export const authApi = {
  async login(payload: LoginRequest) {
    const res = await apiClient.post<ApiSuccess<TokenResponse>>("/auth/login", payload)
    return res.data.data
  },

  async sendOTP(payload: SendOTPRequest) {
    const res = await apiClient.post<ApiSuccess<null>>("/auth/send-otp", payload)
    return res.data
  },

  async verifyOTP(payload: VerifyOTPRequest) {
    const res = await apiClient.post<ApiSuccess<TokenResponse>>("/auth/verify-otp", payload)
    return res.data.data
  },

  async refresh(refresh_token: string) {
    const res = await apiClient.post<ApiSuccess<TokenResponse>>("/auth/refresh", { refresh_token })
    return res.data.data
  },

  async logout(refresh_token: string) {
    const res = await apiClient.post<ApiSuccess<null>>("/auth/logout", { refresh_token })
    return res.data
  },

  async changePassword(payload: ChangePasswordRequest) {
    const res = await apiClient.post<ApiSuccess<null>>("/auth/change-password", payload)
    return res.data
  },

  async me() {
    const res = await apiClient.get<ApiSuccess<UserOut>>("/auth/me")
    return res.data.data
  },

  async getOtpStatus(email: string) {
    const res = await apiClient.get<ApiSuccess<{ expires_at: string | null; created_at: string | null; is_used: boolean | null }>>("/auth/otp-status", {
      params: { email }
    })
    return res.data.data
  },

  async updateProfile(payload: UserUpdate) {
    const res = await apiClient.put<ApiSuccess<UserOut>>("/auth/me", payload)
    return res.data.data
  },

  async registerOwner(payload: RegisterOwnerRequest) {
    const res = await apiClient.post<ApiSuccess<UserOut>>("/auth/register-owner", payload)
    return res.data.data
  },

  async uploadProfileImage(file: File): Promise<UserOut> {
    const formData = new FormData()
    formData.append("file", file)
    const res = await apiClient.post<ApiSuccess<UserOut>>("/auth/me/profile-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data.data
  },

  async deleteProfileImage(): Promise<UserOut> {
    const res = await apiClient.delete<ApiSuccess<UserOut>>("/auth/me/profile-image")
    return res.data.data
  },

  async resetPassword(payload: { email: string; otp: string; new_password: string }) {
    const res = await apiClient.post<ApiSuccess<null>>("/auth/reset-password", payload)
    return res.data
  },
}