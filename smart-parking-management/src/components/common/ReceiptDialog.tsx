import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/common/StatusBadge"
import { formatCurrency, formatDateTime } from "@/utils/formatters"
import type { PaymentListOut } from "@/types"

interface ReceiptDialogProps {
  payment: PaymentListOut | null
  onOpenChange: (open: boolean) => void
  isOwner: boolean
}

function statusMeta(status: string): { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" } {
  switch (status) {
    case "COMPLETED":
      return { label: "Paid", tone: "success" }
    case "PENDING":
      return { label: "Pending", tone: "warning" }
    case "FAILED":
      return { label: "Failed", tone: "danger" }
    case "EXPIRED":
      return { label: "Expired", tone: "neutral" }
    default:
      return { label: status, tone: "neutral" }
  }
}

export function ReceiptDialog({ payment, onOpenChange, isOwner }: ReceiptDialogProps) {
  if (!payment) return null

  const meta = statusMeta(payment.status)
  const detail = payment.kind === "subscription" ? (payment.package_name ?? "Subscription") : [payment.lot_name, payment.plate_number].filter(Boolean).join(" · ")
  const ref = payment.wallet_transaction_number ?? payment.wallet_payment_reference ?? payment.reference

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="receipt-print-area sm:max-w-lg">
        <DialogHeader className="no-print">
          <DialogTitle>Transaction Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between border-b pb-3">
            <div>
              <p className="text-lg font-semibold leading-tight">Smart Parking</p>
              <p className="text-xs text-muted-foreground">Transaction Receipt</p>
            </div>
            <StatusBadge label={meta.label} tone={meta.tone} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Receipt No.</p>
              <p className="font-mono text-xs font-medium">{payment.reference}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p>{formatDateTime(payment.paid_at ?? payment.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="capitalize">{payment.kind}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Detail</p>
              <p>{detail}</p>
            </div>
            {isOwner && payment.direction ? (
              <div>
                <p className="text-xs text-muted-foreground">Direction</p>
                <p className="capitalize">{payment.direction}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">Transaction No.</p>
              <p className="font-mono text-xs">{ref}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payer</p>
              <p>{payment.payer_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payer Phone</p>
              <p>{payment.payer_phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receiver Phone</p>
              <p>{payment.receiver_phone ?? "—"}</p>
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="tabular-nums">{formatCurrency(payment.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Service Fee</span>
              <span className="tabular-nums">{formatCurrency(payment.fee)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-1.5 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(payment.total)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{payment.owner_name ?? "Smart Parking"}</span>
            <span>Thank you for your payment.</span>
          </div>
        </div>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Print / Save as PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
