import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { Loader2, ArrowRight, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import { OTPInput } from "@/components/common/OTPInput"
import { authApi } from "@/api/auth"
import { getErrorMessage, getFieldErrors } from "@/api/client"
import { useAuthStore } from "@/stores/authStore"

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

const otpSchema = z.object({
  otp: z.string().length(6, "Please enter the 6-digit OTP code"),
})

type RegisterFormValues = z.infer<typeof registerSchema>
type OTPFormValues = z.infer<typeof otpSchema>

type Step = "details" | "otp"

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>("details")
  const [submitting, setSubmitting] = useState(false)
  const [resendingOTP, setResendingOTP] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [registeredData, setRegisteredData] = useState<RegisterFormValues | null>(null)
  const [otpValue, setOtpValue] = useState("")
  const { setTokens, setUser } = useAuthStore()

  const {
    register: registerForm,
    handleSubmit: handleRegisterSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) })

  const {
    handleSubmit: handleOTPSubmit,
    formState: { errors: otpErrors },
  } = useForm<OTPFormValues>({ resolver: zodResolver(otpSchema) })

  async function onRegisterSubmit(values: RegisterFormValues) {
    setSubmitting(true)
    try {
      // First send OTP to verify email
      await authApi.sendOTP({ email: values.email })
      setRegisteredEmail(values.email)
      setRegisteredData(values)
      setStep("otp")
      toast.success("OTP sent to your email")
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors.email) {
        setError("email", { message: fieldErrors.email })
      } else {
        toast.error(getErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function onOTPSubmit() {
    setSubmitting(true)
    try {
      // Verify OTP
      await authApi.verifyOTP({ email: registeredEmail, code: otpValue })
      
      // Register user with saved data
      if (registeredData) {
        const user = await authApi.register({
          name: registeredData.name,
          email: registeredData.email,
          password: registeredData.password,
          phone: registeredData.phone || undefined,
        })
        
        // Check if user is verified (should be after OTP verification)
        if (!user.is_verified) {
          toast.success("Account created! Please verify your email to continue.")
          const tokens = await authApi.login({ email: registeredData.email, password: registeredData.password })
          setTokens(tokens.access_token, tokens.refresh_token)
          setUser(user)
          
          // Try to send OTP before redirecting
          try {
            await authApi.sendOTP({ email: user.email })
            toast.info("OTP sent to your email. Please verify to continue.")
            navigate("/verify-email", { replace: true })
          } catch (otpError) {
            // If OTP send fails, logout and stay on register page
            toast.error(getErrorMessage(otpError))
            const { logout } = useAuthStore.getState()
            logout()
            console.error("OTP send failed:", otpError)
          }
          return
        }
        
        toast.success("Account created! Signing you in...")
        const tokens = await authApi.login({ email: registeredData.email, password: registeredData.password })
        setTokens(tokens.access_token, tokens.refresh_token)
        setUser(user)
        navigate("/admin", { replace: true })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendOTP() {
    setResendingOTP(true)
    try {
      await authApi.sendOTP({ email: registeredEmail })
      toast.success("New OTP sent to your email")
      setOtpValue("")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setResendingOTP(false)
    }
  }

  function handleBack() {
    setStep("details")
    setOtpValue("")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          {step === "details" ? "Create your account" : "Verify your email"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {step === "details"
            ? "Enter your details to create an account"
            : "Enter the 6-digit code sent to your email"}
        </p>
      </div>

      {step === "details" ? (
        <form onSubmit={handleRegisterSubmit(onRegisterSubmit)} className="space-y-4">
          <FormField label="Full name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" placeholder="John Doe" autoComplete="name" {...registerForm("name")} />
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...registerForm("email")} />
          </FormField>

          <FormField label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" placeholder="+1 234 567 8901" autoComplete="tel" {...registerForm("phone")} />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...registerForm("password")}
            />
          </FormField>

          <FormField
            label="Confirm password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              {...registerForm("confirmPassword")}
            />
          </FormField>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Continue
            {!submitting && <ArrowRight className="ml-2 size-4" />}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleOTPSubmit(onOTPSubmit)} className="space-y-4">
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                We've sent a 6-digit code to
              </p>
              <p className="font-medium">{registeredEmail}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Enter OTP code</label>
            <OTPInput value={otpValue} onChange={setOtpValue} disabled={submitting} />
            {otpErrors.otp && <p className="text-sm text-destructive">{otpErrors.otp.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={submitting || otpValue.length !== 6}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Verify & Create Account
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleBack}
              className="text-muted-foreground hover:text-primary"
              disabled={submitting}
            >
              Back
            </button>
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
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
