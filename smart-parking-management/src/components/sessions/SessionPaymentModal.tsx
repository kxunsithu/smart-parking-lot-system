import { useState } from "react"
import { toast } from "sonner"
import { CreditCard, QrCode, ShieldCheck, Check, Loader2, DollarSign } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import { paymentsApi } from "@/api/payments"
import { getErrorMessage } from "@/api/client"
import { formatCurrency, formatDuration } from "@/utils/formatters"
import type { ParkingSessionOut, PaymentMethod } from "@/types"

const PAYMENT_METHODS: { id: PaymentMethod; name: string; account: string; phone: string }[] = [
  { id: "KBZPAY", name: "KBZPay", account: "Smart Parking Lot", phone: "09-400123456" },
  { id: "WAVEPAY", name: "WavePay", account: "Smart Parking Lot", phone: "09-400123456" },
  { id: "AYAPAY", name: "AYA Pay", account: "Smart Parking Lot", phone: "09-400123456" },
  { id: "UABPAY", name: "UABPay", account: "Smart Parking Lot", phone: "09-400123456" },
  { id: "CASH", name: "Cash / Counter", account: "Counter Cashier", phone: "Direct Staff Verification" },
]

interface SessionPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: ParkingSessionOut | null
  onSuccess: () => void
}

export function SessionPaymentModal({
  open,
  onOpenChange,
  session,
  onSuccess,
}: SessionPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("KBZPAY")
  const [transactionRef, setTransactionRef] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeMethodInfo = PAYMENT_METHODS.find((m) => m.id === selectedMethod) ?? PAYMENT_METHODS[0]

  const handleConfirm = async () => {
    if (!session || session.fee == null) return

    try {
      setIsSubmitting(true)
      await paymentsApi.createPayment({
        parking_session_id: session.id,
        amount: session.fee,
        payment_method: selectedMethod,
        transaction_ref: transactionRef.trim() || undefined,
      })

      toast.success(`Payment of ${formatCurrency(session.fee)} recorded successfully!`)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedMethod("KBZPAY")
      setTransactionRef("")
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-indigo-500" />
            Collect Session Payment
          </DialogTitle>
          <DialogDescription>
            Select payment method and confirm receipt of parking fee.
          </DialogDescription>
        </DialogHeader>

        {session && (
          <div className="space-y-5 py-2">
            {/* Session Summary Card */}
            <div className="bg-slate-900 text-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80">Session Reference</span>
                <span className="font-semibold">#{session.id}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-80">Vehicle ID / Slot</span>
                <span className="font-medium">Vehicle #{session.vehicle_id} · Slot #{session.slot_id}</span>
              </div>
              {session.duration != null && (
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-80">Total Duration</span>
                  <span className="font-medium">{formatDuration(session.duration)}</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                <span className="font-medium">Total Fee Due</span>
                <span className="text-xl font-bold text-amber-400">
                  {session.fee != null ? formatCurrency(session.fee) : "0 MMK"}
                </span>
              </div>
            </div>

            {/* Payment Method Grid */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethod === method.id
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/10 ring-2 ring-indigo-500"
                          : "border-border hover:bg-slate-800/40"
                      }`}
                    >
                      <span className="text-xs font-semibold">{method.name}</span>
                      {isSelected && <Check className="size-4 text-indigo-500 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Simulated QR / Account Info */}
            <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  {selectedMethod === "CASH" ? <DollarSign className="size-6" /> : <QrCode className="size-6" />}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Transfer Info ({activeMethodInfo.name})
                  </p>
                  <p className="text-sm font-semibold">{activeMethodInfo.account}</p>
                  <p className="text-xs font-mono text-indigo-400">{activeMethodInfo.phone}</p>
                </div>
              </div>
            </div>

            {/* Transaction Ref Input */}
            <FormField
              label="Transaction ID / Receipt Reference"
              htmlFor="txn_ref"
            >
              <Input
                id="txn_ref"
                placeholder="e.g. TXN987654321 or Counter Receipt No."
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </FormField>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Payment status will immediately update to PAID.</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleConfirm}>
            {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Confirm Payment {session?.fee != null ? formatCurrency(session.fee) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
