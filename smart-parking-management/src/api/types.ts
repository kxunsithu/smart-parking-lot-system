import type { ApiMeta, PaginationQuery } from "@/types"

export interface ListResult<T> {
  items: T[]
  meta: ApiMeta
}

export type ListParams = PaginationQuery & Record<string, string | number | undefined>
