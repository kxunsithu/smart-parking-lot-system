import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Car as CarIcon, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import Navbar from "@/components/layout/Navbar"
import { carsApi } from "@/api/cars"
import { useCarStore } from "@/store/carStore"
import type { CarOut } from "@/api/types"
import { toast } from "@/components/ui/toaster"

export default function Cars() {
  const { cars, setCars, addCar, removeCar } = useCarStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<CarOut | null>(null)

  useEffect(() => {
    loadCars()
  }, [])

  const loadCars = async () => {
    try {
      const response = await carsApi.list()
      setCars(response)
    } catch (error) {
      toast.error("Failed to load cars")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await carsApi.delete(deleteTarget.id)
      removeCar(deleteTarget.id)
      toast.success("Car deleted successfully")
    } catch (error) {
      toast.error("Failed to delete car")
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="space-y-4 w-full max-w-md px-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Cars</h1>
            <p className="text-muted-foreground">
              Manage your registered cars
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </Button>
        </div>

        {cars.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No cars registered</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Car
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <Card key={car.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{car.plate_number}</CardTitle>
                  </div>
                  <CardDescription className="capitalize">
                    {car.brand || "Standard Car"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {car.brand && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brand</span>
                        <span>{car.brand}</span>
                      </div>
                    )}
                    {car.color && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Color</span>
                        <span>{car.color}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDeleteTarget(car)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showAddForm && (
          <AddCarForm
            onClose={() => setShowAddForm(false)}
            onSuccess={(car) => {
              addCar(car)
              setShowAddForm(false)
              toast.success("Car added successfully")
            }}
          />
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="size-6 text-destructive" />
                <AlertDialogTitle>Delete Car</AlertDialogTitle>
              </div>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTarget?.plate_number}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

const carSchema = z.object({
  plate_number: z.string().min(1, "License plate is required"),
  brand: z.string().optional(),
  color: z.string().optional(),
})

type CarFormData = z.infer<typeof carSchema>

function AddCarForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: (car: CarOut) => void }) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      plate_number: "",
      brand: "",
      color: "",
    },
  })

  const onSubmit = async (data: CarFormData) => {
    setLoading(true)
    try {
      const response = await carsApi.create({
        plate_number: data.plate_number,
        brand: data.brand || null,
        color: data.color || null,
      })
      onSuccess(response)
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add car")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add New Car</CardTitle>
          <CardDescription>Register a new car to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">License Plate</label>
              <input
                type="text"
                className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                {...register("plate_number")}
              />
              {errors.plate_number && (
                <p className="text-sm text-destructive mt-1">{errors.plate_number.message}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Brand (Optional)</label>
              <input
                type="text"
                className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                {...register("brand")}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Color (Optional)</label>
              <input
                type="text"
                className="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                {...register("color")}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Adding..." : "Add Car"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
