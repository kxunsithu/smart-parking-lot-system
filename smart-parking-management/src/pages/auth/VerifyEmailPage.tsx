import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Loader2, CheckCircle, ArrowLeft, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OTPInput } from "@/components/common/OTPInput"
import { cn } from "@/lib/utils"
import { authApi } from "@/api/auth"
import { getErrorMessage } from "@/api/client"
import { useAuthStore } from "@/stores/authStore"
import { homePathForRole } from "@/utils/navConfig"
import { toast } from "sonner"

const otpSchema = z.object({
  otp: z.string().length(6, "Please enter the 6-digit OTP code"),
})

type OTPFormValues = z.infer<typeof otpSchema>

const OTP_EXPIRE_MINUTES = 10

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [resendingOTP, setResendingOTP] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRE_MINUTES * 60)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [isUsed, setIsUsed] = useState<boolean | null>(null)
  const { user } = useAuthStore()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OTPFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } })

  // Register the otp field
  useEffect(() => {
    register("otp")
  }, [register])

  // Sync OTP input with form field
  const handleOtpChange = (value: string) => {
    setOtpValue(value)
    setValue("otp", value)
  }

  // Fetch OTP expiry time from database
  const fetchOtpExpiry = async () => {
    try {
      const status = await authApi.getOtpStatus(user!.email)
      setIsUsed(status.is_used)

      if (status.expires_at) {
        // Parse UTC timestamp and convert to local time
        const expiryDate = new Date(status.expires_at)
        setExpiresAt(expiryDate)

        // Calculate time remaining using current time
        const now = new Date()
        const remaining = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000))
        setTimeLeft(remaining)
      } else {
        setTimeLeft(0)
      }
    } catch (error) {
      console.error("Failed to fetch OTP status:", error)
      setTimeLeft(0)
    }
  }

  // Fetch OTP status on mount and when OTP is resent
  useEffect(() => {
    fetchOtpExpiry()
  }, [resendingOTP])

  // Countdown timer based on actual expiry time
  useEffect(() => {
    if (!expiresAt || timeLeft <= 0) return

    const timer = setInterval(() => {
      const now = new Date()
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      setTimeLeft(remaining)

      // Refresh OTP status every 30 seconds to sync with database
      if (remaining % 30 === 0) {
        fetchOtpExpiry()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, timeLeft])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  async function onOTPSubmit() {
    setSubmitting(true)
    try {
      const tokens = await authApi.verifyOTP({ email: user!.email, code: otpValue })
      const { setTokens, setUser } = useAuthStore.getState()

      // Set tokens BEFORE calling me() so the API call uses the new access token
      setTokens(tokens.access_token, tokens.refresh_token)

      // Fetch the updated user data with the new token
      const updatedUser = await authApi.me()
      setUser(updatedUser)

      toast.success("Email verified successfully! You are now logged in.")

      // Check if user has a role assigned
      if (!updatedUser.role || !updatedUser.role.name) {
        console.error("User role is missing after OTP verification:", updatedUser)
        toast.error("Account setup incomplete. Please contact support.")
        return
      }

      navigate(homePathForRole(updatedUser.role.name), { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendOTP() {
    setResendingOTP(true)
    try {
      await authApi.sendOTP({ email: user!.email })
      toast.success("New OTP sent to your email")
      setOtpValue("")
      setValue("otp", "")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setResendingOTP(false)
    }
  }

  function handleBack() {
    // Logout before navigating back to login
    const { logout } = useAuthStore.getState()
    logout()
    navigate("/login", { replace: true })
  }

  const timeLeftExpired = timeLeft <= 0

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-2">Verify your email</h1>
      <p className="text-sm text-muted-foreground mb-6">
        We&apos;ve sent a 6-digit code to{" "}
        <span className="font-medium text-foreground">{user?.email}</span>.
        Enter the code below to verify your account.
      </p>

      <div
        className={cn(
          "flex items-center gap-2 mb-6 px-4 py-3 rounded-lg",
          isUsed === true || timeLeftExpired
            ? "bg-red-50 border border-red-200"
            : "bg-muted/40 border border-border"
        )}
      >
        <Clock className={cn("size-4 shrink-0", isUsed === true || timeLeftExpired ? "text-red-500" : "text-primary")} />
        {isUsed === true ? (
          <p className="text-sm text-red-500 font-medium">OTP has already been used</p>
        ) : timeLeftExpired ? (
          <p className="text-sm text-red-500 font-medium">OTP has expired. Request a new code.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Code expires in —{" "}
            <span className="font-mono font-bold text-base text-primary">{formatTime(timeLeft)}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onOTPSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-foreground font-bold">Enter OTP code</label>
          <OTPInput value={otpValue} onChange={handleOtpChange} disabled={submitting} />
          {errors.otp && <p className="text-xs text-destructive">{errors.otp.message}</p>}
        </div>

        <Button type="submit" className="w-full h-11" disabled={submitting || otpValue.length !== 6 || timeLeft <= 0 || isUsed === true}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
          {submitting ? "Verifying..." : "Verify Email"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={submitting}
            className="text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Login
          </Button>
          <button
            type="button"
            onClick={handleResendOTP}
            className="text-primary hover:underline disabled:opacity-50"
            disabled={resendingOTP || submitting}
          >
            {resendingOTP ? <Loader2 className="inline size-3 animate-spin" /> : null}
            Resend OTP
          </button>
        </div>
      </form>

      <div className="rounded bg-muted p-4 text-sm text-muted-foreground mt-6">
        <p className="font-medium text-foreground mb-1">Why verify your email?</p>
        <p>Email verification helps protect your account and ensures you receive important notifications about your parking sessions.</p>
      </div>
    </div>
  )
}