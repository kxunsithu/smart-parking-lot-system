import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Loader2, Mail, CheckCircle, ArrowLeft, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OTPInput } from "@/components/common/OTPInput"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/components/ui/toaster"

const otpSchema = z.object({
  otp: z.string().length(6, "Please enter the 6-digit OTP code"),
})

type OTPFormValues = z.infer<typeof otpSchema>

const OTP_EXPIRE_MINUTES = 10

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [resendingOTP, setResendingOTP] = useState(false)
  const [otpValue, setOtpValue] = useState("")
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRE_MINUTES * 60)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [isUsed, setIsUsed] = useState<boolean | null>(null)
  const { user, setUser } = useAuthStore()

  // Fetch user data if not available
  useEffect(() => {
    if (!user) {
      authApi.getMe().then(setUser).catch(console.error)
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OTPFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } })

  useEffect(() => {
    register("otp")
  }, [register])

  const handleOtpChange = (value: string) => {
    setOtpValue(value)
    setValue("otp", value)
  }

  const expiresAtRef = useRef<Date | null>(null)

  const fetchOtpExpiry = useCallback(async () => {
    if (!user) return
    try {
      const status = await authApi.getOtpStatus(user.email)
      setIsUsed(status.is_used)

      if (status.expires_at) {
        const expiryDate = new Date(status.expires_at)
        setExpiresAt(expiryDate)
        expiresAtRef.current = expiryDate

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
  }, [user])

  useEffect(() => {
    fetchOtpExpiry()
  }, [fetchOtpExpiry])

  useEffect(() => {
    if (!expiresAt) return

    const timer = setInterval(() => {
      const expiry = expiresAtRef.current
      if (!expiry) return
      const now = new Date()
      const remaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000))
      setTimeLeft(remaining)

      if (remaining % 30 === 0) {
        fetchOtpExpiry()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, fetchOtpExpiry])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  async function onOTPSubmit() {
    setSubmitting(true)
    try {
      const tokens = await authApi.verifyOTP({ email: user!.email, code: otpValue })
      const { setTokens, setUser, setVerifying, logout } = useAuthStore.getState()

      setTokens(tokens.access_token, tokens.refresh_token)

      const updatedUser = await authApi.getMe()

      // Guard: ensure verified user is a customer
      if (!updatedUser.role || updatedUser.role.name.toLowerCase() !== "customer") {
        toast.error("Access denied. This is a customer-only portal.")
        logout()
        navigate("/login", { replace: true })
        return
      }

      setUser(updatedUser)
      setVerifying(false)

      toast.success("Email verified successfully!")
      navigate("/dashboard", { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Verification failed")
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend OTP")
    } finally {
      setResendingOTP(false)
    }
  }

  function handleBack() {
    const { logout, setVerifying } = useAuthStore.getState()
    setVerifying(false)
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded shadow-lg p-8 space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold">Verify your email</h2>
            <p className="text-sm text-muted-foreground">
              Please verify your email address to continue
            </p>
          </div>

          <form onSubmit={handleSubmit(onOTPSubmit)} className="space-y-4">
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="size-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit code to
                </p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enter OTP code</label>
              <OTPInput value={otpValue} onChange={handleOtpChange} disabled={submitting} />
              {errors.otp && <p className="text-sm text-destructive">{errors.otp.message}</p>}
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" />
              {isUsed === true ? (
                <span className="text-destructive">OTP has already been used</span>
              ) : timeLeft <= 0 ? (
                <span className="text-destructive">OTP has expired</span>
              ) : (
                <span>Expires in: {formatTime(timeLeft)}</span>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting || otpValue.length !== 6 || timeLeft <= 0 || isUsed === true}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Verify Email
              {!submitting && <CheckCircle className="ml-2 size-4" />}
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

          <div className="rounded bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Why verify your email?</p>
            <p>Email verification helps protect your account and ensures you receive important notifications about your parking sessions.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
