import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FormField } from "@/components/common/FormField"
import { subscriptionApi, type SubscriptionPlan, type SubscriptionPlanCreate, type SubscriptionPlanUpdate } from "@/api/subscription"
import { getErrorMessage } from "@/api/client"

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  duration_months: z.coerce.number().int().min(1, "Duration must be at least 1 month"),
  price: z.coerce.number().min(0, "Price must be positive"),
  max_parking_lots: z.coerce.number().int().min(1, "Max lots must be at least 1"),
  max_staff: z.coerce.number().int().min(1, "Max staff must be at least 1"),
  is_active: z.boolean().default(true),
})

type PlanFormValues = z.infer<typeof planSchema>

export function SubscriptionPlansPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const fetchPlans = async () => {
    try {
      const result = await subscriptionApi.getPlans(false)
      setPlans(result)
    } catch (error) {
      console.error("Failed to fetch plans:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(planSchema) })

  const handleCreate = async (data: PlanFormValues) => {
    try {
      setIsSaving(true)
      await subscriptionApi.createPlan(data as SubscriptionPlanCreate)
      toast.success("Subscription plan created successfully")
      setDialogOpen(false)
      reset()
      fetchPlans()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (id: number, data: PlanFormValues) => {
    try {
      setIsSaving(true)
      await subscriptionApi.updatePlan(id, data as SubscriptionPlanUpdate)
      toast.success("Subscription plan updated successfully")
      setDialogOpen(false)
      setEditingPlan(null)
      reset()
      fetchPlans()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this subscription plan?")) return
    try {
      await subscriptionApi.deletePlan(id)
      toast.success("Subscription plan deleted successfully")
      fetchPlans()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  function onSubmit(values: any) {
    if (editingPlan) {
      handleUpdate(editingPlan.id, values)
    } else {
      handleCreate(values)
    }
  }

  function handleEdit(plan: SubscriptionPlan) {
    setEditingPlan(plan)
    reset({
      name: plan.name,
      description: plan.description || "",
      duration_months: plan.duration_months,
      price: plan.price,
      max_parking_lots: plan.max_parking_lots,
      max_staff: plan.max_staff,
      is_active: plan.is_active,
    })
    setDialogOpen(true)
  }

  function handleDialogClose() {
    setDialogOpen(false)
    setEditingPlan(null)
    reset()
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage business license packages for parking owners</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => { setEditingPlan(null); setDialogOpen(true) }}>
            <Plus className="mr-2 size-4" />
            Create Plan
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="Plan Name" htmlFor="name" error={errors.name?.message} required>
                <Input id="name" placeholder="e.g., 1 Year License" {...register("name")} />
              </FormField>

              <FormField label="Description" htmlFor="description" error={errors.description?.message}>
                <Input id="description" placeholder="Plan description" {...register("description")} />
              </FormField>

              <FormField label="Duration (months)" htmlFor="duration_months" error={errors.duration_months?.message} required>
                <Input
                  id="duration_months"
                  type="number"
                  placeholder="12"
                  {...register("duration_months", { valueAsNumber: true })}
                />
              </FormField>

              <FormField label="Price" htmlFor="price" error={errors.price?.message} required>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  {...register("price", { valueAsNumber: true })}
                />
              </FormField>

              <FormField label="Max Parking Lots" htmlFor="max_parking_lots" error={errors.max_parking_lots?.message} required>
                <Input
                  id="max_parking_lots"
                  type="number"
                  placeholder="5"
                  {...register("max_parking_lots", { valueAsNumber: true })}
                />
              </FormField>

              <FormField label="Max Staff" htmlFor="max_staff" error={errors.max_staff?.message} required>
                <Input
                  id="max_staff"
                  type="number"
                  placeholder="10"
                  {...register("max_staff", { valueAsNumber: true })}
                />
              </FormField>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register("is_active")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingPlan ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <div key={plan.id} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{plan.duration_months} months</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium">K{plan.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Lots:</span>
                <span className="font-medium">{plan.max_parking_lots}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Staff:</span>
                <span className="font-medium">{plan.max_staff}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center">
              {plan.is_active ? (
                <span className="flex items-center text-sm text-green-600">
                  <Check className="mr-1 size-4" />
                  Active
                </span>
              ) : (
                <span className="flex items-center text-sm text-muted-foreground">
                  <X className="mr-1 size-4" />
                  Inactive
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
