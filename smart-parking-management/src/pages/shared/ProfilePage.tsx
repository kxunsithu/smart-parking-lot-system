import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, LogOut, Eye, EyeOff } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { authApi } from "@/api/auth"
import { getErrorMessage } from "@/api/client"
import { useAuthStore } from "@/stores/authStore"
import { useAuth } from "@/hooks/useAuth"
import { ROLE_LABELS } from "@/utils/navConfig"
import { strongPassword } from "@/lib/passwordSchema"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().trim().min(8, "Phone number is required for wallet payments").max(20, "Phone number is too long"),
})
type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: strongPassword,
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
type PasswordFormValues = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const { setUser, logout } = useAuthStore()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  })

  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) })

  const handleUpdateProfile = async (values: ProfileFormValues) => {
    try {
      setIsUpdatingProfile(true)
      const updated = await authApi.updateProfile(values)
      setUser(updated)
      toast.success("Profile updated successfully.")
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async (values: PasswordFormValues) => {
    try {
      setIsChangingPassword(true)
      await authApi.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      })
      toast.success("Password changed successfully.")
      passwordForm.reset()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const { refreshToken } = useAuthStore.getState()
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
      logout()
      toast.success("Logged out successfully.")
      navigate("/login", { replace: true })
    } catch (error) {
      console.error("Logout error:", error)
      logout()
      navigate("/login", { replace: true })
    } finally {
      setIsLoggingOut(false)
      setLogoutDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile & Settings" description="Manage your personal information and security." />

      {/* User summary card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6 pt-6">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <p className="text-xl font-bold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground">{role ? ROLE_LABELS[role] : ""}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Update your full name and wallet phone number.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={profileForm.handleSubmit(handleUpdateProfile)}
            >
              <FormField
                label="Full name"
                htmlFor="name"
                error={profileForm.formState.errors.name?.message}
                required
              >
                <Input id="name" {...profileForm.register("name")} />
              </FormField>
              <FormField
                label="Phone number"
                htmlFor="phone"
                hint="Used automatically for digital wallet payments."
                error={profileForm.formState.errors.phone?.message}
                required
              >
                <Input id="phone" type="tel" inputMode="tel" {...profileForm.register("phone")} />
              </FormField>
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Choose a strong password you don&apos;t use elsewhere.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(handleChangePassword)}
            >
              <FormField
                label="Current password"
                htmlFor="old_password"
                error={passwordForm.formState.errors.old_password?.message}
                required
              >
                <div className="relative">
                  <Input
                    id="old_password"
                    type={showOldPassword ? "text" : "password"}
                    className="pr-10"
                    {...passwordForm.register("old_password")}
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
              </FormField>
              <FormField
                label="New password"
                htmlFor="new_password"
                error={passwordForm.formState.errors.new_password?.message}
                required
              >
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    className="pr-10"
                    {...passwordForm.register("new_password")}
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
              </FormField>
              <FormField
                label="Confirm new password"
                htmlFor="confirm_password"
                error={passwordForm.formState.errors.confirm_password?.message}
                required
              >
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="pr-10"
                    {...passwordForm.register("confirm_password")}
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
              </FormField>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account actions</CardTitle>
          <CardDescription>Manage your account session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setLogoutDialogOpen(true)} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Sign out
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="Sign out?"
        description="You will be logged out of your account and redirected to the login page."
        confirmLabel="Sign out"
        destructive
        loading={isLoggingOut}
        onConfirm={handleLogout}
      />
    </div>
  )
}
