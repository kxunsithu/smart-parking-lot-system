/**
 * ReceiptModal — self-contained transaction receipt for the customer app.
 * Renders a modal overlay (no external Dialog library needed) with all
 * transaction details including payer phone, and a print/save-as-PDF action.
 */
import { useEffect } from "react"
import { X, Printer, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PaymentListOut } from "@/api/types"

interface ReceiptModalProps {
  payment: PaymentListOut | null
  onClose: () => void
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString()} MMK`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusMeta(status: string): {
  label: string
  icon: React.ReactNode
  color: string
  bg: string
} {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Paid",
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-500/10 border-green-500/20",
      }
    case "PENDING":
      return {
        label: "Pending",
        icon: <Clock className="w-4 h-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
      }
    case "FAILED":
      return {
        label: "Failed",
        icon: <XCircle className="w-4 h-4" />,
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
      }
    default:
      return {
        label: status,
        icon: <AlertCircle className="w-4 h-4" />,
        color: "text-muted-foreground",
        bg: "bg-muted border-border",
      }
  }
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildReceiptHtml(payment: PaymentListOut): string {
  const detail =
    payment.kind === "subscription"
      ? payment.package_name ?? "Subscription"
      : [payment.lot_name, payment.plate_number].filter(Boolean).join(" · ")

  const ref =
    payment.wallet_transaction_number ??
    payment.wallet_payment_reference ??
    payment.reference

  const date = formatDateTime(payment.paid_at ?? payment.created_at)
  const statusLabel = statusMeta(payment.status).label

  const rows = [
    { label: "Receipt No.", value: payment.reference },
    { label: "Date", value: date },
    { label: "Type", value: payment.kind },
    { label: "Detail", value: detail || "—" },
    { label: "Transaction No.", value: ref || "—" },
    { label: "Payer", value: payment.payer_name ?? "—" },
    { label: "Payer Phone", value: payment.payer_phone ?? "—" },
    { label: "Receiver Phone", value: payment.receiver_phone ?? "—" },
  ]

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Receipt ${escapeHtml(payment.reference)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; padding: 40px; }
  .receipt { max-width: 420px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 16px; }
  .brand { font-size: 20px; font-weight: 700; }
  .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .status { display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; border: 1px solid #22c55e; color: #15803d; background: #f0fdf4; }
  .details { margin-bottom: 16px; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 13px; }
  .row .label { color: #6b7280; white-space: nowrap; }
  .row .value { font-weight: 500; text-align: right; word-break: break-word; }
  .totals { border-top: 1px solid #e5e7eb; padding-top: 12px; margin-bottom: 16px; }
  .total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding-top: 8px; margin-top: 8px; border-top: 1px solid #e5e7eb; }
  .footer { display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
  @media print { body { padding: 0; } .receipt { border: none; } }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <div class="brand">Smart Parking</div>
        <div class="subtitle">Transaction Receipt</div>
      </div>
      <span class="status">${escapeHtml(statusLabel)}</span>
    </div>
    <div class="details">
      ${rows.map((r) => `<div class="row"><span class="label">${escapeHtml(r.label)}</span><span class="value">${escapeHtml(r.value)}</span></div>`).join("")}
    </div>
    <div class="totals">
      <div class="row"><span class="label">Amount</span><span class="value">${escapeHtml(formatCurrency(payment.amount))}</span></div>
      <div class="row"><span class="label">Service Fee</span><span class="value">${escapeHtml(formatCurrency(payment.fee))}</span></div>
      <div class="total"><span>Total</span><span>${escapeHtml(formatCurrency(payment.total))}</span></div>
    </div>
    <div class="footer">
      <span>${escapeHtml(payment.owner_name ?? "Smart Parking")}</span>
      <span>Thank you for your payment.</span>
    </div>
  </div>
</body>
</html>`
}

function printReceipt(payment: PaymentListOut) {
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  })
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (doc) {
    doc.open()
    doc.write(buildReceiptHtml(payment))
    doc.close()
  }
  const win = iframe.contentWindow
  if (win) {
    const cleanup = () => setTimeout(() => iframe.parentNode?.removeChild(iframe), 100)
    win.onafterprint = cleanup
    win.focus()
    win.print()
    setTimeout(cleanup, 1000)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReceiptModal({ payment, onClose }: ReceiptModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!payment) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [payment, onClose])

  if (!payment) return null

  const meta = statusMeta(payment.status)
  const detail =
    payment.kind === "subscription"
      ? payment.package_name ?? "Subscription"
      : [payment.lot_name, payment.plate_number].filter(Boolean).join(" · ")
  const ref =
    payment.wallet_transaction_number ??
    payment.wallet_payment_reference ??
    payment.reference

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-card border border-border rounded-lg w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <p className="text-base font-semibold leading-tight">Transaction Receipt</p>
            <p className="text-xs text-muted-foreground mt-0.5">Smart Parking</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}
            >
              {meta.icon}
              {meta.label}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close receipt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Receipt No.</p>
              <p className="font-mono text-xs font-medium break-all">{payment.reference}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-xs">{formatDateTime(payment.paid_at ?? payment.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="capitalize">{payment.kind}</p>
            </div>
            {detail && (
              <div>
                <p className="text-xs text-muted-foreground">Detail</p>
                <p>{detail}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Transaction No.</p>
              <p className="font-mono text-xs break-all">{ref || "—"}</p>
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

          {/* Totals */}
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
              <span className="tabular-nums text-primary">{formatCurrency(payment.total)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <span>{payment.owner_name ?? "Smart Parking"}</span>
            <span>Thank you for your payment.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={() => printReceipt(payment)}>
            <Printer className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
