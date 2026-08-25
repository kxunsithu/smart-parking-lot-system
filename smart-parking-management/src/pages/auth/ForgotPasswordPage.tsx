import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { KeyRound, Loader2, CheckCircle2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { OTPInput } from "@/components/common/OTPInput"
import { FormField } from "@/components/common/FormField"
import { authApi } from "@/api/auth"
import { getErrorMessage } from "@/api/client"
import { toast } from "sonner"
import { strongPassword } from "@/utils/passwordSchema"

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
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

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<ResetStep>("email")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendingOTP, setResendingOTP] = useState(false)
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
      toast.success("OTP code sent to your email!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!email) return
    setResendingOTP(true)
    try {
      await authApi.sendOTP({ email })
      toast.success("New OTP code sent to your email!")
    } catch (error) {
      toast.error(getErrorMessage(error))
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
      toast.success("Password reset successfully!")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Email Input */}
      {step === "email" && (
        <>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter your registered email address and we&apos;ll send you an OTP code to reset your password.
            </p>
          </div>

          <form onSubmit={emailForm.handleSubmit(onSendOTP)} className="flex flex-col gap-5">
            <FormField
              label="Email"
              htmlFor="email"
              error={emailForm.formState.errors.email?.message}
              required
              labelClassName="font-bold"
            >
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...emailForm.register("email")}
              />
            </FormField>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Send reset code
            </Button>

            <div className="text-center">
              <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="size-4" />
                Back to sign in
              </Link>
            </div>
          </form>
        </>
      )}

      {/* Step 2: OTP & New Password */}
      {step === "reset" && (
        <>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">Set new password</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit OTP code sent to <span className="font-semibold text-foreground">{email}</span> and your new password.
            </p>
          </div>

          <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-foreground">OTP Code</label>
              <OTPInput
                value={otpValue}
                onChange={(val) => {
                  setOtpValue(val)
                  resetForm.setValue("otp", val)
                }}
                disabled={loading}
              />
              {resetForm.formState.errors.otp && (
                <p className="text-xs text-destructive">{resetForm.formState.errors.otp.message}</p>
              )}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendingOTP || loading}
                  className="text-xs text-primary hover:underline font-medium disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {resendingOTP && <Loader2 className="size-3 animate-spin" />}
                  Resend OTP
                </button>
              </div>
            </div>

            <FormField
              label="New password"
              htmlFor="new_password"
              error={resetForm.formState.errors.new_password?.message}
              required
              labelClassName="font-bold"
            >
              <PasswordInput
                id="new_password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...resetForm.register("new_password")}
              />
            </FormField>

            <FormField
              label="Confirm new password"
              htmlFor="confirm_password"
              error={resetForm.formState.errors.confirm_password?.message}
              required
              labelClassName="font-bold"
            >
              <PasswordInput
                id="confirm_password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...resetForm.register("confirm_password")}
              />
            </FormField>

            <Button type="submit" className="w-full h-11" disabled={loading || otpValue.length !== 6}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Reset password
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep("email")}
                disabled={loading}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            </div>
          </form>
        </>
      )}

      {/* Step 3: Success Confirmation */}
      {step === "success" && (
        <div className="text-center space-y-4 py-4">
          <div className="size-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Password reset successfully!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
          <Button className="w-full h-11 mt-4" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        </div>
      )}
    </div>
  )
}
