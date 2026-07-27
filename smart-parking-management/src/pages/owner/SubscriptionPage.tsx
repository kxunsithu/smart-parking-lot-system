import { useState, useEffect } from "react"
import { Check, Crown, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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

  const handlePurchase = async (planId: number) => {
    try {
      setIsPurchasing(true)
      await subscriptionApi.purchaseSubscription(planId)
      toast.success("Subscription purchased successfully!")
      fetchData()
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsPurchasing(false)
    }
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
            You have an active {mySubscription.plan?.name} subscription valid until{" "}
            {new Date(mySubscription.end_date).toLocaleDateString()}
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <Card key={plan.id} className={hasActiveSubscription ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <Crown className="size-5 text-primary" />
              </CardTitle>
              <CardDescription>{plan.description || "Business license package"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">K{plan.price.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">{plan.duration_months} months</div>
              
              <div className="space-y-2 pt-4">
                <div className="flex items-center text-sm">
                  <Check className="mr-2 size-4 text-green-600" />
                  <span>Up to {plan.max_parking_lots} parking lots</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="mr-2 size-4 text-green-600" />
                  <span>Up to {plan.max_staff} staff members</span>
                </div>
                {plan.description && (
                  <div className="flex items-center text-sm">
                    <Check className="mr-2 size-4 text-green-600" />
                    <span>Premium features included</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={hasActiveSubscription || isPurchasing}
                onClick={() => handlePurchase(plan.id)}
              >
                {isPurchasing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : hasActiveSubscription ? (
                  "Already Subscribed"
                ) : (
                  "Purchase Plan"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

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
