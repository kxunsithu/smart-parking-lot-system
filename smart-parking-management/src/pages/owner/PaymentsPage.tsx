import { PageHeader } from "@/components/common/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/common/EmptyState"

export function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="View and manage customer payments." />
      <Card>
        <CardContent>
          <EmptyState
            title="Payments page under construction"
            description="Payment functionality has been restructured. Please check back later."
          />
        </CardContent>
      </Card>
    </div>
  )
}
