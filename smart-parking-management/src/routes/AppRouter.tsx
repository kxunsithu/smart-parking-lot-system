import { Suspense, lazy } from "react"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { LoadingSpinner } from "@/components/common/LoadingBlock"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { ProtectedRoute, PublicOnlyRoute, AuthOnlyRoute } from "@/routes/ProtectedRoute"

const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
)
const VerifyEmailPage = lazy(() =>
  import("@/pages/auth/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage }))
)
const RegisterOwnerPage = lazy(() =>
  import("@/pages/auth/RegisterOwnerPage").then((m) => ({ default: m.RegisterOwnerPage }))
)

const ProfilePage = lazy(() => import("@/pages/shared/ProfilePage").then((m) => ({ default: m.ProfilePage })))
const MapViewPage = lazy(() => import("@/pages/shared/MapViewPage").then((m) => ({ default: m.MapViewPage })))
const Lot3DViewPage = lazy(() => import("@/pages/shared/Lot3DViewPage").then((m) => ({ default: m.Lot3DViewPage })))
const SlotDetailPage = lazy(() => import("@/pages/shared/SlotDetailPage").then((m) => ({ default: m.SlotDetailPage })))
const NotFoundPage = lazy(() => import("@/pages/shared/NotFoundPage").then((m) => ({ default: m.NotFoundPage })))
const UnauthorizedPage = lazy(() =>
  import("@/pages/shared/UnauthorizedPage").then((m) => ({ default: m.UnauthorizedPage }))
)

const AdminDashboardPage = lazy(() =>
  import("@/pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage }))
)
const ParkingLotsPage = lazy(() =>
  import("@/pages/admin/ParkingLotsPage").then((m) => ({ default: m.ParkingLotsPage }))
)
const AdminLotDetailPage = lazy(() =>
  import("@/pages/admin/LotDetailPage").then((m) => ({ default: m.LotDetailPage }))
)
const OwnersPage = lazy(() => import("@/pages/admin/OwnersPage").then((m) => ({ default: m.OwnersPage })))
const CustomersPage = lazy(() => import("@/pages/admin/CustomersPage").then((m) => ({ default: m.CustomersPage })))
const AdminPackagesPage = lazy(() =>
  import("@/pages/admin/PackagesPage").then((m) => ({ default: m.AdminPackagesPage }))
)
const AdminSubscriptionsPage = lazy(() =>
  import("@/pages/admin/SubscriptionsPage").then((m) => ({ default: m.AdminSubscriptionsPage }))
)

const OwnerDashboardPage = lazy(() =>
  import("@/pages/owner/OwnerDashboardPage").then((m) => ({ default: m.OwnerDashboardPage }))
)
const LotsPage = lazy(() => import("@/pages/owner/LotsPage").then((m) => ({ default: m.LotsPage })))
const LotDetailPage = lazy(() => import("@/pages/owner/LotDetailPage").then((m) => ({ default: m.LotDetailPage })))
const OwnerStaffPage = lazy(() => import("@/pages/owner/StaffPage").then((m) => ({ default: m.StaffPage })))
const OwnerSessionsPage = lazy(() =>
  import("@/pages/owner/SessionsPage").then((m) => ({ default: m.OwnerSessionsPage }))
)
const OwnerPaymentsPage = lazy(() =>
  import("@/pages/owner/PaymentsPage").then((m) => ({ default: m.PaymentsPage }))
)
const OwnerSubscriptionPage = lazy(() =>
  import("@/pages/owner/SubscriptionPage").then((m) => ({ default: m.OwnerSubscriptionPage }))
)

const StaffDashboardPage = lazy(() =>
  import("@/pages/staff/StaffDashboardPage").then((m) => ({ default: m.StaffDashboardPage }))
)
const SlotsBoardPage = lazy(() => import("@/pages/staff/SlotsBoardPage").then((m) => ({ default: m.SlotsBoardPage })))
const StaffSessionsPage = lazy(() =>
  import("@/pages/staff/SessionsPage").then((m) => ({ default: m.StaffSessionsPage }))
)


function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<LoadingSpinner />}>{element}</Suspense>
}

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: withSuspense(<LoginPage />) },
          { path: "/forgot-password", element: withSuspense(<ForgotPasswordPage />) },
          { path: "/register-owner", element: withSuspense(<RegisterOwnerPage />) },
        ],
      },
    ],
  },
  {
    element: <AuthOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/verify-email", element: withSuspense(<VerifyEmailPage />) },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/profile", element: withSuspense(<ProfilePage />) },
          { path: "/map/:lotId", element: withSuspense(<MapViewPage />) },
          { path: "/3d/:lotId", element: withSuspense(<Lot3DViewPage />) },
          { path: "/slots/:slotId", element: withSuspense(<SlotDetailPage />) },

          {
            element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
            children: [
              { path: "/admin", element: withSuspense(<AdminDashboardPage />) },
              { path: "/admin/lots", element: withSuspense(<ParkingLotsPage />) },
              { path: "/admin/lots/:lotId", element: withSuspense(<AdminLotDetailPage />) },
              { path: "/admin/slots/:slotId", element: withSuspense(<SlotDetailPage />) },
              { path: "/admin/owners", element: withSuspense(<OwnersPage />) },
              { path: "/admin/users", element: withSuspense(<CustomersPage />) },
              { path: "/admin/packages", element: withSuspense(<AdminPackagesPage />) },
              { path: "/admin/subscriptions", element: withSuspense(<AdminSubscriptionsPage />) },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={["OWNER"]} />,
            children: [
              { path: "/owner", element: withSuspense(<OwnerDashboardPage />) },
              { path: "/owner/subscription", element: withSuspense(<OwnerSubscriptionPage />) },
              { path: "/owner/lots", element: withSuspense(<LotsPage />) },
              { path: "/owner/lots/:lotId", element: withSuspense(<LotDetailPage />) },
              { path: "/owner/slots/:slotId", element: withSuspense(<SlotDetailPage />) },
              { path: "/owner/staff", element: withSuspense(<OwnerStaffPage />) },
              { path: "/owner/sessions", element: withSuspense(<OwnerSessionsPage />) },
              { path: "/owner/payments", element: withSuspense(<OwnerPaymentsPage />) },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={["STAFF"]} />,
            children: [
              { path: "/staff", element: withSuspense(<StaffDashboardPage />) },
              { path: "/staff/slots", element: withSuspense(<SlotsBoardPage />) },
              { path: "/staff/sessions", element: withSuspense(<StaffSessionsPage />) },
            ],
          },
        ],
      },
    ],
  },
  { path: "/unauthorized", element: withSuspense(<UnauthorizedPage />) },
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "*", element: withSuspense(<NotFoundPage />) },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
