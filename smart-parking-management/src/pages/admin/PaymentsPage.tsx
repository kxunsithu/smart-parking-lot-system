import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Wallet, Plus, Loader2, KeyRound, Phone, Pencil, Trash2, Power, ShieldCheck } from "lucide-react"
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet Account"
        description="Manage the platform digital wallet account that receives subscription payments from parking owners."
      />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Wallet className="size-6 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Platform Wallet Account
                    {platform && (
                      <StatusBadge label={platform.is_active ? "Active" : "Inactive"} tone={platform.is_active ? "success" : "neutral"} />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Receives all subscription fees paid by parking owners.
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
          <CardContent>
            {platform ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <KeyRound className="size-3.5" />
                    API Key
                  </div>
                  <p className="font-mono text-sm truncate" title={platform.api_key ?? undefined}>
                    {platform.api_key ? `•••• •••• ${platform.api_key.slice(-4)}` : platform.api_key_masked ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="size-3.5" />
                    Wallet Phone
                  </div>
                  <p className="font-medium text-sm">{platform.wallet_phone ?? "—"}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    Connected Since
                  </div>
                  <p className="font-medium text-sm">{new Date(platform.created_at).toLocaleDateString("en-US")}</p>
                </div>
              </div>
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
                  <span className="text-muted-foreground">Account Name</span>
                  <span className="font-medium text-right">{resolved.account_name || "—"}</span>
                </div>
                <div className="flex justify-between text-sm gap-4">
                  <span className="text-muted-foreground">Wallet Phone</span>
                  <span className="font-medium text-right">{resolved.wallet_phone || "—"}</span>
                </div>
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
