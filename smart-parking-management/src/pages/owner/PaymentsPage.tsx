import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { paymentsApi } from "@/api/payments"
import { getErrorMessage } from "@/api/client"
import { usePaginationState } from "@/hooks/usePaginationState"
import { paymentStatusTone } from "@/utils/statusColors"
import { formatCurrency, formatDateTime } from "@/utils/formatters"
import type { PaymentOut } from "@/types"
import type { ListResult } from "@/api/types"

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Paid", value: "PAID" },
  { label: "Refunded", value: "REFUNDED" },
]

export function PaymentsPage() {
  const { setPage, params } = usePaginationState()
  const [statusFilter, setStatusFilter] = useState("all")
  const [refundTarget, setRefundTarget] = useState<PaymentOut | null>(null)
  const [data, setData] = useState<ListResult<PaymentOut> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)

  const queryParams = useMemo(() => ({ ...params, status: statusFilter === "all" ? undefined : statusFilter }), [params, statusFilter])

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
    fetchData()
  }, [queryParams])

  const handleRefund = async (id: number) => {
    try {
      setIsRefunding(true)
      await paymentsApi.updateStatus(id, "REFUNDED")
      toast.success("Payment refunded.")
      setRefundTarget(null)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsRefunding(false)
    }
  }

  const payments = data?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="View and manage customer payments." />
      <p className="-mt-4 text-sm text-muted-foreground">Showing all payments visible to your role.</p>

      <Card>
        <CardContent className="space-y-4">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading ? (
            <TableSkeleton />
          ) : payments.length === 0 ? (
            <EmptyState title="No payments found" description="Try adjusting your filters." />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid at</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className={isFetching ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">#{payment.id}</TableCell>
                      <TableCell>{payment.parking_session_id}</TableCell>
                      <TableCell>{payment.customer_id}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>
                        <StatusBadge label={payment.status} tone={paymentStatusTone(payment.status)} />
                      </TableCell>
                      <TableCell>{formatDateTime(payment.paid_at)}</TableCell>
                      <TableCell>
                        {payment.status === "PAID" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem variant="destructive" onClick={() => setRefundTarget(payment)}>
                                Mark as refunded
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
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

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        title="Refund payment?"
        description={`This will mark payment #${refundTarget?.id} as refunded. This action cannot be undone.`}
        confirmLabel="Refund"
        destructive
        loading={isRefunding}
        onConfirm={() => refundTarget && handleRefund(refundTarget.id)}
      />
    </div>
  )
}
