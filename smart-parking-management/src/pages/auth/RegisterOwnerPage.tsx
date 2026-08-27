import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, Link } from "react-router-dom"
import { Loader2, Building2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { authApi } from "@/api/auth"
import type { RegisterOwnerRequest as RegisterOwnerPayload } from "@/types"
import { getErrorMessage } from "@/api/client"
import { useAuthStore } from "@/stores/authStore"
import { toast } from "sonner"
import { strongPassword } from "@/lib/passwordSchema"

const ownerRegistrationSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
    email: z.string().email("Invalid email address"),
    password: strongPassword,
    confirm_password: z.string(),
    company_name: z.string().min(2, "Company name must be at least 2 characters").max(100, "Company name must be at most 100 characters"),
    phone: z.string().trim().min(8, "Phone number is required for wallet payments").max(20, "Phone number is too long"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type OwnerRegistrationFormValues = z.infer<typeof ownerRegistrationSchema>

export function RegisterOwnerPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const { setUser } = useAuthStore()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OwnerRegistrationFormValues>({
    resolver: zodResolver(ownerRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirm_password: "",
      company_name: "",
      phone: "",
    },
  })

  async function onSubmit(data: OwnerRegistrationFormValues) {
    setSubmitting(true)
    try {
      const payload: RegisterOwnerPayload = {
        name: data.name,
        email: data.email,
        password: data.password,
        confirm_password: data.confirm_password,
        company_name: data.company_name,
        phone: data.phone,
      }

      const user = await authApi.registerOwner(payload)
      setUser(user)

      toast.success("Registration successful! Please verify your email to continue.")
      navigate("/verify-email", { replace: true })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground">Register as Parking Owner</h1>
        <p className="text-sm text-muted-foreground">
          Create your account to manage parking lots
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-sm text-foreground font-bold">Owner Full Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            {...register("name")}
            disabled={submitting}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company_name" className="text-sm text-foreground font-bold">Company Name</Label>
          <Input
            id="company_name"
            placeholder="ABC Parking Solutions"
            {...register("company_name")}
            disabled={submitting}
          />
          {errors.company_name && <p className="text-xs text-destructive">{errors.company_name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-sm text-foreground font-bold">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register("email")}
            disabled={submitting}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className="text-sm text-foreground font-bold">Phone Number</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm font-medium text-muted-foreground select-none">
              +959
            </span>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="XXXXXXXXX"
              className="rounded-l-none pl-3"
              disabled={submitting}
              {...register("phone", {
                setValueAs: (v: string) => {
                  const digits = v.replace(/^\+?959/, "").replace(/\D/g, "")
                  return digits ? `+959${digits}` : ""
                },
              })}
              onChange={(e) => {
                const raw = e.target.value.replace(/^\+?959/, "").replace(/\D/g, "")
                e.target.value = raw
                setValue("phone", raw ? `+959${raw}` : "", { shouldValidate: true })
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Used for digital wallet payments. You can change this later in your profile.</p>
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-sm text-foreground font-bold">Password</Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            {...register("password")}
            disabled={submitting}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm_password" className="text-sm text-foreground font-bold">Confirm Password</Label>
          <PasswordInput
            id="confirm_password"
            placeholder="••••••••"
            {...register("confirm_password")}
            disabled={submitting}
          />
          {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password.message}</p>}
        </div>


        <Button type="submit" className="w-full h-11" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Building2 className="mr-2 size-4" />}
          {submitting ? "Creating Account..." : "Register as Owner"}
          {!submitting && <ArrowRight className="ml-2 size-4" />}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </form>

      <div className="rounded bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Parking Owner Benefits</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Manage multiple parking lots</li>
          <li>Track reservations and sessions</li>
          <li>Track sessions and revenue</li>
          <li>Manage staff assignments</li>
        </ul>
      </div>
    </div>
  )
}
