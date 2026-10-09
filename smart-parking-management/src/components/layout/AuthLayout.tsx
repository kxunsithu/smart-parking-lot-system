import { Outlet } from "react-router-dom"
import { ParkingSquare } from "lucide-react"

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + Brand Name */}
        <div className="flex items-center gap-3 mb-8">
          <div className="size-12 rounded-full flex items-center justify-center bg-primary/10 border border-primary/20">
            <ParkingSquare className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-foreground font-bold leading-tight">
              AI Parking
            </p>
            <p className="text-xs text-muted-foreground">Management Portal</p>
          </div>
        </div>

        <Outlet />
      </div>
    </main>
  )
}
