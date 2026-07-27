import { Outlet } from "react-router-dom"
import { ParkingSquare, ShieldCheck, Timer, Wallet } from "lucide-react"

export function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-between bg-primary p-10 text-primary-foreground max-lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15">
            <ParkingSquare className="size-5" />
          </div>
          <span className="text-lg font-semibold">Smart Parking</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Manage parking lots with ease, from anywhere.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            One platform for administrators, owners, and staff to manage lots, reservations, sessions, and
            payments in real time.
          </p>
          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
            <Feature icon={ShieldCheck} label="Role-based access" />
            <Feature icon={Timer} label="Live sessions" />
            <Feature icon={Wallet} label="Instant payments" />
          </div>
        </div>

        <p className="text-xs text-primary-foreground/70">
          &copy; {new Date().getFullYear()} Smart Parking Lot Management System
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/90">
      <Icon className="size-4" />
      {label}
    </div>
  )
}
