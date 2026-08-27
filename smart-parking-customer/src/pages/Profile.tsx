import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, Phone, Loader2, User, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { useLanguage } from "@/lib/i18n"
import { toast } from "@/components/ui/toaster"
import { strongPassword } from "@/lib/passwordSchema"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().trim().min(8, "Phone number is required for wallet payments").max(20, "Phone number is too long"),
})
type ProfileFormData = z.infer<typeof profileSchema>

export default function Profile() {
  const { t } = useLanguage()
  const { user, setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
    },
  })

  useEffect(() => {
    resetProfile({
      name: user?.name ?? "",
      phone: user?.phone ?? "",
    })
  }, [user?.name, user?.phone, resetProfile])

  const onSaveProfile = async (data: ProfileFormData) => {
    setSavingProfile(true)
    try {
      const updated = await authApi.updateProfile({
        name: data.name,
        phone: data.phone.trim(),
      })
      setUser(updated)
      toast.success("Profile updated successfully.")
    } catch {
      toast.error("Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground">{t("nav.profile", "My Profile")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("profile.account", "Manage your account settings and preferences")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.account", "Account Information")}</CardTitle>
                <CardDescription>Your personal details and wallet phone number</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
                  <div>
                    <Label htmlFor="profile-name">{t("profile.name", "Full Name")}</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="profile-name" className="pl-10" {...registerProfile("name")} />
                    </div>
                    {profileErrors.name && (
                      <p className="text-sm text-destructive mt-1">{profileErrors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="profile-phone">{t("profile.phone", "Phone Number")}</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="profile-phone" type="tel" inputMode="tel" className="pl-10" {...registerProfile("phone")} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Used automatically for digital wallet payments.</p>
                    {profileErrors.phone && (
                      <p className="text-sm text-destructive mt-1">{profileErrors.phone.message}</p>
                    )}
                  </div>

                  <div className="flex items-center text-sm gap-2 py-2 border-t border-b">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{t("profile.email", "Email")}</span>
                    <span className="ml-auto font-medium">{user?.email}</span>
                  </div>

                  <div className="flex items-center text-sm gap-2 py-2">
                    <span className="text-muted-foreground">{t("profile.verified", "Account Status")}</span>
                    <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${user?.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}>
                      {user?.is_active ? t("common.open", "Active") : t("common.closed", "Inactive")}
                    </span>
                  </div>

                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("profile.saving", "Saving…")}
                      </>
                    ) : (
                      t("profile.save", "Save Changes")
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.change_password", "Change Password")}</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Current password is required"),
  new_password: strongPassword,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

function ChangePasswordForm() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordFormData) => {
    setLoading(true)
    try {
      await authApi.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      })
      toast.success("Password changed successfully")
      reset()
    } catch {
      toast.error("Failed to change password. Please check your current password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="old_password">{t("profile.current_password", "Current Password")}</Label>
        <div className="relative mt-1">
          <Input
            id="old_password"
            type={showOldPassword ? "text" : "password"}
            className="pr-10"
            {...register("old_password")}
          />
          <button
            type="button"
            onClick={() => setShowOldPassword(!showOldPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label={showOldPassword ? "Hide password" : "Show password"}
          >
            {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.old_password && (
          <p className="text-sm text-destructive mt-1">{errors.old_password.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="new_password">{t("profile.new_password", "New Password")}</Label>
        <div className="relative mt-1">
          <Input
            id="new_password"
            type={showNewPassword ? "text" : "password"}
            className="pr-10"
            {...register("new_password")}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label={showNewPassword ? "Hide password" : "Show password"}
          >
            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.new_password && (
          <p className="text-sm text-destructive mt-1">{errors.new_password.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="confirm_password">{t("profile.confirm_password", "Confirm New Password")}</Label>
        <div className="relative mt-1">
          <Input
            id="confirm_password"
            type={showConfirmPassword ? "text" : "password"}
            className="pr-10"
            {...register("confirm_password")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.confirm_password && (
          <p className="text-sm text-destructive mt-1">{errors.confirm_password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t("profile.saving", "Changing…")}
          </>
        ) : (
          t("profile.change_password", "Change Password")
        )}
      </Button>
    </form>
  )
}
