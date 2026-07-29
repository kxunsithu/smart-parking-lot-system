import { apiClient } from "@/api/client"
import type { ApiSuccess, PaginationQuery, PaymentMethod, PaymentOut } from "@/types"
import type { ListResult } from "@/api/types"

export interface CreatePaymentPayload {
  parking_session_id: number
  customer_id?: number
  amount: number
  payment_method: PaymentMethod
  transaction_ref?: string
}

export interface ListPaymentsQuery extends PaginationQuery {
  payment_method?: string
}

export const paymentsApi = {
  async list(params?: ListPaymentsQuery): Promise<ListResult<PaymentOut>> {
    const res = await apiClient.get<ApiSuccess<PaymentOut[]>>("/payments/", { params })
    return {
      items: res.data.data ?? [],
      meta: res.data.meta ?? { page: 1, limit: 10, total: 0, total_pages: 0 },
    }
  },

  async createPayment(payload: CreatePaymentPayload): Promise<PaymentOut> {
    const res = await apiClient.post<ApiSuccess<PaymentOut>>("/payments/", payload)
    return res.data.data
  },
}
