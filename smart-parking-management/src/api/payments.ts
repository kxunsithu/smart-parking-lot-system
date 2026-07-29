import { apiClient } from "@/api/client"
import type { ApiSuccess, PaymentMethod, PaymentOut } from "@/types"

export interface CreatePaymentPayload {
  parking_session_id: number
  customer_id?: number
  amount: number
  payment_method: PaymentMethod
}

export const paymentsApi = {
  async createPayment(payload: CreatePaymentPayload): Promise<PaymentOut> {
    const res = await apiClient.post<ApiSuccess<PaymentOut>>("/payments/", payload)
    return res.data.data
  },
}
