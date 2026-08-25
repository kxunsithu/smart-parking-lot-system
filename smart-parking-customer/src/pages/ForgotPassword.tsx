import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { OTPInput } from "@/components/common/OTPInput"
import { authApi } from "@/api/auth"
import { useLanguage } from "@/lib/i18n"
import { toast } from "@/components/ui/toaster"
import { strongPassword } from "@/lib/passwordSchema"

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
})

const resetSchema = z
  .object({
    otp: z.string().length(6, "Please enter the 6-digit OTP code"),
    new_password: strongPassword,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  })

type EmailForm = z.infer<typeof emailSchema>
type ResetForm = z.infer<typeof resetSchema>

type ResetStep = "email" | "reset" | "success"

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [step, setStep] = useState<ResetStep>("email")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendingOTP, setResendingOTP] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otpValue, setOtpValue] = useState("")

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  })

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const onSendOTP = async (data: EmailForm) => {
    setLoading(true)
    try {
      await authApi.sendOTP({ email: data.email })
      setEmail(data.email)
      setStep("reset")
      toast.success(t("auth.otp_sent", "OTP code sent to your email!"))
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("auth.otp_send_failed", "Failed to send OTP"))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!email) return
    setResendingOTP(true)
    try {
      await authApi.sendOTP({ email })
      toast.success(t("auth.otp_sent", "New OTP code sent to your email!"))
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("auth.otp_send_failed", "Failed to resend OTP"))
    } finally {
      setResendingOTP(false)
    }
  }

  const onResetPassword = async (data: ResetForm) => {
    setLoading(true)
    try {
      await authApi.resetPassword({
        email,
        otp: data.otp,
        new_password: data.new_password,
      })
      setStep("success")
      toast.success(t("auth.reset_success_title", "Password Reset Successfully!"))
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("auth.reset_failed", "Failed to reset password. Please verify your OTP code."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {/* ── Step 1: Request OTP for Email ─────────────────────── */}
      {step === "email" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="size-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">{t("auth.forgot_title", "Reset Your Password")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {t("auth.forgot_subtitle", "Enter your registered email address and we'll send you an OTP code to reset your password.")}
          </p>

          <form onSubmit={emailForm.handleSubmit(onSendOTP)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm text-foreground font-bold">
                {t("profile.email", "Email Address")}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...emailForm.register("email")}
                />
              </div>
              {emailForm.formState.errors.email && (
                <p className="text-xs text-destructive mt-1">{emailForm.formState.errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? t("auth.sending_otp", "Sending Code...") : t("auth.send_otp_btn", "Send Reset Code")}
            </Button>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                {t("auth.back_to_login", "Back to Login")}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* ── Step 2: Enter OTP & New Password ───────────────────── */}
      {step === "reset" && (
        <>
          <h1 className="text-xl font-bold text-foreground mb-2">{t("auth.forgot_title", "Reset Your Password")}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t("auth.reset_subtitle", "Enter the 6-digit OTP code sent to your email and your new password.")}
          </p>

          <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground font-bold">{t("auth.enter_otp", "Enter OTP code")}</Label>
              <OTPInput
                value={otpValue}
                onChange={(val) => {
                  setOtpValue(val)
                  resetForm.setValue("otp", val)
                }}
                disabled={loading}
              />
              {resetForm.formState.errors.otp && (
                <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.otp.message}</p>
              )}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendingOTP || loading}
                  className="text-xs text-primary hover:underline font-medium disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {resendingOTP && <Loader2 className="size-3 animate-spin" />}
                  {t("auth.resend_otp", "Resend OTP")}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new_password" className="text-sm text-foreground font-bold">
                {t("auth.new_password", "New Password")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...resetForm.register("new_password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetForm.formState.errors.new_password && (
                <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.new_password.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm_password" className="text-sm text-foreground font-bold">
                {t("auth.confirm_new_password", "Confirm New Password")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  {...resetForm.register("confirm_password")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetForm.formState.errors.confirm_password && (
                <p className="text-xs text-destructive mt-1">{resetForm.formState.errors.confirm_password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading || otpValue.length !== 6}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? t("auth.resetting", "Resetting Password...") : t("auth.reset_btn", "Reset Password")}
            </Button>

            <div className="text-center pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("email")}
                disabled={loading}
                className="text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                {t("auth.back", "Back")}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* ── Step 3: Success Confirmation ─────────────────────────── */}
      {step === "success" && (
        <div className="text-center space-y-4 py-4">
          <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {t("auth.reset_success_title", "Password Reset Successfully!")}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("auth.reset_success_desc", "Your password has been updated. You can now log in with your new password.")}
            </p>
          </div>
          <Button className="w-full h-11 mt-4" onClick={() => navigate("/login")}>
            {t("auth.login_btn", "Log In")}
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
