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
  Wallet,
  ShieldCheck,
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
import type { PackageOut, SubscriptionOut, SubscriptionStatus, WalletPaymentOut } from "@/types"

function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString("en-US")} MMK`
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

export function OwnerSubscriptionPage() {
  const [activeSub, setActiveSub] = useState<SubscriptionOut | null | undefined>(undefined)
  const [history, setHistory] = useState<SubscriptionOut[]>([])
  const [packages, setPackages] = useState<PackageOut[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Payment Modal State
  const [selectedPkg, setSelectedPkg] = useState<PackageOut | null>(null)
  const [paymentActionType, setPaymentActionType] = useState<"purchase" | "renew">("purchase")
  const [paymentInfo, setPaymentInfo] = useState<WalletPaymentOut | null>(null)
  const [otp, setOtp] = useState("")
  const [pin, setPin] = useState("")
  const [isInitiating, setIsInitiating] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentChecking, setPaymentChecking] = useState(false)
  const [walletPhone, setWalletPhone] = useState("")
  const [payInitiateError, setPayInitiateError] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

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
    setPaymentInfo(null)
    setOtp("")
    setPin("")
    setWalletPhone("")
    setPayInitiateError(null)
    setPayError(null)
    setPaymentChecking(false)
  }

  const closeModal = () => {
    setSelectedPkg(null)
    setPaymentInfo(null)
    setOtp("")
    setPin("")
    setWalletPhone("")
    setPayInitiateError(null)
    setPayError(null)
    setPaymentChecking(false)
  }

  const handleInitiatePayment = async () => {
    if (!selectedPkg) return
    setIsInitiating(true)
    setPayInitiateError(null)
    setPayError(null)
    try {
      const info = await subscriptionsApi.payInitiate({
        package_id: selectedPkg.id,
        is_renewal: paymentActionType === "renew",
        wallet_phone: walletPhone.trim() || undefined,
      })
      setPaymentInfo(info)
      if (info.wallet_payment_url) {
        window.open(info.wallet_payment_url, "_blank", "noopener,noreferrer")
        toast.success("Wallet payment page opened in a new tab. Complete the payment there.")
      } else {
        toast.success("Payment initiated. Enter the OTP and your PIN to confirm.")
      }
    } catch (error) {
      setPayInitiateError(getErrorMessage(error))
    } finally {
      setIsInitiating(false)
    }
  }

  const handleCheckPaymentStatus = async () => {
    setPaymentChecking(true)
    try {
      const active = await subscriptionsApi.getActive()
      if (active && active.package_id === selectedPkg?.id && active.status === "ACTIVE") {
        toast.success("Payment successful! Your subscription is now active.")
        closeModal()
        fetchAll()
      } else {
        toast.error("Payment is not completed yet. Complete it in the wallet tab and try again.")
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setPaymentChecking(false)
    }
  }

  // Poll for subscription status if wallet hosted page URL was opened
  useEffect(() => {
    if (!paymentInfo?.wallet_payment_url) return
    let cancelled = false
    let attempts = 0
    const check = async () => {
      if (cancelled) return
      setPaymentChecking(true)
      try {
        const active = await subscriptionsApi.getActive()
        if (cancelled) return
        if (active && active.package_id === selectedPkg?.id && active.status === "ACTIVE") {
          setPaymentChecking(false)
          toast.success("Payment successful! Your subscription is now active.")
          closeModal()
          fetchAll()
          return
        }
      } catch {
        // transient error — keep polling
      }
      if (cancelled) return
      attempts += 1
      if (attempts < 100) {
        setPaymentChecking(false)
        setTimeout(check, 3000)
      } else {
        setPaymentChecking(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentInfo?.wallet_payment_url])

  const handlePayNow = async () => {
    if (!paymentInfo) return
    if (!/^\d{6}$/.test(otp.trim())) { toast.error("Please enter the 6-digit OTP"); return }
    if (!/^\d{4}$/.test(pin.trim())) { toast.error("Please enter your 4-digit wallet PIN"); return }
    setIsPaying(true)
    setPayError(null)
    try {
      await subscriptionsApi.payConfirm({
        reference: paymentInfo.reference,
        otp_code: otp.trim(),
        pin: pin.trim(),
      })
      toast.success("Payment successful! Your subscription is now active.")
      closeModal()
      fetchAll()
    } catch (error) {
      setPayError(getErrorMessage(error))
    } finally {
      setIsPaying(false)
    }
  }

  const days = activeSub?.expires_at ? daysRemaining(activeSub.expires_at) : 0
  const isExpiringSoon = activeSub?.status === "ACTIVE" && days <= 7 && days > 0

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
          className={`border-l-4 ${isExpiringSoon
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
                    ? `Expires ${activeSub.expires_at ? formatDate(activeSub.expires_at) : "—"} · ${days > 0 ? `${days} days remaining` : "Expires today"}`
                    : activeSub.expires_at
                      ? `Expired on ${formatDate(activeSub.expires_at)}`
                      : "Pending wallet payment"}
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
                  className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${isCurrentPlan ? accentClass : "border-border"
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
              <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Amount</TableHead>
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
                        <TableCell>{sub.started_at ? formatDate(sub.started_at) : "—"}</TableCell>
                        <TableCell>{sub.expires_at ? formatDate(sub.expires_at) : "—"}</TableCell>
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
      <Dialog open={Boolean(selectedPkg)} onOpenChange={(v) => { if (!v) closeModal() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-indigo-500" />
              {paymentActionType === "renew" ? "Renew Subscription" : "Subscription Checkout"}
            </DialogTitle>
            <DialogDescription>
              Pay securely with your wallet to activate or extend your parking management subscription.
            </DialogDescription>
          </DialogHeader>

          {selectedPkg && !paymentInfo && (
            <div className="space-y-5 py-2">
              {/* Order Summary Box */}
              <div className="bg-slate-900 text-white rounded p-4 space-y-2">
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

              <FormField label="Wallet Phone Number" htmlFor="wallet-phone" hint="Phone number of the wallet account used to pay (optional if profile phone matches)." error={undefined}>
                <Input
                  id="wallet-phone"
                  type="tel"
                  placeholder="e.g. +959XXXXXXXXX"
                  value={walletPhone}
                  onChange={(e) => setWalletPhone(e.target.value)}
                />
              </FormField>

              {payInitiateError && (
                <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                  {payInitiateError}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>Payment is processed via digital wallet. Your subscription activates automatically once paid.</span>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={closeModal} disabled={isInitiating}>
                  Cancel
                </Button>
                <Button type="button" disabled={isInitiating} onClick={handleInitiatePayment}>
                  {isInitiating ? (
                    <><Loader2 className="size-4 animate-spin mr-2" /> Requesting payment...</>
                  ) : (
                    <>Pay with Wallet</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {selectedPkg && paymentInfo && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-900 text-white rounded p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Package</span>
                  <span className="text-sm font-semibold">{selectedPkg.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-80">Subscription Fee</span>
                  <span className="text-sm font-medium">{formatPrice(paymentInfo.amount)}</span>
                </div>
                {paymentInfo.fee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-80">Wallet Fee</span>
                    <span className="text-sm font-medium">{formatPrice(paymentInfo.fee)}</span>
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="font-medium">Total Due</span>
                  <span className="text-xl font-bold text-amber-400">{formatPrice(paymentInfo.total)}</span>
                </div>
              </div>

              {paymentInfo.wallet_payment_url ? (
                <>
                  <div className="rounded bg-muted/40 border p-4 space-y-2">
                    <p className="text-sm font-medium">Complete your payment in the wallet tab</p>
                    <p className="text-xs text-muted-foreground">
                      The wallet payment page opened in a new tab. Enter the OTP and your wallet PIN there.
                      This dialog will close automatically once the payment is confirmed.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(paymentInfo.wallet_payment_url!, "_blank", "noopener,noreferrer")}
                    >
                      Re-open payment page
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    {paymentChecking && <Loader2 className="size-4 animate-spin" />}
                    <span>{paymentChecking ? "Waiting for payment confirmation..." : "Waiting for payment confirmation"}</span>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={closeModal} disabled={paymentChecking}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleCheckPaymentStatus} disabled={paymentChecking}>
                      {paymentChecking ? (
                        <><Loader2 className="size-4 animate-spin mr-2" /> Checking...</>
                      ) : (
                        <>I've completed the payment</>
                      )}
                    </Button>
                  </DialogFooter>
                  <p className="text-center">
                    <button
                      type="button"
                      onClick={handleInitiatePayment}
                      disabled={isInitiating || paymentChecking}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      Request a new payment
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <FormField label="One-Time Password (OTP)" htmlFor="pay-otp" hint="Enter the 6-digit code sent to your phone by your wallet app." error={undefined}>
                    <Input
                      id="pay-otp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="tracking-widest text-center"
                    />
                  </FormField>
                  <FormField label="Wallet PIN" htmlFor="pay-pin" error={undefined}>
                    <Input
                      id="pay-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4-digit PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      className="tracking-widest text-center"
                    />
                  </FormField>

                  {payError && (
                    <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                      {payError}
                    </p>
                  )}

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={closeModal} disabled={isPaying}>
                      Cancel
                    </Button>
                    <Button type="button" disabled={isPaying} onClick={handlePayNow}>
                      {isPaying && <Loader2 className="size-4 animate-spin mr-2" />}
                      Pay {formatPrice(paymentInfo.total)}
                    </Button>
                  </DialogFooter>
                  <p className="text-center">
                    <button
                      type="button"
                      onClick={handleInitiatePayment}
                      disabled={isInitiating || isPaying}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      Request a new OTP
                    </button>
                  </p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
