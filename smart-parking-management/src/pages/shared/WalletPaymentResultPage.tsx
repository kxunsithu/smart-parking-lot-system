import { useSearchParams, useNavigate } from "react-router-dom"
import { CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function WalletPaymentResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const status = searchParams.get("status")
  const reference = searchParams.get("reference")
  const success = status === "completed"

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <Card className={success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
              success ? "bg-green-500/15 border-green-500/30" : "bg-red-500/15 border-red-500/30"
            }`}
          >
            {success ? (
              <CheckCircle2 className="size-8 text-green-500" />
            ) : (
              <XCircle className="size-8 text-red-500" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold">
              {success ? "Payment Successful!" : "Payment Not Completed"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {success
                ? "Your wallet payment was completed and your subscription is now active."
                : "The payment could not be completed. Please try again from your subscription page."}
            </p>
            {reference && (
              <p className="text-xs text-muted-foreground mt-2">
                Reference: <span className="font-mono font-medium text-foreground">{reference}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => navigate("/owner/subscription")}>
              Back to Subscription
            </Button>
            {!success && (
              <Button variant="outline" className="w-full" onClick={() => navigate("/owner")}>
                Go to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
