import { apiClient } from "@/api/client"
import type { ApiSuccess } from "@/types"

export interface SubscriptionPlan {
  id: number
  name: string
  description: string | null
  per_slot_price: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Subscription {
  id: number
  parking_owner_id: number
  plan_id: number
  total_slots: number
  total_price: number
  status: string
  created_at: string
  updated_at: string | null
  plan: SubscriptionPlan | null
}

export interface SubscriptionPlanCreate {
  name: string
  description?: string
  per_slot_price: number
  is_active?: boolean
}

export interface SubscriptionPlanUpdate {
  name?: string
  description?: string
  per_slot_price?: number
  is_active?: boolean
}

export interface SubscriptionPurchaseRequest {
  plan_id: number
  total_slots: number
}

export const subscriptionApi = {
  // Subscription Plans (Admin)
  async getPlans(activeOnly: boolean = true) {
    const res = await apiClient.get<ApiSuccess<SubscriptionPlan[]>>("/subscriptions/plans", {
      params: { active_only: activeOnly },
    })
    return res.data.data
  },

  async getPlan(planId: number) {
    const res = await apiClient.get<ApiSuccess<SubscriptionPlan>>(`/subscriptions/plans/${planId}`)
    return res.data.data
  },

  async createPlan(payload: SubscriptionPlanCreate) {
    const res = await apiClient.post<ApiSuccess<SubscriptionPlan>>("/subscriptions/plans", payload)
    return res.data.data
  },

  async updatePlan(planId: number, payload: SubscriptionPlanUpdate) {
    const res = await apiClient.put<ApiSuccess<SubscriptionPlan>>(`/subscriptions/plans/${planId}`, payload)
    return res.data.data
  },

  async deletePlan(planId: number) {
    const res = await apiClient.delete<ApiSuccess<null>>(`/subscriptions/plans/${planId}`)
    return res.data
  },

  // Subscriptions (Owner)
  async getMySubscription() {
    const res = await apiClient.get<ApiSuccess<Subscription | null>>("/subscriptions/me")
    return res.data.data
  },

  async getMySubscriptionStatus() {
    const res = await apiClient.get<ApiSuccess<{ has_subscription: boolean; status: string; message: string; subscription?: Subscription }>>(
      "/subscriptions/me/status",
    )
    return res.data.data
  },

  async purchaseSubscription(payload: SubscriptionPurchaseRequest) {
    const res = await apiClient.post<ApiSuccess<Subscription>>("/subscriptions/purchase", payload)
    return res.data.data
  },

  // Subscriptions (Admin)
  async getSubscription(subscriptionId: number) {
    const res = await apiClient.get<ApiSuccess<Subscription>>(`/subscriptions/${subscriptionId}`)
    return res.data.data
  },

  async updateSubscription(subscriptionId: number, payload: Partial<Subscription>) {
    const res = await apiClient.put<ApiSuccess<Subscription>>(`/subscriptions/${subscriptionId}`, payload)
    return res.data.data
  },

  async cancelSubscription(subscriptionId: number) {
    const res = await apiClient.post<ApiSuccess<Subscription>>(`/subscriptions/${subscriptionId}/cancel`)
    return res.data.data
  },
}
