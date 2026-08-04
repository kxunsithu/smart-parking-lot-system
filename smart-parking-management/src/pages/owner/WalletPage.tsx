import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Wallet, Plus, Loader2, KeyRound, Phone, Pencil, Trash2, Power, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { StatusBadge } from "@/components/common/StatusBadge"
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

export function OwnerWalletPage() {
  const [account, setAccount] = useState<WalletAccountOut | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  // Form dialog state
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

  const fetchAccount = async () => {
    try {
      const result = await walletAccountsApi.getMine()
      setAccount(result)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccount()
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
    if (!account) return
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
      let accountName = isEdit && account ? account.name : ""
      let walletPhone = isEdit && account ? account.wallet_phone ?? null : null

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

      if (isEdit && account) {
        await walletAccountsApi.updateMine({
          name: accountName,
          wallet_phone: walletPhone,
          ...(key ? { api_key: key } : {}),
        })
        toast.success("Wallet account updated.")
      } else {
        if (!accountName) { toast.error("Could not load account details. Please verify the API key and try again."); return }
        await walletAccountsApi.createMine({
          name: accountName,
          wallet_phone: walletPhone,
          api_key: key,
        })
        toast.success("Wallet account added. Customers can now pay you.")
      }
      setShowForm(false)
      fetchAccount()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await walletAccountsApi.deleteMine()
      toast.success("Wallet account removed.")
      setShowDelete(false)
      setAccount(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async () => {
    if (!account) return
    try {
      setIsToggling(true)
      await walletAccountsApi.updateMine({ is_active: !account.is_active })
      toast.success(account.is_active ? "Wallet account deactivated." : "Wallet account activated.")
      fetchAccount()
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
        description="Connect a digital wallet receiver so customers can pay their parking fees directly to you."
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : account ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Wallet className="size-6 text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {account.name}
                    <StatusBadge label={account.is_active ? "Active" : "Inactive"} tone={account.is_active ? "success" : "neutral"} />
                  </CardTitle>
                  <CardDescription>
                    Receives all parking session payments from your customers.
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleToggleActive} disabled={isToggling}>
                  <Power className="size-4 mr-2" />
                  {account.is_active ? "Deactivate" : "Activate"}
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <KeyRound className="size-3.5" />
                  API Key
                </div>
                <p className="font-mono text-sm truncate" title={account.api_key ?? undefined}>
                  {account.api_key ? `•••• •••• ${account.api_key.slice(-4)}` : account.api_key_masked ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="size-3.5" />
                  Wallet Phone
                </div>
                <p className="font-medium text-sm">{account.wallet_phone ?? "—"}</p>
              </div>
              <div className="rounded-lg border p-4 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  Connected Since
                </div>
                <p className="font-medium text-sm">{new Date(account.created_at).toLocaleDateString("en-US")}</p>
              </div>
            </div>
            {!account.is_active && (
              <p className="mt-4 text-sm text-amber-600 bg-amber-500/5 border border-amber-500/20 rounded p-3">
                This wallet account is inactive. Customer payments will be rejected until you activate it.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <Wallet className="size-7 text-indigo-500" />
            </div>
            <h2 className="text-lg font-semibold">No wallet account connected</h2>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Connect your digital wallet receiver to start receiving parking fees from customers.
              The API key is the one registered for your external system in the digital wallet backend.
            </p>
            <Button className="mt-5" onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Add Wallet Account
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Wallet Account" : "Add Wallet Account"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update your receiving wallet account details."
                : "This account receives the parking fees that your customers pay."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="API Key"
              htmlFor="wa-key"
              hint={isEdit ? "Leave blank to keep the current key." : "The X-API-Key of your external system in the digital wallet backend."}
            >
              <Input
                id="wa-key"
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
                Current account: {account?.name}
                {account?.wallet_phone ? ` · ${account.wallet_phone}` : ""}. Enter a new API key to refresh these details.
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
        title="Remove wallet account?"
        description="Customers will no longer be able to pay you until you connect a new wallet account. This action cannot be undone."
        confirmLabel="Remove"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
