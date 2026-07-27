import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { Loader2, ParkingSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import { authApi } from "@/api/auth"
import { subscriptionApi } from "@/api/subscription"
import { getErrorMessage } from "@/api/client"
import { useAuthStore } from "@/stores/authStore"
import { homePathForRole } from "@/utils/navConfig"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const { setTokens, setUser } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true)
    try {
      const tokens = await authApi.login({ email: values.email, password: values.password })
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await authApi.me()
      setUser(user)
      
      // Check if email is verified
      if (!user.is_verified) {
        try {
          // Try to send OTP first
          await authApi.sendOTP({ email: user.email })
          toast.info("OTP sent to your email. Please verify to continue.")
          navigate("/verify-email", { replace: true })
        } catch (otpError) {
          // If OTP send fails, logout and stay on login page
          toast.error(getErrorMessage(otpError))
          const { logout } = useAuthStore.getState()
          logout()
          console.error("OTP send failed:", otpError)
        }
        return
      }
      
      toast.success(`Welcome back, ${user.name}!`)
      
      // Check subscription status for owners
      if (user.role!.name === "OWNER") {
        try {
          const status = await subscriptionApi.getMySubscriptionStatus()
          if (!status.has_subscription) {
            navigate("/owner/subscription", { replace: true })
            return
          }
        } catch (error) {
          // If subscription check fails, still proceed to dashboard
          console.error("Subscription check failed:", error)
        }
      }
      
      navigate(homePathForRole(user.role!.name), { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 lg:hidden">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ParkingSquare className="size-5" />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Sign in to your account</h2>
        <p className="text-sm text-muted-foreground">Enter your credentials to access your dashboard.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...register("password")} />
        </FormField>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </div>
  )
}
