import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getMyEnrollments } from '../../services/communityService'

const STATUS_LABELS = {
  enrolled: { label: 'Inscrit', cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
  passed: { label: 'Validé', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Échoué', cls: 'bg-red-100 text-red-700' },
  dropped: { label: 'Abandonné', cls: 'bg-amber-100 text-amber-700' },
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard') // 'dashboard' | 'courses' | 'results'
  const [enrollments, setEnrollments] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEnrollments = async () => {
      setLoading(true)
      try {
        const res = await getMyEnrollments()
        const data = res.data
        setEnrollments(Array.isArray(data) ? data : data?.results || [])
      } catch {
        setEnrollments([])
      } finally {
        setLoading(false)
      }
    }
    loadEnrollments()
  }, [])

  const q = search.trim().toLowerCase()
  const filteredEnrollments = enrollments.filter(enr =>
    !q ||
    enr.community_name?.toLowerCase().includes(q) ||
    enr.major_name?.toLowerCase().includes(q)
  )

  const gradedEnrollments = filteredEnrollments.filter(enr => enr.grade != null)

  const sidebarItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
    { id: 'courses', label: 'Mes cours', icon: '🎓', badge: enrollments.length },
    { id: 'results', label: 'Résultats', icon: '📊', badge: gradedEnrollments.length },
  ]

  const quickCards = [
    {
      title: 'Mes Cours',
      subtitle: `${enrollments.length} cours inscrit(s)`,
      icon: '🎓',
      onClick: () => setActiveSection('courses'),
    },
    {
      title: 'Mes Résultats',
      subtitle: `${gradedEnrollments.length} note(s) publiée(s)`,
      icon: '📊',
      onClick: () => setActiveSection('results'),
    },
    {
      title: 'Catalogue des Cours',
      subtitle: 'Parcourir & s’inscrire',
      icon: '📚',
      to: '/courses',
    },
    {
      title: 'Mon e-mail / Messages',
      subtitle: 'Messagerie interne',
      icon: '✉️',
      to: '/messages',
    },
    {
      title: 'Notifications',
      subtitle: 'Alertes cours & notes',
      icon: '🔔',
      to: '/notifications',
    },
    {
      title: 'Mon Profil',
      subtitle: 'Informations & confidentialité',
      icon: '👤',
      to: '/profile',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* سایدبار سمت چپ */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Espace Étudiant
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
                        ? 'border-rose-600 bg-rose-50/60 text-rose-700 font-semibold'
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
              CAMPUSCONNECT · ÉTUDIANT
            </div>
          </div>
        </aside>

        {/* محتوای اصلی */}
        <main className="lg:col-span-9 space-y-6">
          {/* هدر و فیلتر سریع */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Tableau de bord — {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Accès rapide à vos cours, ressources pédagogiques et résultats.
              </p>
            </div>

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer mes cours ou filières..."
              className="w-full sm:w-64 px-3.5 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* شبکه کارت‌های میان‌بر */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {quickCards.map(card =>
              card.to ? (
                <Link
                  key={card.title}
                  to={card.to}
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-rose-300 hover:shadow transition flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mb-3">
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
                  className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-rose-300 hover:shadow transition flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mb-3">
                    {card.icon}
                  </div>
                  <div className="font-semibold text-slate-800">{card.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{card.subtitle}</div>
                </button>
              )
            )}
          </div>

          {/* بخش جزئیات دروس یا نتایج */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">
              Chargement de vos cours et résultats...
            </div>
          ) : activeSection === 'results' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Mes Résultats & Évaluations</h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('dashboard')}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Vue d&apos;ensemble
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="px-5 py-3 font-medium">Cours</th>
                      <th className="px-5 py-3 font-medium">Filière / Année</th>
                      <th className="px-5 py-3 font-medium">Statut</th>
                      <th className="px-5 py-3 font-medium text-right">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400">
                          Aucun résultat disponible.
                        </td>
                      </tr>
                    ) : (
                      filteredEnrollments.map(enr => {
                        const st = STATUS_LABELS[enr.status] || STATUS_LABELS.enrolled
                        return (
                          <tr key={enr.id} className="hover:bg-slate-50/60">
                            <td className="px-5 py-3.5 font-semibold text-slate-900">
                              <Link to={`/courses/${enr.community}`} className="hover:text-rose-600">
                                {enr.community_name}
                              </Link>
                            </td>
                            <td className="px-5 py-3.5 text-slate-500">
                              {enr.major_name || '—'} {enr.year ? `· ${enr.year}e année` : ''}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                                {st.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                              {enr.grade != null ? `${enr.grade}/20` : '—'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900">
                  {activeSection === 'courses' ? 'Mes Cours Inscrits' : 'Dernières publications & Cours récents'}
                </h2>
                <Link to="/courses" className="text-xs font-semibold text-rose-600 hover:underline">
                  Voir tous les cours →
                </Link>
              </div>

              {filteredEnrollments.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  Vous n&apos;êtes inscrit à aucun cours pour le moment.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEnrollments.map(enr => {
                    const st = STATUS_LABELS[enr.status] || STATUS_LABELS.enrolled
                    return (
                      <div
                        key={enr.id}
                        className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <Link
                            to={`/courses/${enr.community}`}
                            className="font-semibold text-sky-700 hover:underline"
                          >
                            {enr.community_name}
                          </Link>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {enr.major_name || 'Filière'} {enr.year ? `· ${enr.year}e année` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                            {st.label}
                          </span>
                          <span className="text-sm font-bold text-slate-800">
                            {enr.grade != null ? `${enr.grade}/20` : '—'}
                          </span>
                          <Link
                            to={`/courses/${enr.community}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                          >
                            Ouvrir
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
