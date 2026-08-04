import axios from "axios"
import { apiClient } from "@/api/client"
import type {
  ApiSuccess,
  WalletAccountCreate,
  WalletAccountOut,
  WalletAccountResolveOut,
  WalletAccountUpdate,
} from "@/types"

function notFoundToNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    throw error
  })
}

export const walletAccountsApi = {
  /** Owner: get their own receiving wallet account (null if not set up) */
  async getMine(): Promise<WalletAccountOut | null> {
    return notFoundToNull(apiClient.get<ApiSuccess<WalletAccountOut>>("/wallet-accounts/me").then((res) => res.data.data))
  },

  /** Owner: create their receiving wallet account */
  async createMine(payload: WalletAccountCreate): Promise<WalletAccountOut> {
    const res = await apiClient.post<ApiSuccess<WalletAccountOut>>("/wallet-accounts/me", payload)
    return res.data.data
  },

  /** Owner: update their receiving wallet account */
  async updateMine(payload: WalletAccountUpdate): Promise<WalletAccountOut> {
    const res = await apiClient.put<ApiSuccess<WalletAccountOut>>("/wallet-accounts/me", payload)
    return res.data.data
  },

  /** Owner: delete their receiving wallet account */
  async deleteMine(): Promise<void> {
    await apiClient.delete("/wallet-accounts/me")
  },

  /** Admin: get the platform (admin) wallet account that receives subscription fees */
  async getPlatform(): Promise<WalletAccountOut | null> {
    return notFoundToNull(apiClient.get<ApiSuccess<WalletAccountOut>>("/wallet-accounts/platform").then((res) => res.data.data))
  },

  /** Admin: create the platform wallet account */
  async createPlatform(payload: WalletAccountCreate): Promise<WalletAccountOut> {
    const res = await apiClient.post<ApiSuccess<WalletAccountOut>>("/wallet-accounts/platform", payload)
    return res.data.data
  },

  /** Admin: update the platform wallet account */
  async updatePlatform(payload: WalletAccountUpdate): Promise<WalletAccountOut> {
    const res = await apiClient.put<ApiSuccess<WalletAccountOut>>("/wallet-accounts/platform", payload)
    return res.data.data
  },

  /** Admin: delete the platform wallet account */
  async deletePlatform(): Promise<void> {
    await apiClient.delete("/wallet-accounts/platform")
  },

  /** Admin: list all wallet accounts (platform + owners) */
  async listAll(): Promise<WalletAccountOut[]> {
    const res = await apiClient.get<ApiSuccess<WalletAccountOut[]>>("/wallet-accounts")
    return res.data.data
  },

  /** Resolve an API key to the digital wallet account details (system name, account name, wallet phone) */
  async resolveApiKey(apiKey: string): Promise<WalletAccountResolveOut> {
    const res = await apiClient.post<ApiSuccess<WalletAccountResolveOut>>("/wallet-accounts/resolve", { api_key: apiKey })
    return res.data.data
  },
}
