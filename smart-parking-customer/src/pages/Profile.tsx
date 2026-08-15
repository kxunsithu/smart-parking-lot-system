import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Camera, Mail, Loader2, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Navbar from "@/components/layout/Navbar"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import { toast } from "@/components/ui/toaster"

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

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [removingImage, setRemovingImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    getAvatarUrl(user?.profile_image)
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreviewUrl(getAvatarUrl(user?.profile_image))
  }, [user?.profile_image])

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl p-6">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground">My Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
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
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="bg-primary p-2.5 rounded-full shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role?.name ?? "Customer"}</p>
                  </div>
                </div>

                <div className="flex items-center text-sm gap-2 py-2 border-b">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Email</span>
                  <span className="ml-auto font-medium">{user?.email}</span>
                </div>

                <div className="flex items-center text-sm gap-2 py-2">
                  <span className="text-muted-foreground">Account Status</span>
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${user?.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}>
                    {user?.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

function ChangePasswordForm() {
  const [loading, setLoading] = useState(false)

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
        <Label htmlFor="old_password">Current Password</Label>
        <Input
          id="old_password"
          type="password"
          {...register("old_password")}
        />
        {errors.old_password && (
          <p className="text-sm text-destructive mt-1">{errors.old_password.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="new_password">New Password</Label>
        <Input
          id="new_password"
          type="password"
          {...register("new_password")}
        />
        {errors.new_password && (
          <p className="text-sm text-destructive mt-1">{errors.new_password.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirm New Password</Label>
        <Input
          id="confirm_password"
          type="password"
          {...register("confirm_password")}
        />
        {errors.confirm_password && (
          <p className="text-sm text-destructive mt-1">{errors.confirm_password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Changing…
          </>
        ) : (
          "Change Password"
        )}
      </Button>
    </form>
  )
}
