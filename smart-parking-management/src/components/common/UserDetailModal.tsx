import { useState, useEffect } from "react"
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Car,
  Shield,
  UserCheck,
  UserX,
  ParkingSquare,
  MapPin,
  Briefcase,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/common/StatusBadge"
import { activeStatusTone } from "@/utils/statusColors"
import { formatDate } from "@/utils/formatters"
import { parkingLotsApi } from "@/api/parkingLots"
import { carsApi } from "@/api/cars"
import type { UserOut, ParkingOwnerOut, ParkingStaffOut, ParkingLotOut, CarOut } from "@/types"

export type UserDetailTarget =
  | { type: "customer"; user: UserOut }
  | { type: "owner"; owner: ParkingOwnerOut }
  | { type: "staff"; staff: ParkingStaffOut }
  | { type: "user"; user: UserOut }

interface UserDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: UserDetailTarget | null
  onToggleActive?: (userId: number, currentStatus: boolean) => Promise<void> | void
}

export function UserDetailModal({
  open,
  onOpenChange,
  target,
  onToggleActive,
}: UserDetailModalProps) {
  const [lots, setLots] = useState<ParkingLotOut[]>([])
  const [cars, setCars] = useState<CarOut[]>([])
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  // Extract base user, role, company name, etc.
  const user: UserOut | null = target
    ? target.type === "owner"
      ? target.owner.user ?? null
      : target.type === "staff"
      ? target.staff.user ?? null
      : target.user
    : null

  const roleName = user?.role?.name ?? (target?.type === "owner" ? "OWNER" : target?.type === "staff" ? "STAFF" : "CUSTOMER")
  const companyName = target?.type === "owner" ? target.owner.company_name : null
  const staffLot = target?.type === "staff" ? target.staff.parking_lot : null

  // Fetch extra details when modal opens
  useEffect(() => {
    if (!open || !target) {
      setLots([])
      setCars([])
      return
    }

    async function loadExtraData() {
      const currentTarget = target
      if (!currentTarget) return
      setLoadingExtra(true)
      try {
        if (currentTarget.type === "owner" && currentTarget.owner.id) {
          const res = await parkingLotsApi.list({ owner_id: currentTarget.owner.id, limit: 100 })
          setLots(res.items)
        } else if (currentTarget.type === "customer" && currentTarget.user.id) {
          const res = await carsApi.list({ limit: 100 })
          setCars(res.items.filter((c) => c.customer_id === currentTarget.user.id))
        }
      } catch (err) {
        console.error("Failed to load extra detail data:", err)
      } finally {
        setLoadingExtra(false)
      }
    }

    loadExtraData()
  }, [open, target])

  const handleToggle = async () => {
    if (!user || !onToggleActive) return
    setIsToggling(true)
    try {
      await onToggleActive(user.id, user.is_active)
    } finally {
      setIsToggling(false)
    }
  }

  if (!target || !user) return null

  const getRoleTone = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
      case "OWNER":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
      case "STAFF":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
      case "CUSTOMER":
      default:
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0 rounded-2xl shadow-2xl border border-border/80 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Modal Top Header Banner */}
        <div className="relative bg-gradient-to-r from-primary/10 via-muted/40 to-muted/10 p-5 border-b border-border/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Avatar / Profile */}
            <div className="relative shrink-0">
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.name}
                  className="size-14 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                />
              ) : (
                <div className="size-14 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-xl shadow-inner">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background ${
                  user.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
                title={user.is_active ? "Active account" : "Inactive account"}
              />
            </div>

            {/* Name, Company & Badges */}
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-foreground truncate leading-snug">{user.name}</h3>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getRoleTone(
                    roleName
                  )}`}
                >
                  <Shield className="size-3" />
                  {roleName}
                </span>
              </div>

              {companyName && (
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{companyName}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                <StatusBadge
                  label={user.is_active ? "Active" : "Inactive"}
                  tone={activeStatusTone(user.is_active)}
                />
                <StatusBadge
                  label={user.is_verified ? "Email Verified" : "Not Verified"}
                  tone={user.is_verified ? "success" : "warning"}
                />
                <span className="text-muted-foreground font-mono text-[11px]">ID: #{user.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body Details */}
        <div className="p-5 space-y-5">
          {/* Section 1: Basic Information */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              User Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <p className="text-xs font-semibold text-foreground">Email</p>
                </div>
                {user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    title={`Email ${user.email}`}
                    className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors inline-flex items-center justify-center"
                  >
                    <Mail className="size-4" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Phone className="size-4 text-muted-foreground shrink-0" />
                  <p className="text-xs font-semibold text-foreground">Phone</p>
                </div>
                {user.phone ? (
                  <a
                    href={`tel:${user.phone}`}
                    title={`Call ${user.phone}`}
                    className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors inline-flex items-center justify-center"
                  >
                    <Phone className="size-4" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card/60">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Account Created</p>
                  <p className="font-semibold text-foreground">{formatDate(user.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card/60">
                <Briefcase className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">Email Status</p>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    {user.is_verified ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span>Verified</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3.5 text-amber-500" />
                        <span>Unverified</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Role-Specific Details */}
          {target.type === "owner" && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" />
                  Owned Parking Lots ({lots.length})
                </h4>
              </div>

              {loadingExtra ? (
                <div className="flex items-center justify-center p-4 border border-border/60 rounded-xl">
                  <Loader2 className="size-4 animate-spin text-primary mr-2" />
                  <span className="text-xs text-muted-foreground">Loading parking lots...</span>
                </div>
              ) : lots.length === 0 ? (
                <div className="text-center p-4 border border-border/60 rounded-xl bg-muted/20 text-xs text-muted-foreground">
                  No parking lots registered yet for this owner.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-0.5">
                  {lots.map((lot) => (
                    <div
                      key={lot.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <ParkingSquare className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{lot.name}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {lot.city && <MapPin className="size-3 shrink-0 text-muted-foreground" />}
                            <span>{lot.city || "No city specified"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-semibold text-foreground text-[11px]">
                          {lot.rate_per_hour ? `${lot.rate_per_hour.toLocaleString()} MMK/hr` : "Free"}
                        </p>
                        <StatusBadge
                          label={lot.is_active ? "Active" : "Inactive"}
                          tone={activeStatusTone(lot.is_active)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {target.type === "staff" && (
            <div className="space-y-2.5 pt-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                Assigned Parking Lot
              </h4>

              {staffLot ? (
                <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ParkingSquare className="size-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-foreground text-xs">{staffLot.name}</h5>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          <span>{staffLot.city || "N/A"}</span>
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={staffLot.is_active ? "Active" : "Inactive"}
                      tone={activeStatusTone(staffLot.is_active)}
                    />
                  </div>

                  {staffLot.rate_per_hour && (
                    <div className="pt-2 text-[11px] border-t border-border/50 flex justify-between text-muted-foreground">
                      <span>Rate Per Hour:</span>
                      <span className="font-semibold text-foreground">
                        {staffLot.rate_per_hour.toLocaleString()} MMK
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground">
                  Parking lot assignment details not specified (Lot ID: #{target.staff.parking_lot_id}).
                </div>
              )}
            </div>
          )}

          {target.type === "customer" && (
            <div className="space-y-2.5 pt-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Car className="size-3.5 text-primary" />
                Registered Vehicles ({cars.length})
              </h4>

              {loadingExtra ? (
                <div className="flex items-center justify-center p-4 border border-border/60 rounded-xl">
                  <Loader2 className="size-4 animate-spin text-primary mr-2" />
                  <span className="text-xs text-muted-foreground">Loading vehicles...</span>
                </div>
              ) : cars.length === 0 ? (
                <div className="text-center p-4 border border-border/60 rounded-xl bg-muted/20 text-xs text-muted-foreground">
                  No vehicles registered yet for this customer.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {cars.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card/60 text-xs"
                    >
                      <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Car className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground font-mono text-xs">{c.plate_number}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.brand || "Vehicle"} {c.color ? `• ${c.color}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-2 rounded-b-2xl">
          {onToggleActive ? (
            <Button
              type="button"
              variant={user.is_active ? "outline" : "default"}
              size="sm"
              onClick={handleToggle}
              disabled={isToggling}
              className="gap-1.5 text-xs h-8"
            >
              {isToggling ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : user.is_active ? (
                <UserX className="size-3.5 text-amber-500" />
              ) : (
                <UserCheck className="size-3.5 text-emerald-500" />
              )}
              {user.is_active ? "Deactivate User" : "Activate User"}
            </Button>
          ) : (
            <div />
          )}

          <Button type="button" variant="secondary" size="sm" className="text-xs h-8 px-4" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
