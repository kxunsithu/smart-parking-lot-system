import { Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { homePathForRole } from "@/utils/navConfig"

export function UnauthorizedPage() {
  const { role } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <ShieldAlert className="size-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Access denied</h1>
      <p className="max-w-sm text-muted-foreground">
        You don&apos;t have permission to view this page. If you think this is a mistake, contact your
        administrator.
      </p>
      <Button asChild>
        <Link to={role ? homePathForRole(role) : "/login"}>Back to safety</Link>
      </Button>
    </div>
  )
}
