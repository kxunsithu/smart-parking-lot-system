import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, MailQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { authApi } from "@/api/auth"
import { getErrorMessage } from "@/api/client"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    try {
      setIsLoading(true)
      await authApi.sendOTP({ email })
      setSubmitted(true)
      toast.success("A password reset OTP has been sent to your email.")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-2">Forgot your password?</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Enter your account email and we&apos;ll send you a password reset OTP.
      </p>

      {submitted ? (
        <Alert>
          <MailQuestion className="size-4" />
          <AlertTitle>OTP sent</AlertTitle>
          <AlertDescription>
            A password reset OTP has been sent to <span className="font-medium text-foreground">{email}</span>.
            Please check your inbox and follow the instructions to reset your password.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormField label="Email" htmlFor="email" required labelClassName="font-bold">
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Send reset instructions
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground mt-6">
        Remembered your password?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
