import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Wallet, Plus, Loader2, KeyRound, Phone, Pencil, Trash2, Power, ShieldCheck, Building2 } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { TableSkeleton } from "@/components/common/LoadingBlock"
import { StatusBadge } from "@/components/common/StatusBadge"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

export function AdminPaymentsPage() {
  const [platform, setPlatform] = useState<WalletAccountOut | null | undefined>(undefined)
  const [accounts, setAccounts] = useState<WalletAccountOut[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Platform form dialog
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formApiKey, setFormApiKey] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const [plat, list] = await Promise.all([walletAccountsApi.getPlatform(), walletAccountsApi.listAll()])
      setPlatform(plat)
      setAccounts(list)
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
    setFormName("")
    setFormPhone("")
    setFormApiKey("")
    setShowForm(true)
  }

  const openEdit = () => {
    if (!platform) return
    setIsEdit(true)
    setFormName(platform.name)
    setFormPhone(platform.wallet_phone ?? "")
    setFormApiKey("")
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) { toast.error("Please enter an account name"); return }
    if (!formApiKey.trim() && !isEdit) { toast.error("Please enter the wallet API key"); return }
    try {
      setIsSubmitting(true)
      if (isEdit && platform) {
        await walletAccountsApi.updatePlatform({
          name: formName.trim(),
          wallet_phone: formPhone.trim() || null,
          ...(formApiKey.trim() ? { api_key: formApiKey.trim() } : {}),
        })
        toast.success("Platform wallet account updated.")
      } else {
        await walletAccountsApi.createPlatform({
          name: formName.trim(),
          wallet_phone: formPhone.trim() || null,
          api_key: formApiKey.trim(),
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
        title="Payments"
        description="Manage the digital wallet accounts that receive parking fees and subscription payments."
      />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <>
          {/* Platform wallet account */}
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

          {/* All wallet accounts (owners) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-muted-foreground" />
                Owner Wallet Accounts
              </CardTitle>
              <CardDescription>
                Digital wallet receivers configured by parking owners to collect parking fees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <EmptyState
                  title="No owner wallet accounts"
                  description="Parking owners who connect a wallet account will appear here."
                  icon={Wallet}
                />
              ) : (
                <div className="overflow-x-auto rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Owner</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Wallet Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Connected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((acc) => (
                        <TableRow key={acc.id}>
                          <TableCell className="font-medium">
                            {acc.owner?.name ?? acc.owner?.email ?? `Owner #${acc.owner_id ?? "—"}`}
                          </TableCell>
                          <TableCell>{acc.name}</TableCell>
                          <TableCell className="font-mono text-xs">{acc.api_key_masked ?? "—"}</TableCell>
                          <TableCell>{acc.wallet_phone ?? "—"}</TableCell>
                          <TableCell>
                            <StatusBadge label={acc.is_active ? "Active" : "Inactive"} tone={acc.is_active ? "success" : "neutral"} />
                          </TableCell>
                          <TableCell>{new Date(acc.created_at).toLocaleDateString("en-US")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
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
            <FormField label="Account Name" htmlFor="plat-name" hint="A friendly label, e.g. Platform Wallet.">
              <Input id="plat-name" placeholder="Platform Wallet" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </FormField>
            <FormField label="Wallet Phone" htmlFor="plat-phone" hint="Optional. The wallet phone linked to this receiver.">
              <Input id="plat-phone" type="tel" placeholder="e.g. +959XXXXXXXXX" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </FormField>
            <FormField
              label="API Key"
              htmlFor="plat-key"
              hint={isEdit ? "Leave blank to keep the current key." : "The X-API-Key of the platform's external system in the digital wallet backend."}
            >
              <Input id="plat-key" type="password" placeholder={isEdit ? "••••••••••••" : "e.g. MCH-XXXXXXXXXXXX"} value={formApiKey} onChange={(e) => setFormApiKey(e.target.value)} />
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
