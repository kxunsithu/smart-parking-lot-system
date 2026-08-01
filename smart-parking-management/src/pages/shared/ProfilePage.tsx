import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2, LogOut } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { FormField } from "@/components/common/FormField"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { authApi } from "@/api/auth"
import { getErrorMessage } from "@/api/client"
import { useAuthStore } from "@/stores/authStore"
import { useAuth } from "@/hooks/useAuth"
import { initials } from "@/utils/formatters"
import { ROLE_LABELS } from "@/utils/navConfig"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})
type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
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
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "" },
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

      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary/15 text-lg text-primary">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground">{role ? ROLE_LABELS[role] : ""}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Update your full name.</CardDescription>
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
                <Input id="old_password" type="password" {...passwordForm.register("old_password")} />
              </FormField>
              <FormField
                label="New password"
                htmlFor="new_password"
                error={passwordForm.formState.errors.new_password?.message}
                required
              >
                <Input id="new_password" type="password" {...passwordForm.register("new_password")} />
              </FormField>
              <FormField
                label="Confirm new password"
                htmlFor="confirm_password"
                error={passwordForm.formState.errors.confirm_password?.message}
                required
              >
                <Input id="confirm_password" type="password" {...passwordForm.register("confirm_password")} />
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
