import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Camera, Mail, Loader2, Trash2, User, Eye, EyeOff } from "lucide-react"
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

// Derive the backend origin from the api base URL so static assets resolve correctly
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1")
  .replace("/api/v1", "")

function getAvatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith("http")) return path
  return `${API_ORIGIN}${path}`
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE_MB = 5

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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [removingImage, setRemovingImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    getAvatarUrl(user?.profile_image)
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    setValue: setProfileValue,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name ?? "",
      phone: user?.phone?.replace(/^\+?959/, "") ?? "",
    },
  })

  useEffect(() => {
    resetProfile({
      name: user?.name ?? "",
      phone: user?.phone?.replace(/^\+?959/, "") ?? "",
    })
  }, [user?.name, user?.phone, resetProfile])

  useEffect(() => {
    setPreviewUrl(getAvatarUrl(user?.profile_image))
  }, [user?.profile_image])

  const onSaveProfile = async (data: ProfileFormData) => {
    setSavingProfile(true)
    try {
      const updated = await authApi.updateProfile({
        name: data.name,
        phone: data.phone.trim() ? `+959${data.phone.trim().replace(/^\+?959/, "")}` : data.phone.trim(),
      })
      setUser(updated)
      toast.success("Profile updated successfully.")
    } catch {
      toast.error("Failed to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed.")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_SIZE_MB} MB.`)
      return
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    try {
      setUploadingImage(true)
      const updated = await authApi.uploadProfileImage(file)
      setUser(updated)
      setPreviewUrl(getAvatarUrl(updated.profile_image))
      toast.success("Profile photo updated successfully.")
    } catch {
      toast.error("Failed to upload profile image.")
      setPreviewUrl(getAvatarUrl(user?.profile_image))
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveImage = async () => {
    try {
      setRemovingImage(true)
      const updated = await authApi.deleteProfileImage()
      setUser(updated)
      setPreviewUrl(undefined)
      toast.success("Profile photo removed.")
    } catch {
      toast.error("Failed to remove profile image.")
    } finally {
      setRemovingImage(false)
    }
  }

  const initials = (name?: string | null) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground">{t("nav.profile", "My Profile")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("profile.account", "Manage your account settings and preferences")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t("nav.profile", "Profile Photo")}</CardTitle>
              <CardDescription>Upload a photo to personalise your account</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {/* Avatar display */}
              <div className="relative group">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 bg-primary/10 flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-primary">
                      {initials(user?.name)}
                    </span>
                  )}
                </div>

                {/* Camera overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || removingImage}
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Change profile photo"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                id="profile-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || removingImage}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {previewUrl ? "Change Photo" : "Upload Photo"}
                    </>
                  )}
                </Button>

                {previewUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage || removingImage}
                  >
                    {removingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Removing…
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Photo
                      </>
                    )}
                  </Button>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                JPG, PNG, WebP or GIF · Max {MAX_SIZE_MB} MB
              </p>
            </CardContent>
          </Card>

          {/* Account Information */}
          <div className="lg:col-span-2 space-y-6">
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
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm font-medium text-muted-foreground select-none">
                        +959
                      </span>
                      <Input
                        id="profile-phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="XXXXXXXXX"
                        className="rounded-l-none pl-3"
                        {...registerProfile("phone")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/^\+?959/, "").replace(/\D/g, "")
                          e.target.value = raw
                          setProfileValue("phone", raw, { shouldValidate: true })
                        }}
                      />
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
