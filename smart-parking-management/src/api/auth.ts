import { apiClient } from "@/api/client"
import type { ApiSuccess, TokenResponse, UserOut } from "@/types"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  phone?: string
}

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
}

export interface UpdateProfilePayload {
  name?: string
  phone?: string
}

export interface SendOTPPayload {
  email: string
}

export interface VerifyOTPPayload {
  email: string
  code: string
}

export const authApi = {
  async login(payload: LoginPayload) {
    const res = await apiClient.post<ApiSuccess<TokenResponse>>("/auth/login", payload)
    return res.data.data
  },

  async register(payload: RegisterPayload) {
    const res = await apiClient.post<ApiSuccess<UserOut>>("/auth/register", payload)
    return res.data.data
  },

  async sendOTP(payload: SendOTPPayload) {
    const res = await apiClient.post<ApiSuccess<null>>("/auth/send-otp", payload)
    return res.data
  },

  async verifyOTP(payload: VerifyOTPPayload) {
    const res = await apiClient.post<ApiSuccess<null>>("/auth/verify-otp", payload)
    return res.data
  },

  async refresh(refresh_token: string) {
    const res = await apiClient.post<ApiSuccess<TokenResponse>>("/auth/refresh", { refresh_token })
    return res.data.data
  },

  async logout(refresh_token: string) {
    const res = await apiClient.post<ApiSuccess<null>>("/auth/logout", { refresh_token })
    return res.data
  },

  async changePassword(payload: ChangePasswordPayload) {
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

  async updateProfile(payload: UpdateProfilePayload) {
    const res = await apiClient.put<ApiSuccess<UserOut>>("/auth/me", payload)
    return res.data.data
  },
}
