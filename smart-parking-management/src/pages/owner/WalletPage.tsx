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
import type { WalletAccountOut } from "@/types"

export function OwnerWalletPage() {
  const [account, setAccount] = useState<WalletAccountOut | null | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  // Form dialog state
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formApiKey, setFormApiKey] = useState("")
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
    setFormName("")
    setFormPhone("")
    setFormApiKey("")
    setShowForm(true)
  }

  const openEdit = () => {
    if (!account) return
    setIsEdit(true)
    setFormName(account.name)
    setFormPhone(account.wallet_phone ?? "")
    setFormApiKey("")
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) { toast.error("Please enter an account name"); return }
    if (!formApiKey.trim() && !isEdit) { toast.error("Please enter your wallet API key"); return }
    try {
      setIsSubmitting(true)
      if (isEdit && account) {
        await walletAccountsApi.updateMine({
          name: formName.trim(),
          wallet_phone: formPhone.trim() || null,
          ...(formApiKey.trim() ? { api_key: formApiKey.trim() } : {}),
        })
        toast.success("Wallet account updated.")
      } else {
        await walletAccountsApi.createMine({
          name: formName.trim(),
          wallet_phone: formPhone.trim() || null,
          api_key: formApiKey.trim(),
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
            <FormField label="Account Name" htmlFor="wa-name" hint="A friendly label, e.g. My Parking Lot Wallet.">
              <Input id="wa-name" placeholder="My Parking Lot Wallet" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </FormField>
            <FormField label="Wallet Phone" htmlFor="wa-phone" hint="Optional. The wallet phone linked to this receiver.">
              <Input id="wa-phone" type="tel" placeholder="e.g. +959XXXXXXXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </FormField>
            <FormField
              label="API Key"
              htmlFor="wa-key"
              hint={isEdit ? "Leave blank to keep the current key." : "The X-API-Key of your external system in the digital wallet backend."}
            >
              <Input id="wa-key" type="password" placeholder={isEdit ? "••••••••••••" : "e.g. MCH-XXXXXXXXXXXX"} value={formApiKey} onChange={(e) => setFormApiKey(e.target.value)} />
            </FormField>
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
