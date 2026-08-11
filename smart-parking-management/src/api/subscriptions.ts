import { apiClient } from "@/api/client"
import type {
  ApiSuccess,
  SubscriptionOut,
  SubscriptionPaymentConfirm,
  SubscriptionPaymentInitiate,
  SubscriptionPayResult,
  WalletPaymentOut,
} from "@/types"

export const subscriptionsApi = {
  /** Owner: initiate wallet payment for package purchase/renewal without up-front subscription record */
  async payInitiate(data: SubscriptionPaymentInitiate): Promise<WalletPaymentOut> {
    const res = await apiClient.post<ApiSuccess<WalletPaymentOut>>("/subscriptions/pay/initiate", data)
    return res.data.data
  },

  /** Owner: confirm the subscription wallet payment (OTP + PIN) to activate the subscription */
  async payConfirm(data: SubscriptionPaymentConfirm): Promise<SubscriptionPayResult> {
    const res = await apiClient.post<ApiSuccess<SubscriptionPayResult>>("/subscriptions/pay/confirm", data)
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
