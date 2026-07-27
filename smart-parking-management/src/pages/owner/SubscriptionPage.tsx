import { useState, useEffect } from "react"
import { Check, Crown, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { subscriptionApi, type SubscriptionPlan, type Subscription } from "@/api/subscription"
import { getErrorMessage } from "@/api/client"
import { useNavigate } from "react-router-dom"

export function SubscriptionPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null)
  const [mySubscription, setMySubscription] = useState<Subscription | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<{ has_subscription: boolean; status: string; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [totalSlots, setTotalSlots] = useState<number>(1)

  const fetchData = async () => {
    try {
      const [plansData, subData, statusData] = await Promise.all([
        subscriptionApi.getPlans(true),
        subscriptionApi.getMySubscription(),
        subscriptionApi.getMySubscriptionStatus(),
      ])
      setPlans(plansData)
      setMySubscription(subData)
      setSubscriptionStatus(statusData)
    } catch (error) {
      console.error("Failed to fetch subscription data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const calculateTotalPrice = (plan: SubscriptionPlan, slots: number) => {
    return plan.per_slot_price * slots
  }

  const handlePurchase = async () => {
    if (!selectedPlan) return
    try {
      setIsPurchasing(true)
      await subscriptionApi.purchaseSubscription({
        plan_id: selectedPlan.id,
        total_slots: totalSlots,
      })
      toast.success("Subscription purchased successfully!")
      setSelectedPlan(null)
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan)
    setTotalSlots(1)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  const hasActiveSubscription = subscriptionStatus?.has_subscription

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Business License Subscription</h1>
        <p className="text-muted-foreground">Purchase a subscription to manage your parking lots</p>
      </div>

      {hasActiveSubscription && mySubscription ? (
        <Alert>
          <Crown className="size-4" />
          <AlertTitle>Active Subscription</AlertTitle>
          <AlertDescription>
            You have an active {mySubscription.plan?.name} subscription with {mySubscription.total_slots} slots.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>No Active Subscription</AlertTitle>
          <AlertDescription>
            You need an active subscription to manage parking lots. Please purchase a plan below.
          </AlertDescription>
        </Alert>
      )}

      {selectedPlan ? (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Configure Your Subscription</CardTitle>
            <CardDescription>
              {selectedPlan.name} - Per Slot: K{selectedPlan.per_slot_price.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Number of Slots</label>
              <Input
                type="number"
                min="1"
                value={totalSlots}
                onChange={(e) => setTotalSlots(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div className="text-2xl font-bold">
              Total: K{calculateTotalPrice(selectedPlan, totalSlots).toFixed(2)}
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedPlan(null)}>
              Back
            </Button>
            <Button onClick={handlePurchase} disabled={isPurchasing}>
              {isPurchasing ? <Loader2 className="mr-2 size-4 animate-spin" /> : "Confirm Purchase"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  <Crown className="size-5 text-primary" />
                </CardTitle>
                <CardDescription>{plan.description || "Business license package"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Per Slot:</span>
                    <span className="font-medium">K{plan.per_slot_price.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="space-y-2 pt-4">
                  <div className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-green-600" />
                    <span>Flexible slot count (1+ slots)</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-green-600" />
                    <span>Renewable subscription</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSelectPlan(plan)}
                >
                  Select Plan
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {hasActiveSubscription && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => navigate("/owner")}>
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  )
}
