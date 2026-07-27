import { apiClient } from "@/api/client"
import type { ApiSuccess, PaymentMethod } from "@/types"
import type {
  ParkingSessionPaymentOut,
  ReservationPaymentOut,
  SubscriptionPaymentOut,
} from "@/types"

export interface CreateSubscriptionPaymentPayload {
  subscription_id: number
  amount: number
  payment_method: PaymentMethod
}

export interface CreateSessionPaymentPayload {
  parking_session_id: number
  customer_id: number
  amount: number
  payment_method: PaymentMethod
}

export interface CreateReservationPaymentPayload {
  reservation_id: number
  customer_id: number
  amount: number
  payment_method: PaymentMethod
}

export const paymentsApi = {
  // Subscription Payments
  async createSubscriptionPayment(payload: CreateSubscriptionPaymentPayload): Promise<SubscriptionPaymentOut> {
    const res = await apiClient.post<ApiSuccess<SubscriptionPaymentOut>>("/payments/subscription", payload)
    return res.data.data
  },

  // Parking Session Payments
  async createSessionPayment(payload: CreateSessionPaymentPayload): Promise<ParkingSessionPaymentOut> {
    const res = await apiClient.post<ApiSuccess<ParkingSessionPaymentOut>>("/payments/session", payload)
    return res.data.data
  },

  // Reservation Payments
  async createReservationPayment(payload: CreateReservationPaymentPayload): Promise<ReservationPaymentOut> {
    const res = await apiClient.post<ApiSuccess<ReservationPaymentOut>>("/payments/reservation", payload)
    return res.data.data
  },
}
