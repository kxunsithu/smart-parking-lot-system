import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  Building2,
  Users,
  RefreshCw,
  ShoppingCart,
  Loader2,
  AlertTriangle,
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { packagesApi } from "@/api/packages"
import { subscriptionsApi } from "@/api/subscriptions"
import { getErrorMessage } from "@/api/client"
import type { PackageOut, SubscriptionOut, SubscriptionStatus } from "@/types"

function formatPrice(price: number): string {
  return price.toLocaleString("en-US", { style: "currency", currency: "MMK", maximumFractionDigits: 0 })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function daysRemaining(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function subscriptionStatusTone(status: SubscriptionStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "ACTIVE": return "success"
    case "EXPIRED": return "warning"
    case "CANCELLED": return "danger"
    default: return "neutral"
  }
}

const TIER_COLORS: Record<string, string> = {
  Basic: "from-slate-700 to-slate-600",
  Pro: "from-indigo-700 to-indigo-600",
  Enterprise: "from-amber-700 to-amber-600",
}

const TIER_ACCENT: Record<string, string> = {
  Basic: "border-slate-500",
  Pro: "border-indigo-500",
  Enterprise: "border-amber-500",
}

const PAYMENT_METHODS = [
  { id: "KBZPAY", name: "KBZPay", color: "bg-blue-600 text-white", phone: "09-400123456", account: "Smart Parking Co., Ltd" },
  { id: "WAVEPAY", name: "WavePay", color: "bg-yellow-500 text-black", phone: "09-400123456", account: "Smart Parking Co., Ltd" },
  { id: "AYAPAY", name: "AYA Pay", color: "bg-red-600 text-white", phone: "09-400123456", account: "Smart Parking Co., Ltd" },
  { id: "UABPAY", name: "UABPay", color: "bg-purple-600 text-white", phone: "09-400123456", account: "Smart Parking Co., Ltd" },
  { id: "CASH", name: "Cash / Counter", color: "bg-slate-700 text-white", phone: "N/A", account: "Direct Admin Verification" },
]

export function OwnerSubscriptionPage() {
  const [activeSub, setActiveSub] = useState<SubscriptionOut | null | undefined>(undefined)
  const [history, setHistory] = useState<SubscriptionOut[]>([])
  const [packages, setPackages] = useState<PackageOut[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Payment Modal State
  const [selectedPkg, setSelectedPkg] = useState<PackageOut | null>(null)
  const [paymentActionType, setPaymentActionType] = useState<"purchase" | "renew">("purchase")
  const [selectedMethod, setSelectedMethod] = useState("KBZPAY")
  const [transactionRef, setTransactionRef] = useState("")
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const [active, subs, pkgs] = await Promise.all([
        subscriptionsApi.getActive(),
        subscriptionsApi.getMySubscriptions(),
        packagesApi.list({ limit: 20 }),
      ])
      setActiveSub(active)
      setHistory(subs)
      setPackages(pkgs.data.filter((p) => p.is_active))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openPaymentModal = (pkg: PackageOut, actionType: "purchase" | "renew") => {
    setSelectedPkg(pkg)
    setPaymentActionType(actionType)
    setSelectedMethod("KBZPAY")
    setTransactionRef("")
  }

  const handleConfirmPayment = async () => {
    if (!selectedPkg) return
    try {
      setIsSubmittingPayment(true)
      const payload = {
        package_id: selectedPkg.id,
        payment_method: selectedMethod,
        transaction_ref: transactionRef.trim() || undefined,
      }

      if (paymentActionType === "renew") {
        await subscriptionsApi.renew(payload)
        toast.success(`Package "${selectedPkg.name}" successfully renewed!`)
      } else {
        await subscriptionsApi.purchase(payload)
        toast.success(`Subscribed to "${selectedPkg.name}" plan!`)
      }

      setSelectedPkg(null)
      fetchAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const days = activeSub ? daysRemaining(activeSub.expires_at) : 0
  const isExpiringSoon = activeSub?.status === "ACTIVE" && days <= 7 && days > 0
  const activeMethodInfo = PAYMENT_METHODS.find((m) => m.id === selectedMethod) ?? PAYMENT_METHODS[0]

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Subscription"
        description="Manage your subscription to unlock parking lot and staff management."
      />

      {/* Active Subscription Banner */}
      {isLoading ? (
        <Card className="animate-pulse h-28" />
      ) : activeSub ? (
        <Card
          className={`border-l-4 ${
            isExpiringSoon
              ? "border-l-amber-500 bg-amber-50/5"
              : activeSub.status === "ACTIVE"
              ? "border-l-emerald-500 bg-emerald-50/5"
              : "border-l-red-500 bg-red-50/5"
          }`}
        >
          <CardContent className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {activeSub.status === "ACTIVE" && !isExpiringSoon && (
                <CheckCircle2 className="size-10 text-emerald-500 shrink-0" />
              )}
              {isExpiringSoon && <AlertTriangle className="size-10 text-amber-500 shrink-0" />}
              {activeSub.status !== "ACTIVE" && <XCircle className="size-10 text-red-500 shrink-0" />}
              <div>
                <p className="text-lg font-bold">{activeSub.package?.name} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {activeSub.status === "ACTIVE"
                    ? `Expires ${formatDate(activeSub.expires_at)} · ${days > 0 ? `${days} days remaining` : "Expires today"}`
                    : `Expired on ${formatDate(activeSub.expires_at)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge label={activeSub.status} tone={subscriptionStatusTone(activeSub.status as SubscriptionStatus)} />
              {isExpiringSoon && (
                <Badge variant="outline" className="border-amber-500 text-amber-500">
                  Expiring soon
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-red-500 bg-red-50/5">
          <CardContent className="flex items-center gap-4">
            <XCircle className="size-10 text-red-500 shrink-0" />
            <div>
              <p className="text-lg font-bold">No Active Subscription</p>
              <p className="text-sm text-muted-foreground">
                Purchase a package below to start managing your parking lots and staff.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Package Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Packages</h2>
        {packages.length === 0 ? (
          <EmptyState title="No packages available" description="Contact the administrator to set up packages." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const gradientClass = TIER_COLORS[pkg.name] ?? "from-violet-700 to-violet-600"
              const accentClass = TIER_ACCENT[pkg.name] ?? "border-violet-500"
              const isCurrentPlan = activeSub?.status === "ACTIVE" && activeSub.package_id === pkg.id
              const isActive = activeSub?.status === "ACTIVE"

              return (
                <Card
                  key={pkg.id}
                  className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${
                    isCurrentPlan ? accentClass : "border-border"
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-600 text-white text-xs">Current Plan</Badge>
                    </div>
                  )}

                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-br ${gradientClass} p-6 text-white`}>
                    <p className="text-xl font-bold">{pkg.name}</p>
                    <p className="text-3xl font-extrabold mt-1">{formatPrice(pkg.price)}</p>
                    <p className="text-sm opacity-75 mt-0.5">per {pkg.duration_days} days</p>
                  </div>

                  <CardContent className="pt-5 space-y-3">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span>Up to <strong>{pkg.max_lots}</strong> parking lot{pkg.max_lots > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="size-4 text-muted-foreground" />
                        <span>
                          Up to{" "}
                          <strong>{pkg.max_staff >= 999 ? "unlimited" : pkg.max_staff}</strong> staff members
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="size-4 text-muted-foreground" />
                        <span><strong>{pkg.duration_days}</strong> days access</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => openPaymentModal(pkg, "renew")}
                      >
                        <RefreshCw className="size-4 mr-2" />
                        Renew Plan
                      </Button>
                    ) : isActive ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => openPaymentModal(pkg, "purchase")}
                      >
                        <Zap className="size-4 mr-2" />
                        Switch to this Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => openPaymentModal(pkg, "purchase")}
                      >
                        <ShoppingCart className="size-4 mr-2" />
                        Subscribe Now
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* History Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Subscription History</h2>
        <Card>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : history.length === 0 ? (
              <EmptyState title="No subscription history" description="Your past subscriptions will appear here." />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Txn Ref</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">#{sub.id}</TableCell>
                        <TableCell className="font-semibold">{sub.package?.name ?? `#${sub.package_id}`}</TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(sub.amount ?? sub.package?.price ?? 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold">
                            {sub.payment_method ?? "CASH"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {sub.transaction_ref || "—"}
                        </TableCell>
                        <TableCell>{formatDate(sub.started_at)}</TableCell>
                        <TableCell>{formatDate(sub.expires_at)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            label={sub.status}
                            tone={subscriptionStatusTone(sub.status as SubscriptionStatus)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Flow Modal */}
      <Dialog open={Boolean(selectedPkg)} onOpenChange={(v) => { if (!v) setSelectedPkg(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-indigo-500" />
              {paymentActionType === "renew" ? "Renew Subscription" : "Subscription Checkout"}
            </DialogTitle>
            <DialogDescription>
              Complete payment to activate or extend your parking management subscription.
            </DialogDescription>
          </DialogHeader>

          {selectedPkg && (
            <div className="space-y-5 py-2">
              {/* Order Summary Box */}
              <div className="bg-slate-900 text-white rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Selected Package</span>
                  <Badge className="bg-indigo-500 text-white font-semibold">{selectedPkg.name}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Duration</span>
                  <span className="text-sm font-medium">{selectedPkg.duration_days} Days</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="font-medium">Total Amount Due</span>
                  <span className="text-xl font-bold text-amber-400">{formatPrice(selectedPkg.price)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
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

              {/* Instructions & Simulated QR / Transfer Details */}
              <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <QrCode className="size-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Payment Transfer Info ({activeMethodInfo.name})
                    </p>
                    <p className="text-sm font-semibold">{activeMethodInfo.account}</p>
                    <p className="text-xs font-mono text-indigo-400">{activeMethodInfo.phone}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Ref Input */}
              <FormField
                label="Transaction ID / Reference Number"
                htmlFor="txn_ref"
                error={undefined}
              >
                <Input
                  id="txn_ref"
                  placeholder="e.g. TXN987654321 or Receipt No."
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </FormField>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>Instant activation upon payment confirmation.</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSelectedPkg(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmittingPayment}
              onClick={handleConfirmPayment}
            >
              {isSubmittingPayment && <Loader2 className="size-4 animate-spin mr-2" />}
              Confirm & Pay {selectedPkg ? formatPrice(selectedPkg.price) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
