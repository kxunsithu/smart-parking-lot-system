import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Calendar, CreditCard, Clock, Package, User, Building2, Mail, Phone } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DataPagination } from "@/components/common/DataPagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { subscriptionsApi } from "@/api/subscriptions"
import { getErrorMessage } from "@/api/client"
import type { SubscriptionOut, SubscriptionStatus } from "@/types"
import type { ApiMeta } from "@/types"

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Cancelled", value: "CANCELLED" },
]

function subscriptionStatusTone(status: SubscriptionStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "ACTIVE": return "success"
    case "EXPIRED": return "warning"
    case "CANCELLED": return "danger"
    default: return "neutral"
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function daysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionOut[]>([])
  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true)
      const result = await subscriptionsApi.listAll({ page, limit: 15 })
      let data = result.data as SubscriptionOut[]
      if (statusFilter !== "all") {
        data = data.filter((s) => s.status === statusFilter)
      }
      setSubscriptions(data)
      setMeta(result.meta as ApiMeta | null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [page, statusFilter])

  const handleToggleStatus = async (subscriptionId: number) => {
    try {
      setTogglingId(subscriptionId)
      await subscriptionsApi.toggleStatus(subscriptionId)
      toast.success("Subscription status updated successfully.")
      fetchSubscriptions()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Overview of all owner subscription records."
      />

      <Card>
        <CardContent className="space-y-4">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1) }} items={STATUS_OPTIONS}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading ? (
            <TableSkeleton />
          ) : subscriptions.length === 0 ? (
            <EmptyState title="No subscriptions found" description="No subscription records match your filter." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((sub) => {
                const days = sub.expires_at ? daysRemaining(sub.expires_at) : 0
                return (
                  <Card key={sub.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="size-5 text-primary" />
                          <CardTitle className="text-lg">{sub.package?.name ?? `#${sub.package_id}`}</CardTitle>
                        </div>
                        {sub.status !== "EXPIRED" ? (
                          <Switch
                            checked={sub.status === "ACTIVE"}
                            onCheckedChange={() => handleToggleStatus(sub.id)}
                            disabled={togglingId === sub.id}
                          />
                        ) : (
                          <StatusBadge label={sub.status} tone={subscriptionStatusTone(sub.status as SubscriptionStatus)} />
                        )}
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-border/50 space-y-1 text-sm">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Building2 className="size-4 text-primary shrink-0" />
                          <span>{sub.owner?.company_name || "Independent Owner"}</span>
                        </div>
                        {sub.owner?.user && (
                          <div className="space-y-0.5 pl-5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                              <User className="size-3.5 text-muted-foreground shrink-0" />
                              <span>{sub.owner.user.name} <span className="text-muted-foreground font-mono">(Owner #{sub.owner_id})</span></span>
                            </div>
                            {sub.owner.user.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                                <span>{sub.owner.user.email}</span>
                              </div>
                            )}
                            {sub.owner.user.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                                <span>{sub.owner.user.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Amount:</span>
                        </div>
                        <span className="font-semibold">
                          {Math.round(sub.amount ?? sub.package?.price ?? 0).toLocaleString("en-US")} MMK
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <StatusBadge
                            label={sub.status}
                            tone={subscriptionStatusTone(sub.status as SubscriptionStatus)}
                          />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{sub.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Started:</span>
                        <span className="font-medium">{sub.started_at ? formatDate(sub.started_at) : "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Expires:</span>
                        <span className="font-medium">{sub.expires_at ? formatDate(sub.expires_at) : "—"}</span>
                      </div>
                      {sub.status === "ACTIVE" && (
                        <div className="flex items-center gap-2 text-sm pt-2 border-t">
                          <Clock className="size-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Days remaining:</span>
                          <span className={days <= 7 ? "text-amber-500 font-semibold" : "text-green-500 font-semibold"}>
                            {days > 0 ? `${days} days` : "Expiring today"}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <DataPagination meta={meta} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
