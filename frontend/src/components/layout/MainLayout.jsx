import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import ProfileMenu from './ProfileMenu'

const ADMIN_LOGIN_URL = 'https://ecampus-hainaut.onrender.com/admin/login/?next=/admin/'

export default function MainLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canCreateCourse = user && ['admin', 'moderator'].includes(user.role)
  const canManageRequests = user && ['admin', 'moderator'].includes(user.role)
  const isModerator = user && user.role === 'moderator'

  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const menuRef = useRef(null)

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

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const handleBellClick = () => {
    const nextState = !showDropdown
    setShowDropdown(nextState)
    setMenuOpen(false)
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
    setMenuOpen(false)

    let targetLink = notif.link || '/messages'
    const textSample = `${notif.title || ''} ${notif.message || ''} ${targetLink}`.toLowerCase()
    if (
      targetLink.includes('/registration-requests') &&
      (textSample.includes('2e') ||
        textSample.includes('3e') ||
        textSample.includes('2eme') ||
        textSample.includes('3eme')) &&
      !targetLink.includes('tab=')
    ) {
      targetLink = `${targetLink}?tab=upper`
    }

    navigate(targetLink)
  }

  const markAllRead = async () => {
    await api.post('/notifications/mark-read/').catch(() => {})
    setUnreadCount(0)
    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
  }

  const handleLogout = () => {
    setMenuOpen(false)
    navigate('/', { replace: true })
    logout()
  }

  const handleAdminLoginClick = () => {
    setMenuOpen(false)
    window.open(ADMIN_LOGIN_URL, '_blank', 'noopener,noreferrer')
  }

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gray-50">
      <header className="bg-white border-b w-full max-w-full relative z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 min-w-0">
          {/* سمت چپ: منوی کشویی سه‌خط + لوگو */}
          <div className="relative flex items-center gap-2.5 sm:gap-4 min-w-0" ref={menuRef} dir="ltr">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(prev => !prev)
                setShowDropdown(false)
              }}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 flex items-center justify-center text-lg font-bold shrink-0 text-left"
            >
              {menuOpen ? '✕' : '☰'}
            </button>

            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="text-base sm:text-xl font-bold text-blue-600 shrink-0 whitespace-nowrap text-left"
            >
              CampusConnect
            </Link>

            {menuOpen && (
              <div
                role="menu"
                className="fixed left-3 right-3 top-16 sm:absolute sm:top-full sm:left-0 sm:right-auto mt-2 sm:w-64 bg-white rounded-xl shadow-lg border py-2 z-50 text-left max-h-[80vh] overflow-y-auto"
              >
                <Link
                  to="/dashboard"
                  role="menuitem"
                  onClick={closeMenu}
                  className="block w-full text-left px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Home
                </Link>
                <Link
                  to="/messages"
                  role="menuitem"
                  onClick={closeMenu}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                >
                  Email
                </Link>
                <Link
                  to="/courses"
                  role="menuitem"
                  onClick={closeMenu}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                >
                  Cours & Filières
                </Link>
                {canCreateCourse && (
                  <Link
                    to="/courses/create"
                    role="menuitem"
                    onClick={closeMenu}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                  >
                    Ajouter un cours
                  </Link>
                )}
                {canManageRequests && (
                  <>
                    <Link
                      to="/registration-requests?tab=first"
                      role="menuitem"
                      onClick={closeMenu}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      Demandes (1re année)
                    </Link>
                    <Link
                      to="/registration-requests?tab=upper"
                      role="menuitem"
                      onClick={closeMenu}
                      className="block w-full text-left px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Demandes (2e/3e année)
                    </Link>
                  </>
                )}
                {isModerator && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleAdminLoginClick}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 mt-1"
                  >
                    Connexion Admin
                  </button>
                )}
              </div>
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
