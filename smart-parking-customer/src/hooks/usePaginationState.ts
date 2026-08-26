import { useMemo, useState } from "react"
import { useDebounce } from "@/hooks/useDebounce"

export function usePaginationState(defaultLimit = 9) {
  const [page, setPage] = useState(1)
  const [limit] = useState(defaultLimit)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 400)

  const params = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch || undefined,
    }),
    [page, limit, debouncedSearch]
  )

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return { page, setPage, limit, search, setSearch: updateSearch, params }
}
