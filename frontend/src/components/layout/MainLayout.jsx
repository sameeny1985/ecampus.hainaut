import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import ProfileMenu from './ProfileMenu'

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canCreateCourse = user && ['admin', 'moderator'].includes(user.role)
  const canManageRequests = user && ['admin', 'moderator'].includes(user.role)

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
      <header className="bg-white border-b w-full max-w-full relative">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-5 min-w-0 overflow-x-auto no-scrollbar">
            <Link to="/dashboard" className="text-base sm:text-xl font-bold text-blue-600 shrink-0 whitespace-nowrap">
              CampusConnect
            </Link>
            <Link to="/messages" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 shrink-0 whitespace-nowrap">
              Email
            </Link>
            <Link to="/courses" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 shrink-0 whitespace-nowrap">
              Cours & Filières
            </Link>
            {canCreateCourse && (
              <Link to="/courses/create" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 shrink-0 whitespace-nowrap">
                Ajouter un cours
              </Link>
            )}
            {canManageRequests && (
              <Link to="/registration-requests" className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 shrink-0 whitespace-nowrap">
                Demandes (1re année)
              </Link>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="relative shrink-0">
              <button
                type="button"
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
                <div className="fixed top-16 left-2 right-2 sm:absolute sm:top-full sm:left-auto sm:right-0 mt-2 w-auto sm:w-80 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-lg border z-50 overflow-hidden">
                  <div className="p-3 border-b flex justify-between items-center bg-gray-50 gap-2">
                    <span className="font-semibold text-sm text-gray-700">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                      >
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
                          <div className="text-sm font-medium text-gray-800 break-words">{n.title}</div>
                          {n.message && (
                            <div className="text-xs text-gray-600 line-clamp-2 mt-0.5 break-words">
                              {n.message}
                            </div>
                          )}
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

            <div className="shrink-0">
              <ProfileMenu />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs sm:text-sm text-red-600 hover:underline shrink-0 whitespace-nowrap"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="w-full max-w-full overflow-x-clip">{children}</main>
    </div>
  )
}
