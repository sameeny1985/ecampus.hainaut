import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import StudentDashboard from './pages/dashboards/StudentDashboard'
import StaffDashboard from './pages/dashboards/StaffDashboard'
import MainLayout from './components/layout/MainLayout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  return user ? children : <Navigate to="/login" replace />
}

function DashboardRouter() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (user.role === 'student') return <StudentDashboard />
  return <StaffDashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <MainLayout><DashboardRouter /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
