import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import ForgotPassword from "@/pages/ForgotPassword"
import VerifyEmail from "@/pages/VerifyEmail"
import Dashboard from "@/pages/Dashboard"
import Cars from "@/pages/Cars"
import Sessions from "@/pages/Sessions"
import Profile from "@/pages/Profile"
import ParkingDetail from "@/pages/ParkingDetail"
import Lot3DView from "@/pages/Lot3DView"
import Slot3DView from "@/pages/Slot3DView"
import WalletPaymentResult from "@/pages/WalletPaymentResult"
import { useAuthStore } from "@/store/authStore"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const isVerifying = useAuthStore((state) => state.isVerifying)
  // Require a token, a fully-verified user, and that we're not in verification flow
  const isFullyAuthenticated = accessToken && user && user.is_verified && !isVerifying
  return isFullyAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const isVerifying = useAuthStore((state) => state.isVerifying)
  // Redirect to dashboard only if user is fully authenticated and not in verification mode
  const isFullyAuthenticated = accessToken && user && user.is_verified && !isVerifying
  return isFullyAuthenticated ? <Navigate to="/dashboard" /> : <>{children}</>
}

function AuthOnlyRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  // Allow access if user has tokens but is not verified
  if (accessToken && user && !user.is_verified) {
    return <>{children}</>
  }
  return accessToken ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/verify-email" element={<AuthOnlyRoute><VerifyEmail /></AuthOnlyRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cars" element={<ProtectedRoute><Cars /></ProtectedRoute>} />
          <Route path="/vehicles" element={<Navigate to="/cars" replace />} />
          <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/parking/:id" element={<ProtectedRoute><ParkingDetail /></ProtectedRoute>} />
          <Route path="/parking/:id/3d" element={<ProtectedRoute><Lot3DView /></ProtectedRoute>} />
          <Route path="/slots/:id" element={<ProtectedRoute><Slot3DView /></ProtectedRoute>} />
          <Route path="/wallet-payment/result" element={<ProtectedRoute><WalletPaymentResult /></ProtectedRoute>} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
