import { useSearchParams, useNavigate } from "react-router-dom"
import { CheckCircle2, XCircle } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function WalletPaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const status = searchParams.get("status")
  const reference = searchParams.get("reference")
  const success = status === "completed"

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 w-full py-16">
        <Card className={`max-w-md mx-auto ${success ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${
                success
                  ? "bg-green-500/15 border-green-500/30"
                  : "bg-red-500/15 border-red-500/30"
              }`}
            >
              {success ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold">
                {success ? "Payment Successful!" : "Payment Not Completed"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {success
                  ? "Your wallet payment was completed and your parking session is now ACTIVE."
                  : "The payment could not be completed. Please try again from your parking booking."}
              </p>
              {reference && (
                <p className="text-xs text-muted-foreground mt-2">
                  Reference: <span className="font-mono font-medium text-foreground">{reference}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => navigate("/sessions")}>
                View My Sessions
              </Button>
              {!success && (
                <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                  Back to Parking Lots
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
