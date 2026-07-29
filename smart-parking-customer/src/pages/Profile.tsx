import { useEffect, useState } from "react"
import { User, Mail, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Navbar from "@/components/layout/Navbar"
import { customerApi } from "@/api/customer"
import { authApi } from "@/api/auth"
import { useAuthStore } from "@/store/authStore"
import type { CustomerOut, UserOut } from "@/api/types"
import { toast } from "@/components/ui/toaster"

export default function Profile() {
  const { user } = useAuthStore()
  const [customer, setCustomer] = useState<CustomerOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await customerApi.getProfile()
      setCustomer(response)
      setFormData({
        phone: "",
        address: "",
      })
    } catch (error) {
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await customerApi.updateProfile({ current_lat: null, current_lng: null })
      setCustomer(response)
      setEditing(false)
      toast.success("Profile updated successfully")
    } catch (error) {
      toast.error("Failed to update profile")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary p-3 rounded-full">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2">{user?.email}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="ml-2">{user?.phone || "Not provided"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Profile editing is managed through your account settings.
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordForm() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.new_password !== formData.confirm_password) {
      toast.error("Passwords don't match")
      return
    }
    if (formData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    
    setLoading(true)
    try {
      await authApi.changePassword({
        old_password: formData.old_password,
        new_password: formData.new_password,
      })
      toast.success("Password changed successfully")
      setFormData({ old_password: "", new_password: "", confirm_password: "" })
    } catch (error) {
      toast.error("Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="old_password">Current Password</Label>
        <Input
          id="old_password"
          type="password"
          value={formData.old_password}
          onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="new_password">New Password</Label>
        <Input
          id="new_password"
          type="password"
          value={formData.new_password}
          onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirm New Password</Label>
        <Input
          id="confirm_password"
          type="password"
          value={formData.confirm_password}
          onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Changing..." : "Change Password"}
      </Button>
    </form>
  )
}
