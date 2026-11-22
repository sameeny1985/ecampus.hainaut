import { useAuth } from '../../contexts/AuthContext'

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">CampusConnect</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.first_name} {user?.last_name}</span>
            <button onClick={logout} className="text-sm text-red-600">Déconnexion</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
