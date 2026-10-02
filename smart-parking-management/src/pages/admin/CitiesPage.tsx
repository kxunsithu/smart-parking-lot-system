import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  Edit,
  X,
  Upload,
  Globe,
  MapPin,
  EyeOff,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LoadingSpinner } from "@/components/common/LoadingBlock"

import { citiesApi, type CityOut } from "@/api/cities"
import { API_ORIGIN, getErrorMessage } from "@/api/client"

export function CitiesPage() {
  const [cities, setCities] = useState<CityOut[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCity, setEditingCity] = useState<CityOut | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formName, setFormName] = useState("")
  const [formNameMm, setFormNameMm] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  // Delete State
  const [deletingCity, setDeletingCity] = useState<CityOut | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchCities = async () => {
    try {
      setLoading(true)
      const data = await citiesApi.list()
      setCities(data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCities()
  }, [])

  const openCreateModal = () => {
    setEditingCity(null)
    setFormName("")
    setFormNameMm("")
    setFormDescription("")
    setFormIsActive(true)
    setImageFile(null)
    setImagePreviewUrl(null)
    setIsModalOpen(true)
  }

  const openEditModal = (city: CityOut) => {
    setEditingCity(city)
    setFormName(city.name)
    setFormNameMm(city.name_mm ?? "")
    setFormDescription(city.description ?? "")
    setFormIsActive(city.is_active)
    setImageFile(null)
    setImagePreviewUrl(city.image_url ? getFullImageUrl(city.image_url) : null)
    setIsModalOpen(true)
  }

  const getFullImageUrl = (path: string | null) => {
    if (!path) return null
    if (path.startsWith("http://") || path.startsWith("https://")) return path
    return `${API_ORIGIN}${path}`
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error("City name is required")
      return
    }

    try {
      setSubmitting(true)
      const formData = new FormData()
      formData.append("name", formName.trim())
      if (formNameMm.trim()) formData.append("name_mm", formNameMm.trim())
      if (formDescription.trim()) formData.append("description", formDescription.trim())
      formData.append("is_active", String(formIsActive))
      if (imageFile) {
        formData.append("image", imageFile)
      }

      if (editingCity) {
        await citiesApi.update(editingCity.id, formData)
        toast.success(`City "${formName}" updated successfully`)
      } else {
        await citiesApi.create(formData)
        toast.success(`City "${formName}" added successfully`)
      }

      setIsModalOpen(false)
      fetchCities()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCity) return
    try {
      setDeleting(true)
      await citiesApi.delete(deletingCity.id)
      toast.success(`City "${deletingCity.name}" deleted`)
      setDeletingCity(null)
      fetchCities()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = async (city: CityOut) => {
    try {
      const formData = new FormData()
      formData.append("name", city.name)
      formData.append("is_active", String(!city.is_active))
      await citiesApi.update(city.id, formData)
      toast.success(`${city.name} is now ${!city.is_active ? "Active" : "Inactive"}`)
      fetchCities()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const filteredCities = cities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name_mm && c.name_mm.includes(searchQuery))
    if (activeFilter === "active") return matchesSearch && c.is_active
    if (activeFilter === "inactive") return matchesSearch && !c.is_active
    return matchesSearch
  })

  const totalCities = cities.length
  const activeCount = cities.filter((c) => c.is_active).length
  const inactiveCount = totalCities - activeCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manage Cities & Townships
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage supported cities, township descriptions, and cover images across Kayin State.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shrink-0 gap-2 shadow-md">
          <Plus className="w-4 h-4" /> Add City
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Cities</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalCities}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Globe className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Cities</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Inactive Cities</p>
              <p className="text-2xl font-bold text-muted-foreground mt-1">{inactiveCount}</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-muted-foreground">
              <EyeOff className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search city by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <Button
            size="sm"
            variant={activeFilter === "all" ? "default" : "outline"}
            onClick={() => setActiveFilter("all")}
            className="rounded-lg"
          >
            All ({totalCities})
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "active" ? "default" : "outline"}
            onClick={() => setActiveFilter("active")}
            className="rounded-lg text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          >
            Active ({activeCount})
          </Button>
          <Button
            size="sm"
            variant={activeFilter === "inactive" ? "default" : "outline"}
            onClick={() => setActiveFilter("inactive")}
            className="rounded-lg text-muted-foreground"
          >
            Inactive ({inactiveCount})
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : filteredCities.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-4 bg-muted rounded-full text-muted-foreground">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg">No Cities Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery ? "No city matches your search criteria." : "Start by adding a city to the system."}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateModal} className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Add City
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCities.map((city) => {
            const imgUrl = getFullImageUrl(city.image_url)
            return (
              <Card
                key={city.id}
                className="group overflow-hidden flex flex-col justify-between border border-border/80 hover:border-primary/50 transition-all duration-200 hover:shadow-lg"
              >
                <div>
                  {/* Image Cover */}
                  <div className="relative h-44 w-full bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={city.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-xs font-medium opacity-70">No cover image uploaded</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Active Status Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant={city.is_active ? "default" : "secondary"}
                        className={
                          city.is_active
                            ? "bg-emerald-500/90 text-white backdrop-blur border-none"
                            : "bg-black/60 text-slate-300 backdrop-blur border-none"
                        }
                      >
                        {city.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    {/* Title Banner */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="text-xl font-bold tracking-tight leading-tight drop-shadow">
                        {city.name}
                      </h3>
                      {city.name_mm && (
                        <p className="text-sm font-medium text-emerald-300 drop-shadow">
                          {city.name_mm}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {city.description || "No description provided."}
                    </p>
                  </CardContent>
                </div>

                {/* Footer Controls */}
                <CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-border/40 mt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={city.is_active}
                      onCheckedChange={() => handleToggleStatus(city)}
                      id={`switch-${city.id}`}
                    />
                    <Label htmlFor={`switch-${city.id}`} className="text-xs cursor-pointer text-muted-foreground">
                      {city.is_active ? "Active" : "Disabled"}
                    </Label>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditModal(city)}
                      title="Edit City"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingCity(city)}
                      title="Delete City"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit City Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingCity ? "Edit City" : "Add New City"}</DialogTitle>
              <DialogDescription>
                {editingCity
                  ? "Update city details, myanmar name, description, and cover image."
                  : "Create a new city or township for parking lot registration."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* City Name (English) */}
              <div className="space-y-1.5">
                <Label htmlFor="city-name" className="text-xs font-semibold">
                  City Name (English) *
                </Label>
                <Input
                  id="city-name"
                  placeholder="e.g. Hpa-an, Myawaddy"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              {/* City Name (Myanmar) */}
              <div className="space-y-1.5">
                <Label htmlFor="city-name-mm" className="text-xs font-semibold">
                  City Name (Myanmar / ကရင်ဘာသာ/မြန်မာ)
                </Label>
                <Input
                  id="city-name-mm"
                  placeholder="e.g. ဘားအံ"
                  value={formNameMm}
                  onChange={(e) => setFormNameMm(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="city-desc" className="text-xs font-semibold">
                  Description
                </Label>
                <Textarea
                  id="city-desc"
                  placeholder="Short description of the city or landmarks..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
                <div>
                  <p className="text-sm font-medium">Active Status</p>
                  <p className="text-xs text-muted-foreground">Allow parking lots to be registered in this city</p>
                </div>
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              </div>

              {/* Image Upload Field */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">City Cover Image</Label>

                {imagePreviewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border h-40 group">
                    <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Label
                        htmlFor="city-image-file"
                        className="cursor-pointer bg-white text-black px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 shadow"
                      >
                        <Upload className="w-3.5 h-3.5" /> Change
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreviewUrl(null)
                        }}
                        className="h-8 text-xs"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Label
                    htmlFor="city-image-file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-border"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground/60" />
                      <p className="text-xs font-medium">Click to upload city image</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">PNG, JPG or WEBP (max 5MB)</p>
                    </div>
                  </Label>
                )}
                <input
                  id="city-image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <LoadingSpinner /> : editingCity ? "Save Changes" : "Create City"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingCity} onOpenChange={(open) => !open && setDeletingCity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete City "{deletingCity?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this city? Parking lots registered under this city name will remain, but the city master entry will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <LoadingSpinner /> : "Delete City"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
