import { apiClient } from "@/api/client"
import type { ListParams, ListResult } from "@/api/types"
import type { ApiSuccess, ReservationOut, ReservationStatus } from "@/types"

export interface CreateReservationPayload {
  slot_id: number
  reservation_time: string
  customer_id?: number
}

export interface UpdateReservationPayload {
  reservation_time?: string
}

export const reservationsApi = {
  async list(params?: ListParams): Promise<ListResult<ReservationOut>> {
    const res = await apiClient.get<ApiSuccess<ReservationOut[]>>("/reservations", { params })
    return { items: res.data.data, meta: res.data.meta! }
  },

  async get(id: number) {
    const res = await apiClient.get<ApiSuccess<ReservationOut>>(`/reservations/${id}`)
    return res.data.data
  },

  async create(payload: CreateReservationPayload) {
    const res = await apiClient.post<ApiSuccess<ReservationOut>>("/reservations", payload)
    return res.data.data
  },

  async update(id: number, payload: UpdateReservationPayload) {
    const res = await apiClient.put<ApiSuccess<ReservationOut>>(`/reservations/${id}`, payload)
    return res.data.data
  },

  async updateStatus(id: number, status: ReservationStatus) {
    const res = await apiClient.patch<ApiSuccess<ReservationOut>>(`/reservations/${id}/status`, { status })
    return res.data.data
  },
}
