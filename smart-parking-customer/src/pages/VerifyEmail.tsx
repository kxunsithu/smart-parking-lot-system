import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Loader2, Mail, CheckCircle, ArrowLeft, Clock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  // Fetch user profile if not populated
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/20 to-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-2 text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="bg-primary/10 border border-primary/20 p-3.5 rounded text-primary shadow-inner">
              <Mail className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">Verify Your Email</CardTitle>
          <CardDescription>
            Enter the 6-digit verification code sent to
          </CardDescription>
          <p className="font-semibold text-foreground text-sm truncate px-2">{user?.email}</p>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          <form onSubmit={handleSubmit(onOTPSubmit)} className="space-y-5">
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block text-center">
                Enter OTP Code
              </label>
              <OTPInput value={otpValue} onChange={handleOtpChange} disabled={submitting} />
              {errors.otp && (
                <p className="text-xs text-destructive text-center mt-1">{errors.otp.message}</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground py-1">
              <Clock className="h-3.5 w-3.5" />
              {isUsed === true ? (
                <span className="text-destructive font-semibold">OTP has already been used</span>
              ) : timeLeft <= 0 ? (
                <span className="text-destructive font-semibold">OTP has expired</span>
              ) : (
                <span>Expires in <strong className="text-foreground font-mono">{formatTime(timeLeft)}</strong></span>
              )}
            </div>

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={submitting || otpValue.length !== 6 || timeLeft <= 0 || isUsed === true}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying...
                </>
              ) : (
                <>
                  Verify Email
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={submitting}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Login
              </Button>

              <button
                type="button"
                onClick={handleResendOTP}
                className="text-primary hover:underline text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                disabled={resendingOTP || submitting}
              >
                {resendingOTP && <Loader2 className="h-3 w-3 animate-spin" />}
                Resend OTP
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-border/60 bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              Why verify your email?
            </div>
            <p className="leading-relaxed">
              Email verification secures your customer account and allows real-time notifications for your parking sessions and payments.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
