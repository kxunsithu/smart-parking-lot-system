import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Car, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/components/ui/toaster"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-background p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="flex justify-center mb-2">
            <div className="bg-primary/10 border border-primary/20 p-3.5 rounded text-primary shadow-inner">
              <Car className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">Smart Parking</CardTitle>
          <CardDescription>Sign in to your customer account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm pt-2">
              <span className="text-muted-foreground">Don't have an account? </span>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-primary hover:underline font-semibold"
              >
                Sign up
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

