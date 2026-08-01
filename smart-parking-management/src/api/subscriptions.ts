import { apiClient } from "@/api/client"
import type {
  ApiSuccess,
  SubscriptionOut,
  SubscriptionPurchase,
  SubscriptionPayResult,
  WalletPaymentConfirm,
  WalletPaymentOut,
} from "@/types"

export const subscriptionsApi = {
  /** Owner/Admin: create a PENDING subscription; becomes ACTIVE after wallet payment */
  async purchase(payload: SubscriptionPurchase): Promise<SubscriptionOut> {
    const res = await apiClient.post<ApiSuccess<SubscriptionOut>>("/subscriptions/purchase", payload)
    return res.data.data
  },

  /** Owner/Admin: request a renewal (PENDING until wallet payment) */
  async renew(payload: SubscriptionPurchase): Promise<SubscriptionOut> {
    const res = await apiClient.post<ApiSuccess<SubscriptionOut>>("/subscriptions/renew", payload)
    return res.data.data
  },

  /** Owner/Admin: request a wallet payment for a PENDING subscription (returns OTP) */
  async payInitiate(subscriptionId: number): Promise<WalletPaymentOut> {
    const res = await apiClient.post<ApiSuccess<WalletPaymentOut>>(`/subscriptions/${subscriptionId}/pay/initiate`)
    return res.data.data
  },

  /** Owner/Admin: confirm the wallet payment (OTP + PIN) to activate the subscription */
  async payConfirm(subscriptionId: number, data: WalletPaymentConfirm): Promise<SubscriptionPayResult> {
    const res = await apiClient.post<ApiSuccess<SubscriptionPayResult>>(
      `/subscriptions/${subscriptionId}/pay/confirm`,
      data
    )
    return res.data.data
  },

  async getMySubscriptions(): Promise<SubscriptionOut[]> {
    const res = await apiClient.get<ApiSuccess<SubscriptionOut[]>>("/subscriptions/me")
    return res.data.data
  },

  async getActive(): Promise<SubscriptionOut | null> {
    const res = await apiClient.get<ApiSuccess<SubscriptionOut | null>>("/subscriptions/active")
    return res.data.data
  },

  async listAll(params?: { page?: number; limit?: number }): Promise<{ data: SubscriptionOut[]; meta: unknown }> {
    const res = await apiClient.get<ApiSuccess<SubscriptionOut[]>>("/subscriptions", { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  async toggleStatus(subscriptionId: number): Promise<SubscriptionOut> {
    const res = await apiClient.patch<ApiSuccess<SubscriptionOut>>(`/subscriptions/${subscriptionId}/toggle-status`)
    return res.data.data
  },
}
