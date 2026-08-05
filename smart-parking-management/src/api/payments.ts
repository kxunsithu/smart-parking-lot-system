import { apiClient } from "@/api/client"
import type { ApiMeta, ApiSuccess, PaginationQuery, PaymentListOut } from "@/types"

export interface PaymentListResult {
  data: PaymentListOut[]
  meta: ApiMeta
}

export const paymentsApi = {
  /** Admin: every wallet transaction; Owner: own wallet's received fees + subscription payments */
  async list(params?: PaginationQuery): Promise<PaymentListResult> {
    const res = await apiClient.get<ApiSuccess<PaymentListOut[]>>("/payments", { params })
    return { data: res.data.data, meta: res.data.meta ?? { page: 1, limit: 10, total: 0, total_pages: 0 } }
  },
}
