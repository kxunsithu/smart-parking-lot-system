import { apiClient } from "@/api/client"
import type { ApiSuccess, SubscriptionOut, SubscriptionPurchase } from "@/types"

export const subscriptionsApi = {
  async purchase(payload: SubscriptionPurchase): Promise<SubscriptionOut> {
    const res = await apiClient.post<ApiSuccess<SubscriptionOut>>("/subscriptions/purchase", payload)
    return res.data.data
  },

  async renew(payload: SubscriptionPurchase): Promise<SubscriptionOut> {
    const res = await apiClient.post<ApiSuccess<SubscriptionOut>>("/subscriptions/renew", payload)
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
