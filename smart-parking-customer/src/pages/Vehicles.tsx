import { useEffect, useState } from "react"
import { Plus, Trash2, Edit, Car as CarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/layout/Navbar"
import { vehiclesApi } from "@/api/vehicles"
import { useVehicleStore } from "@/store/vehicleStore"
import type { VehicleOut } from "@/api/types"
import { toast } from "@/components/ui/toaster"

export default function Vehicles() {
  const { vehicles, setVehicles, addVehicle, removeVehicle } = useVehicleStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      const response = await vehiclesApi.list()
      setVehicles(response)
    } catch (error) {
      toast.error("Failed to load vehicles")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return
    
    try {
      await vehiclesApi.delete(id)
      removeVehicle(id)
      toast.success("Vehicle deleted successfully")
    } catch (error) {
      toast.error("Failed to delete vehicle")
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Vehicles</h1>
            <p className="text-muted-foreground">
              Manage your registered vehicles
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No vehicles registered</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Vehicle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{vehicle.plate_number}</CardTitle>
                  </div>
                  <CardDescription className="capitalize">
                    {vehicle.vehicle_type || "Unknown type"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {vehicle.brand && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brand</span>
                        <span>{vehicle.brand}</span>
                      </div>
                    )}
                    {vehicle.color && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Color</span>
                        <span>{vehicle.color}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDelete(vehicle.id)}
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
          <AddVehicleForm
            onClose={() => setShowAddForm(false)}
            onSuccess={(vehicle) => {
              addVehicle(vehicle)
              setShowAddForm(false)
              toast.success("Vehicle added successfully")
            }}
          />
        )}
      </div>
    </div>
  )
}

function AddVehicleForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: (vehicle: VehicleOut) => void }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    plate_number: "",
    vehicle_type: "car",
    brand: "",
    color: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await vehiclesApi.create(formData)
      onSuccess(response)
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add vehicle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Add New Vehicle</CardTitle>
          <CardDescription>Register a new vehicle to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">License Plate</label>
              <input
                type="text"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.plate_number}
                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Vehicle Type</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              >
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="truck">Truck</option>
                <option value="suv">SUV</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Brand (Optional)</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Color (Optional)</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Adding..." : "Add Vehicle"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
