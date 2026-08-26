import apiClient from "./client"
import type { ApiSuccess, UserOut, TokenResponse, LoginRequest, RegisterRequest, SendOTPRequest, VerifyOTPRequest, ChangePasswordRequest, UserUpdate } from "./types"

export const authApi = {
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<ApiSuccess<TokenResponse>>("/auth/login", credentials)
    return response.data.data
  },

  register: async (data: RegisterRequest): Promise<UserOut> => {
    const response = await apiClient.post<ApiSuccess<UserOut>>("/auth/register", data)
    return response.data.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post<ApiSuccess<null>>("/auth/logout", {
      refresh_token: refreshToken,
    })
  },

  getMe: async (): Promise<UserOut> => {
    const response = await apiClient.get<ApiSuccess<UserOut>>("/auth/me")
    return response.data.data
  },

  updateProfile: async (data: UserUpdate): Promise<UserOut> => {
    const response = await apiClient.put<ApiSuccess<UserOut>>("/auth/me", data)
    return response.data.data
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post<ApiSuccess<null>>("/auth/change-password", data)
  },

  sendOTP: async (data: SendOTPRequest): Promise<void> => {
    await apiClient.post<ApiSuccess<null>>("/auth/send-otp", data)
  },

  verifyOTP: async (data: VerifyOTPRequest): Promise<TokenResponse> => {
    const response = await apiClient.post<ApiSuccess<TokenResponse>>("/auth/verify-otp", data)
    return response.data.data
  },

  getOtpStatus: async (email: string): Promise<{
    expires_at: string | null
    created_at: string | null
    is_used: boolean | null
  }> => {
    const response = await apiClient.get<ApiSuccess<{
      expires_at: string | null
      created_at: string | null
      is_used: boolean | null
    }>>("/auth/otp-status", { params: { email } })
    return response.data.data
  },

  uploadProfileImage: async (file: File): Promise<UserOut> => {
    const formData = new FormData()
    formData.append("file", file)
    const response = await apiClient.post<ApiSuccess<UserOut>>("/auth/me/profile-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data.data
  },

  deleteProfileImage: async (): Promise<UserOut> => {
    const response = await apiClient.delete<ApiSuccess<UserOut>>("/auth/me/profile-image")
    return response.data.data
  },

  resetPassword: async (data: { email: string; otp: string; new_password: string }): Promise<void> => {
    await apiClient.post<ApiSuccess<null>>("/auth/reset-password", data)
  },
}
