import { Link } from "react-router-dom"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Compass className="size-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  )
}
