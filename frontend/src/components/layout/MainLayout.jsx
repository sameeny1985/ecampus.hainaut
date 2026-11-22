import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">CampusConnect</Link>
            <Link to="/messages" className="text-sm text-gray-600 hover:text-blue-600">Messages</Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.first_name} {user?.last_name}</span>
            <button onClick={logout} className="text-sm text-red-600 hover:underline">Déconnexion</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}