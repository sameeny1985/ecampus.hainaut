import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getCourses, getMyEnrollments } from '../../services/communityService'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard') // 'dashboard' | 'courses' | 'students'
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTeacherCourses = async () => {
      if (!user?.id) {
        setCourses([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [allCoursesRes, myEnrollmentsRes] = await Promise.all([
          getCourses(),
          getMyEnrollments(),
        ])

        const allCourses = Array.isArray(allCoursesRes.data)
          ? allCoursesRes.data
          : allCoursesRes.data?.results || []

        const myEnrollments = Array.isArray(myEnrollmentsRes.data)
          ? myEnrollmentsRes.data
          : myEnrollmentsRes.data?.results || []

        const assignedIds = new Set(
          myEnrollments
            .filter(item => ['teacher', 'animator'].includes(item.role))
            .map(item => String(item.community))
        )

        const currentUserId = String(user.id)

        const strictTeacherCourses = allCourses.filter(c => {
          const courseId = String(c.id)
          if (assignedIds.has(courseId)) return true
          if (c.created_by && String(c.created_by) === currentUserId) return true
          if (c.teacher_id && String(c.teacher_id) === currentUserId) return true
          if (c.teacher && String(c.teacher) === currentUserId) return true
          return false
        })

        setCourses(strictTeacherCourses)
      } catch {
        setCourses([])
      } finally {
        setLoading(false)
      }
    }

    loadTeacherCourses()
  }, [user])

  const totalStudents = courses.reduce((sum, c) => sum + (Number(c.members_count) || 0), 0)

  const q = search.trim().toLowerCase()
  const filteredCourses = courses.filter(c =>
    !q ||
    c.name?.toLowerCase().includes(q) ||
    c.course_code?.toLowerCase().includes(q) ||
    c.major_name?.toLowerCase().includes(q)
  )

  const sidebarItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
    { id: 'courses', label: 'Mes cours assignés', icon: '📘', badge: courses.length },
    { id: 'students', label: 'Étudiants & Notes', icon: '📝', badge: totalStudents },
  ]

  const quickCards = [
    {
      title: 'Mes Cours',
      subtitle: `${courses.length} cours assigné(s)`,
      icon: '📘',
      onClick: () => setActiveSection('courses'),
    },
    {
      title: 'Étudiants & Notes',
      subtitle: `${totalStudents} inscription(s) suivie(s)`,
      icon: '📝',
      onClick: () => setActiveSection('students'),
    },
    {
      title: 'Supports & Ressources',
      subtitle: 'PDF, liens & documents',
      icon: '📂',
      onClick: () => setActiveSection('courses'),
    },
    {
      title: 'Catalogue des Cours',
      subtitle: 'Consulter les filières',
      icon: '🏛️',
      to: '/courses',
    },
    {
      title: 'Messagerie',
      subtitle: 'Échanger avec les étudiants',
      icon: '✉️',
      to: '/messages',
    },
    {
      title: 'Notifications',
      subtitle: 'Inscriptions & désinscriptions',
      icon: '🔔',
      to: '/notifications',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* سایدبار سمت چپ */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Espace Enseignant
              </div>
              <div className="font-bold text-slate-900 mt-1">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>

            <nav className="py-2">
              {sidebarItems.map(item => {
                const active = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition border-l-4 ${
                      active
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 font-semibold'
                        : 'border-transparent text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge != null && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}

              <Link
                to="/courses"
                className="flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 border-l-4 border-transparent"
              >
                <span className="flex items-center gap-2.5">
                  <span>🗂️</span>
                  <span>Filières & Années</span>
                </span>
                <span className="text-xs text-slate-400">↗</span>
              </Link>

              <Link
                to="/messages"
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 border-l-4 border-transparent"
              >
                <span>💬</span>
                <span>Messagerie</span>
              </Link>

              <Link
                to="/profile"
                className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 border-l-4 border-transparent"
              >
                <span>👤</span>
                <span>Mon Profil</span>
              </Link>
            </nav>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-500">
              CAMPUSCONNECT · ENSEIGNANT
            </div>
          </div>
        </aside>

        {/* محتوای اصلی */}
        <main className="lg:col-span-9 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Tableau de bord — {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Gestion de vos cours assignés, supports pédagogiques et évaluations étudiantes.
              </p>
            </div>

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un cours ou code..."
              className="w-full sm:w-64 px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* شبکه کارت‌های میان‌بر */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {quickCards.map(card =>
              card.to ? (
                <Link
                  key={card.title}
                  to={card.to}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-indigo-300 hover:shadow transition flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-3">
                    {card.icon}
                  </div>
                  <div className="font-semibold text-slate-800">{card.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{card.subtitle}</div>
                </Link>
              ) : (
                <button
                  key={card.title}
                  type="button"
                  onClick={card.onClick}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-indigo-300 hover:shadow transition flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-3">
                    {card.icon}
                  </div>
                  <div className="font-semibold text-slate-800">{card.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{card.subtitle}</div>
                </button>
              )
            )}
          </div>

          {/* لیست دروس اختصاص‌داده‌شده و مدیریت دانشجویان/جزوه‌ها */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">
                {activeSection === 'students'
                  ? 'Gestion des Étudiants & Notes par Cours'
                  : 'Mes Cours Assignés & Ressources'}
              </h2>
              <span className="text-xs text-slate-500">
                {filteredCourses.length} cours
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Chargement de vos cours...
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Aucun cours ne vous est assigné pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCourses.map(course => (
                  <div
                    key={course.id}
                    className="py-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <Link
                        to={`/courses/${course.id}`}
                        className="font-semibold text-sky-700 hover:underline"
                      >
                        {course.name}
                      </Link>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {course.course_code ? `${course.course_code} · ` : ''}
                        {course.major_name || 'Filière'} {course.year_display ? `· ${course.year_display}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {course.members_count ?? 0} inscrit(s)
                      </span>
                      <Link
                        to={`/courses/${course.id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                      >
                        Gérer cours & notes
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
