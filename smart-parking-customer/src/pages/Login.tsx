import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { useLanguage } from "@/lib/i18n"
import { toast } from "@/components/ui/toaster"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { setTokens, setUser, setVerifying } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const tokens = await authApi.login(data)
      setTokens(tokens.access_token, tokens.refresh_token)

      let user
      try {
        user = await authApi.getMe()
      } catch {
        const { logout } = useAuthStore.getState()
        logout()
        toast.error("Failed to fetch user profile")
        return
      }

      // Check if user has customer role — guard against null role
      if (!user.role || user.role.name.toLowerCase() !== "customer") {
        toast.error("Access denied. This is a customer-only portal.")
        const { logout } = useAuthStore.getState()
        logout()
        setIsLoading(false)
        return
      }

      // Check if email is verified
      if (!user.is_verified) {
        try {
          await authApi.sendOTP({ email: user.email })
          toast.info("OTP sent to your email. Please verify to continue.")
          setUser(user)
          setVerifying(true)
          navigate("/verify-email")
          return
        } catch (otpError: any) {
          toast.error(otpError.response?.data?.message || "Failed to send OTP")
          console.error("OTP send failed:", otpError)
          return
        }
      }

      setUser(user)
      toast.success("Login successful!")
      navigate("/dashboard")

    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(onSubmit)(e)
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-bold text-foreground mb-2">{t("nav.login", "Log in")}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {t("home.cta_subtitle", "Enter your credentials to continue to Smart Parking.")}
      </p>

      <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-sm text-foreground font-bold">{t("profile.email", "Email Address")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm text-foreground font-bold">{t("profile.change_password", "Password")}</Label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              {t("auth.forgot_password", "Forgot Password?")}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-11" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
          ) : null}
          {isLoading ? "Signing in..." : t("nav.login", "Log in")}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don&apos;t have an account? </span>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-primary hover:underline font-medium"
          >
            {t("nav.register", "Register")}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}

