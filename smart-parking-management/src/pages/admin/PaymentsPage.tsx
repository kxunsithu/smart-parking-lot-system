import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Wallet, Plus, Loader2, KeyRound, Phone, Pencil, Trash2, Power, ShieldCheck, ExternalLink, Building2, UserCheck } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { walletAccountsApi } from "@/api/walletAccounts"
import { getErrorMessage } from "@/api/client"
import type { WalletAccountOut, WalletAccountResolveOut } from "@/types"

export function AdminPaymentsPage() {
  const [platform, setPlatform] = useState<WalletAccountOut | null | undefined>(undefined)
  const [resolvedDetails, setResolvedDetails] = useState<WalletAccountResolveOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Platform form dialog
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formApiKey, setFormApiKey] = useState("")
  const [resolved, setResolved] = useState<WalletAccountResolveOut | null>(null)
  const [resolvedKey, setResolvedKey] = useState("")
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const plat = await walletAccountsApi.getPlatform()
      setPlatform(plat)
      if (plat?.api_key) {
        try {
          const info = await walletAccountsApi.resolveApiKey(plat.api_key)
          setResolvedDetails(info)
        } catch {
          // Resolution error fallback
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const openCreate = () => {
    setIsEdit(false)
    setFormApiKey("")
    setResolved(null)
    setResolvedKey("")
    setResolveError(null)
    setShowForm(true)
  }

  const openEdit = () => {
    if (!platform) return
    setIsEdit(true)
    setFormApiKey("")
    setResolved(null)
    setResolvedKey("")
    setResolveError(null)
    setShowForm(true)
  }

  const resolveKey = async (key: string) => {
    const trimmed = key.trim()
    if (!trimmed) {
      setResolved(null)
      setResolvedKey("")
      setResolveError(null)
      return
    }
    if (trimmed === resolvedKey) return
    setIsResolving(true)
    setResolveError(null)
    try {
      const info = await walletAccountsApi.resolveApiKey(trimmed)
      setResolved(info)
      setResolvedKey(trimmed)
    } catch (error) {
      setResolved(null)
      setResolvedKey("")
      setResolveError(getErrorMessage(error))
    } finally {
      setIsResolving(false)
    }
  }

  const handleSubmit = async () => {
    const key = formApiKey.trim()
    if (!isEdit && !key) { toast.error("Please enter the wallet API key"); return }
    try {
      setIsSubmitting(true)
      let accountName = isEdit && platform ? platform.name : ""
      let walletPhone = isEdit && platform ? platform.wallet_phone ?? null : null

      if (key && resolvedKey === key && resolved) {
        accountName = resolved.account_name ?? resolved.name
        walletPhone = resolved.wallet_phone ?? null
      } else if (key) {
        const info = await walletAccountsApi.resolveApiKey(key)
        setResolved(info)
        setResolvedKey(key)
        accountName = info.account_name ?? info.name
        walletPhone = info.wallet_phone ?? null
      }

      if (isEdit && platform) {
        await walletAccountsApi.updatePlatform({
          name: accountName,
          wallet_phone: walletPhone,
          ...(key ? { api_key: key } : {}),
        })
        toast.success("Platform wallet account updated.")
      } else {
        if (!accountName) { toast.error("Could not load account details. Please verify the API key and try again."); return }
        await walletAccountsApi.createPlatform({
          name: accountName,
          wallet_phone: walletPhone,
          api_key: key,
        })
        toast.success("Platform wallet account added. Owners can now pay subscriptions.")
      }
      setShowForm(false)
      fetchAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await walletAccountsApi.deletePlatform()
      toast.success("Platform wallet account removed.")
      setShowDelete(false)
      setPlatform(null)
      setResolvedDetails(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async () => {
    if (!platform) return
    try {
      setIsToggling(true)
      await walletAccountsApi.updatePlatform({ is_active: !platform.is_active })
      toast.success(platform.is_active ? "Platform wallet account deactivated." : "Platform wallet account activated.")
      fetchAll()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsToggling(false)
    }
  }

  const systemName = resolvedDetails?.name || "Platform Subscription Payment Gateway"
  const accountHolderName = resolvedDetails?.account_name || platform?.name
  const systemLink = resolvedDetails?.system_link

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet Account"
        description="Manage the platform digital wallet account that receives subscription payments from parking owners."
      />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <Wallet className="size-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-xl font-bold">
                      {platform ? (accountHolderName || "Platform Wallet Account") : "Platform Wallet Account"}
                    </CardTitle>
                    {platform && (
                      <StatusBadge label={platform.is_active ? "Active" : "Inactive"} tone={platform.is_active ? "success" : "neutral"} />
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="font-medium text-foreground">{systemName}</span>
                    {systemLink && (
                      <a
                        href={systemLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Visit System <ExternalLink className="size-3" />
                      </a>
                    )}
                  </CardDescription>
                </div>
              </div>
              {platform ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleToggleActive} disabled={isToggling}>
                    <Power className="size-4 mr-2" />
                    {platform.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="size-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDelete(true)}>
                    <Trash2 className="size-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <Button onClick={openCreate}>
                  <Plus className="size-4 mr-2" />
                  Add Platform Account
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {platform ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Account Name */}
                  <div className="rounded-lg border p-4 space-y-1 bg-card">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <UserCheck className="size-3.5 text-emerald-500" />
                      Account Holder
                    </div>
                    <p className="font-semibold text-sm truncate" title={accountHolderName ?? undefined}>
                      {accountHolderName ?? "—"}
                    </p>
                  </div>

                  {/* External System Name */}
                  <div className="rounded-lg border p-4 space-y-1 bg-card">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Building2 className="size-3.5 text-teal-500" />
                      External System
                    </div>
                    <p className="font-semibold text-sm truncate" title={systemName}>
                      {systemName}
                    </p>
                  </div>

                  {/* Wallet Phone */}
                  <div className="rounded-lg border p-4 space-y-1 bg-card">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Phone className="size-3.5 text-emerald-500" />
                      Wallet Phone
                    </div>
                    <p className="font-medium text-sm">{platform.wallet_phone ?? "—"}</p>
                  </div>

                  {/* System Link */}
                  <div className="rounded-lg border p-4 space-y-1 bg-card">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <ExternalLink className="size-3.5 text-blue-500" />
                      External System Link
                    </div>
                    {systemLink ? (
                      <a
                        href={systemLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm text-primary hover:underline truncate block"
                        title={systemLink}
                      >
                        {systemLink.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <p className="font-medium text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>

                {/* Additional details row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="rounded-lg border p-4 space-y-1 bg-muted/20">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <KeyRound className="size-3.5" />
                      API Key
                    </div>
                    <p className="font-mono text-sm truncate" title={platform.api_key ?? undefined}>
                      {platform.api_key ? `•••• •••• ${platform.api_key.slice(-4)}` : platform.api_key_masked ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4 space-y-1 bg-muted/20">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <ShieldCheck className="size-3.5" />
                      Connected Since
                    </div>
                    <p className="font-medium text-sm">{new Date(platform.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>

                {!platform.is_active && (
                  <p className="mt-4 text-sm text-amber-600 bg-amber-500/5 border border-amber-500/20 rounded p-3">
                    Platform wallet account is inactive. Parking owners cannot pay subscription fees until you activate it.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-500/5 border border-amber-500/20 rounded p-3">
                No platform wallet account connected. Parking owners cannot pay subscription fees until you add one.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Platform Wallet Account" : "Add Platform Wallet Account"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the platform wallet account details."
                : "This account receives the subscription fees that parking owners pay."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="API Key"
              htmlFor="plat-key"
              hint={isEdit ? "Leave blank to keep the current key." : "The X-API-Key of the platform's external system in the digital wallet backend."}
            >
              <Input
                id="plat-key"
                type="password"
                placeholder={isEdit ? "••••••••••••" : "e.g. sk_live_XXXXXXXXXXXXXXXX"}
                value={formApiKey}
                onChange={(e) => { setFormApiKey(e.target.value); setResolveError(null) }}
                onBlur={(e) => resolveKey(e.target.value)}
              />
            </FormField>

            {isResolving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading account details from the digital wallet...
              </div>
            )}

            {resolveError && !isResolving && (
              <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded p-3">
                {resolveError}
              </p>
            )}

            {resolved && resolvedKey === formApiKey.trim() && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connected wallet account</p>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-muted-foreground">External System Name</span>
                  <span className="font-medium text-right">{resolved.name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-muted-foreground">Account Holder Name</span>
                  <span className="font-medium text-right">{resolved.account_name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-muted-foreground">Wallet Phone</span>
                  <span className="font-medium text-right">{resolved.wallet_phone || "—"}</span>
                </div>
                {resolved.system_link && (
                  <div className="flex justify-between text-sm gap-4">
                    <span className="text-muted-foreground">System Link</span>
                    <span className="font-medium text-right text-primary truncate max-w-[200px]">{resolved.system_link}</span>
                  </div>
                )}
              </div>
            )}

            {!resolved && !isResolving && !resolveError && isEdit && (
              <p className="text-sm text-muted-foreground">
                Current account: {platform?.name}
                {platform?.wallet_phone ? ` · ${platform.wallet_phone}` : ""}. Enter a new API key to refresh these details.
              </p>
            )}

            {!resolved && !isResolving && !resolveError && !isEdit && (
              <p className="text-sm text-muted-foreground">
                Enter the API key and press Tab or click away to automatically load the account details.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEdit ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={(open) => !open && setShowDelete(false)}
        title="Remove platform wallet account?"
        description="Parking owners will no longer be able to pay subscription fees until you connect a new platform account. This action cannot be undone."
        confirmLabel="Remove"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
