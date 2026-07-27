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

const ProfilePage = lazy(() => import("@/pages/shared/ProfilePage").then((m) => ({ default: m.ProfilePage })))
const NotFoundPage = lazy(() => import("@/pages/shared/NotFoundPage").then((m) => ({ default: m.NotFoundPage })))
const UnauthorizedPage = lazy(() =>
  import("@/pages/shared/UnauthorizedPage").then((m) => ({ default: m.UnauthorizedPage }))
)

const AdminDashboardPage = lazy(() =>
  import("@/pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage }))
)
const OwnersPage = lazy(() => import("@/pages/admin/OwnersPage").then((m) => ({ default: m.OwnersPage })))
const UsersPage = lazy(() => import("@/pages/admin/UsersPage").then((m) => ({ default: m.UsersPage })))
const SubscriptionPlansPage = lazy(() =>
  import("@/pages/admin/SubscriptionPlansPage").then((m) => ({ default: m.SubscriptionPlansPage }))
)

const OwnerDashboardPage = lazy(() =>
  import("@/pages/owner/OwnerDashboardPage").then((m) => ({ default: m.OwnerDashboardPage }))
)
const SubscriptionPage = lazy(() =>
  import("@/pages/owner/SubscriptionPage").then((m) => ({ default: m.SubscriptionPage }))
)
const LotsPage = lazy(() => import("@/pages/owner/LotsPage").then((m) => ({ default: m.LotsPage })))
const LotDetailPage = lazy(() => import("@/pages/owner/LotDetailPage").then((m) => ({ default: m.LotDetailPage })))
const OwnerStaffPage = lazy(() => import("@/pages/owner/StaffPage").then((m) => ({ default: m.StaffPage })))
const OwnerReservationsPage = lazy(() =>
  import("@/pages/owner/ReservationsPage").then((m) => ({ default: m.ReservationsPage }))
)
const OwnerSessionsPage = lazy(() =>
  import("@/pages/owner/SessionsPage").then((m) => ({ default: m.SessionsPage }))
)
const OwnerPaymentsPage = lazy(() =>
  import("@/pages/owner/PaymentsPage").then((m) => ({ default: m.PaymentsPage }))
)

const StaffDashboardPage = lazy(() =>
  import("@/pages/staff/StaffDashboardPage").then((m) => ({ default: m.StaffDashboardPage }))
)
const SlotsBoardPage = lazy(() => import("@/pages/staff/SlotsBoardPage").then((m) => ({ default: m.SlotsBoardPage })))
const StaffReservationsPage = lazy(() =>
  import("@/pages/staff/ReservationsPage").then((m) => ({ default: m.ReservationsPage }))
)
const StaffSessionsPage = lazy(() =>
  import("@/pages/staff/SessionsPage").then((m) => ({ default: m.SessionsPage }))
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

          {
            element: <ProtectedRoute allowedRoles={["ADMIN"]} />,
            children: [
              { path: "/admin", element: withSuspense(<AdminDashboardPage />) },
              { path: "/admin/owners", element: withSuspense(<OwnersPage />) },
              { path: "/admin/users", element: withSuspense(<UsersPage />) },
              { path: "/admin/subscription-plans", element: withSuspense(<SubscriptionPlansPage />) },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={["OWNER"]} />,
            children: [
              { path: "/owner", element: withSuspense(<OwnerDashboardPage />) },
              { path: "/owner/subscription", element: withSuspense(<SubscriptionPage />) },
              { path: "/owner/lots", element: withSuspense(<LotsPage />) },
              { path: "/owner/lots/:lotId", element: withSuspense(<LotDetailPage />) },
              { path: "/owner/staff", element: withSuspense(<OwnerStaffPage />) },
              { path: "/owner/reservations", element: withSuspense(<OwnerReservationsPage />) },
              { path: "/owner/sessions", element: withSuspense(<OwnerSessionsPage />) },
              { path: "/owner/payments", element: withSuspense(<OwnerPaymentsPage />) },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={["STAFF"]} />,
            children: [
              { path: "/staff", element: withSuspense(<StaffDashboardPage />) },
              { path: "/staff/slots", element: withSuspense(<SlotsBoardPage />) },
              { path: "/staff/reservations", element: withSuspense(<StaffReservationsPage />) },
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
