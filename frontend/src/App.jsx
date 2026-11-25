import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import StudentDashboard from './pages/dashboards/StudentDashboard'
import TeacherDashboard from './pages/dashboards/TeacherDashboard'
import StaffDashboard from './pages/dashboards/StaffDashboard'
import MessagingPage from './pages/MessagingPage'
import MainLayout from './components/layout/MainLayout'
import MajorsPage from './pages/courses/MajorsPage'
import MajorCoursesPage from './pages/courses/MajorCoursesPage'
import CreateCoursePage from './pages/courses/CreateCoursePage'
import CourseDetailPage from './pages/courses/CourseDetailPage'

function PrivateRoute({ children }) {
  const { user, loading, isLoggingOut } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  if (!user) return <Navigate to={isLoggingOut ? '/' : '/login'} replace />
  return children
}

function DashboardRouter() {
  const { user, isLoggingOut } = useAuth()
  if (!user) return <Navigate to={isLoggingOut ? '/' : '/login'} replace />
  if (user.role === 'student') return <StudentDashboard />
  if (user.role === 'teacher') return <TeacherDashboard />
  return <StaffDashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/courses" element={
            <PrivateRoute>
              <MainLayout><MajorsPage /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/courses/major/:majorId" element={
            <PrivateRoute>
              <MainLayout><MajorCoursesPage /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/courses/create" element={
            <PrivateRoute>
              <MainLayout><CreateCoursePage /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/courses/:id" element={
            <PrivateRoute>
              <MainLayout><CourseDetailPage /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <MainLayout><DashboardRouter /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="/messages" element={
            <PrivateRoute>
              <MainLayout><MessagingPage /></MainLayout>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
