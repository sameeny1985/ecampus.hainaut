import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canCreateCourse = user && ['admin', 'moderator'].includes(user.role)

  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  const fetchUnreadCount = () => {
    api.get('/notifications/unread-count/')
      .then(res => setUnreadCount(res.data.unread_count || 0))
      .catch(() => {})
  }

  const fetchNotifications = () => {
    api.get('/notifications/')
      .then(res => setNotifications(res.data.results || res.data || []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleBellClick = () => {
    const nextState = !showDropdown
    setShowDropdown(nextState)
    if (nextState) {
      fetchNotifications()
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await api.post('/notifications/mark-read/', { id: notif.id }).catch(() => {})
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
    }
    setShowDropdown(false)
    navigate(notif.link || '/messages')
  }

  const markAllRead = async () => {
    await api.post('/notifications/mark-read/').catch(() => {})
    setUnreadCount(0)
    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
  }

  const handleLogout = () => {
    navigate('/', { replace: true })
    logout()
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gray-50">
      <header className="bg-white border-b w-full max-w-full">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 min-w-0">
            <Link to="/dashboard" className="text-lg sm:text-xl font-bold text-blue-600 shrink-0">CampusConnect</Link>
            <Link to="/messages" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 shrink-0">Email</Link>
            <Link to="/courses" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 shrink-0">Cours & Filières</Link>
            {canCreateCourse && (
              <Link to="/courses/create" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 shrink-0">
                Ajouter un cours
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 max-w-full">
            <div className="relative shrink-0">
              <button
                onClick={handleBellClick}
                className="relative p-1.5 text-gray-600 hover:text-blue-600 focus:outline-none"
                title="Notifications"
              >
                <span className="text-lg">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 mt-2 sm:w-80 bg-white rounded-xl shadow-lg border z-30 overflow-hidden">
                  <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                    <span className="font-semibold text-sm text-gray-700">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Aucune notification
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                        >
                          <div className="text-sm font-medium text-gray-800">{n.title}</div>
                          {n.message && <div className="text-xs text-gray-600 truncate mt-0.5">{n.message}</div>}
                          <div className="text-[11px] text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="hidden md:inline text-sm text-gray-600 truncate max-w-[160px]">{user?.first_name} {user?.last_name}</span>
            <button onClick={handleLogout} className="text-xs sm:text-sm text-red-600 hover:underline shrink-0 whitespace-nowrap">Déconnexion</button>
          </div>
        </div>
      </header>
      <main className="w-full max-w-full overflow-x-clip">{children}</main>
    </div>
  )
}
