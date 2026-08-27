import { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { Loader2, CheckCircle, ArrowLeft, Clock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { OTPInput } from "@/components/common/OTPInput"
import { cn } from "@/lib/utils"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/components/ui/toaster"
import { useLanguage } from "@/lib/i18n"

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
  const { t } = useLanguage()

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
    <AuthLayout>
      <h1 className="text-xl font-bold text-foreground mb-2">{t("auth.verify_title", "Verify your email")}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {t("auth.verify_subtitle", "We've sent a 6-digit code to")}{" "}
        <span className="font-medium text-foreground">{user?.email}</span>.{" "}
        {t("auth.verify_instruction", "Enter the code below to verify your account.")}
      </p>

      <div
        className={cn(
          "flex items-center gap-2 mb-6 px-4 py-3 rounded",
          isUsed === true || timeLeft <= 0
            ? "bg-red-50 border border-red-200"
            : "bg-muted/40 border border-border"
        )}
      >
        <Clock className={cn("size-4 shrink-0", isUsed === true || timeLeft <= 0 ? "text-red-500" : "text-primary")} />
        {isUsed === true ? (
          <p className="text-sm text-red-500 font-medium">{t("auth.otp_used", "OTP has already been used")}</p>
        ) : timeLeft <= 0 ? (
          <p className="text-sm text-red-500 font-medium">{t("auth.otp_expired", "OTP has expired. Request a new code.")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("auth.code_expires", "Code expires in —")}{" "}
            <span className="font-mono font-bold text-base text-primary">{formatTime(timeLeft)}</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onOTPSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-foreground font-bold">{t("auth.enter_otp", "Enter OTP code")}</label>
          <OTPInput value={otpValue} onChange={handleOtpChange} disabled={submitting} />
          {errors.otp && (
            <p className="text-xs text-destructive mt-1">{errors.otp.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11"
          disabled={submitting || otpValue.length !== 6 || timeLeft <= 0 || isUsed === true}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          {submitting ? t("auth.verifying", "Verifying...") : t("auth.verify_btn", "Verify Email")}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={submitting}
            className="text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("auth.back_to_login", "Back to Login")}
          </Button>

          <button
            type="button"
            onClick={handleResendOTP}
            className="text-primary hover:underline text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1"
            disabled={resendingOTP || submitting}
          >
            {resendingOTP && <Loader2 className="h-3 w-3 animate-spin" />}
            {t("auth.resend_otp", "Resend OTP")}
          </button>
        </div>
      </form>

      <div className="rounded border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-1 mt-6">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          {t("auth.why_verify", "Why verify your email?")}
        </div>
        <p className="leading-relaxed">
          {t("auth.why_verify_desc", "Email verification secures your customer account and allows real-time notifications for your parking sessions and payments.")}
        </p>
      </div>
    </AuthLayout>
  )
}
