import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600">
            CampusConnect
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
