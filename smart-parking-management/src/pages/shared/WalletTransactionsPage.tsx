import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowDownLeft, ArrowUpRight, ReceiptText, CreditCard, Receipt } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { DataPagination } from "@/components/common/DataPagination"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { SearchInput } from "@/components/common/SearchInput"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ReceiptDialog } from "@/components/common/ReceiptDialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { paymentsApi } from "@/api/payments"
import { usePaginationState } from "@/hooks/usePaginationState"
import { useAuthStore } from "@/stores/authStore"
import { formatCurrency, formatDateTime } from "@/utils/formatters"
import type { ApiMeta, PaymentListOut } from "@/types"

export function WalletTransactionsPage() {
  const { setPage, params, setSearch, search } = usePaginationState()
  const [items, setItems] = useState<PaymentListOut[]>([])
  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [receiptTarget, setReceiptTarget] = useState<PaymentListOut | null>(null)

  const role = useAuthStore.getState().user?.role?.name
  const isOwner = role === "OWNER"

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const result = await paymentsApi.list(params)
      setItems(result.data)
      setMeta(result.meta)
    } catch (error) {
      console.error("Failed to fetch wallet transactions:", error)
      toast.error("Failed to load wallet transactions.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params])

  const detailText = (p: PaymentListOut): string => {
    if (p.kind === "subscription") return p.package_name ?? "Subscription"
    return [p.lot_name, p.plate_number].filter(Boolean).join(" · ")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet Transactions"
        description={
          isOwner
            ? "Parking fees received into your wallet and your subscription payments."
            : "All external wallet payments across parking sessions and subscriptions."
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by reference number..." className="w-full sm:max-w-sm" />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Completed wallet payments for parking sessions and subscriptions will appear here."
          icon={ReceiptText}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payer</TableHead>
                {isOwner && <TableHead>Direction</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs" title={p.wallet_transaction_number ?? p.wallet_payment_reference ?? undefined}>
                    {p.reference}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium capitalize">{p.kind}</p>
                        <p className="text-xs text-muted-foreground">{detailText(p)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{p.payer_name ?? "—"}</p>
                    {p.payer_phone && <p className="text-xs text-muted-foreground">{p.payer_phone}</p>}
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      {p.direction === "received" ? (
                        <span className="inline-flex items-center gap-1">
                          <ArrowDownLeft className="size-3 text-emerald-500" />
                          <StatusBadge label="Received" tone="success" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpRight className="size-3 text-blue-500" />
                          <StatusBadge label="Paid" tone="info" />
                        </span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right tabular-nums">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(p.fee)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(p.total)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(p.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="View receipt"
                      onClick={() => setReceiptTarget(p)}
                    >
                      <Receipt className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DataPagination meta={meta} onPageChange={setPage} />

      <ReceiptDialog
        payment={receiptTarget}
        onOpenChange={(open) => !open && setReceiptTarget(null)}
        isOwner={isOwner}
      />
    </div>
  )
}
