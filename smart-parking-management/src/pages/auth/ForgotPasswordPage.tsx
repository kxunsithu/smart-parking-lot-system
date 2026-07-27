import { useState } from "react"
import { Link } from "react-router-dom"
import { MailQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Forgot your password?</h2>
        <p className="text-sm text-muted-foreground">
          Enter your account email. If self-service reset isn&apos;t available yet, your administrator can
          reset it for you.
        </p>
      </div>

      {submitted ? (
        <Alert>
          <MailQuestion className="size-4" />
          <AlertTitle>Reset request noted</AlertTitle>
          <AlertDescription>
            Self-service email reset is not enabled on this server yet. Please contact your System Admin or
            Parking Owner with the email <span className="font-medium text-foreground">{email}</span> to
            have your password reset manually. You can also sign in and use{" "}
            <span className="font-medium text-foreground">Change Password</span> from your profile once
            logged in.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <Button type="submit" className="w-full">
            Send reset instructions
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
