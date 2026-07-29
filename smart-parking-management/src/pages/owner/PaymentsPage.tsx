import { useState, useEffect, useMemo } from "react"
import { DollarSign, Receipt, Search } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { paymentsApi } from "@/api/payments"
import { usePaginationState } from "@/hooks/usePaginationState"
import { paymentStatusTone } from "@/utils/statusColors"
import { formatCurrency, formatDateTime } from "@/utils/formatters"
import type { PaymentOut } from "@/types"
import type { ListResult } from "@/api/types"

const PAYMENT_METHOD_OPTIONS = [
  { label: "All methods", value: "all" },
  { label: "KBZPay", value: "KBZPAY" },
  { label: "WavePay", value: "WAVEPAY" },
  { label: "AYA Pay", value: "AYAPAY" },
  { label: "UABPay", value: "UABPAY" },
  { label: "Cash", value: "CASH" },
]

export function PaymentsPage() {
  const { setPage, params } = usePaginationState()
  const [methodFilter, setMethodFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [data, setData] = useState<ListResult<PaymentOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const queryParams = useMemo(
    () => ({
      ...params,
      order: "desc" as const,
      search: search || undefined,
      payment_method: methodFilter === "all" ? undefined : methodFilter,
    }),
    [params, methodFilter, search]
  )

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const result = await paymentsApi.list(queryParams)
      setData(result)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    const handler = setTimeout(fetchData, 300)
    return () => clearTimeout(handler)
  }, [queryParams])

  const payments = data?.items ?? []
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
  const paidCount = payments.filter((p) => p.status === "PAID").length

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="View and manage all customer parking session payments." />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <DollarSign className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Revenue (This Page)
              </p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="size-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
              <Receipt className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Paid Sessions (This Page)
              </p>
              <p className="text-2xl font-bold">{paidCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by Txn Ref or method…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v ?? "all"); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton />
          ) : payments.length === 0 ? (
            <EmptyState title="No payments found" description="No payment records match your current filters." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#ID</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Customer ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Txn Ref</TableHead>
                    <TableHead>Paid At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">#{payment.id}</TableCell>
                      <TableCell>#{payment.parking_session_id}</TableCell>
                      <TableCell>#{payment.customer_id}</TableCell>
                      <TableCell className="font-semibold text-emerald-400">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold text-xs">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {payment.transaction_ref || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(payment.paid_at)}</TableCell>
                      <TableCell>
                        <StatusBadge label={payment.status} tone={paymentStatusTone(payment.status)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DataPagination meta={data?.meta} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
