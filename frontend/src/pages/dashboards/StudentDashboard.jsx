import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getMyEnrollments } from '../../services/communityService'

const STATUS_BADGE = {
  enrolled: { label: 'Inscrit', cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
  passed: { label: 'Validé / Réussi', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Échoué / Ajourné', cls: 'bg-red-100 text-red-700' },
  dropped: { label: 'Abandonné', cls: 'bg-amber-100 text-amber-700' },
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getMyEnrollments()
        const list = Array.isArray(res.data) ? res.data : res.data?.results || []
        setEnrollments(list.filter(e => e.role === 'member'))
      } catch {
        setEnrollments([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const passedCount = enrollments.filter(e => e.status === 'passed').length
  const gradedList = enrollments.filter(e => e.grade != null)
  const averageGrade = gradedList.length > 0
    ? (gradedList.reduce((sum, e) => sum + parseFloat(e.grade), 0) / gradedList.length).toFixed(2)
    : null

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 mb-2">
            Espace Étudiant
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Bonjour, {user?.first_name} {user?.last_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivez vos inscriptions, vos résultats et accédez aux supports de vos cours.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/messages"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
          >
            ✉️ Messagerie
          </Link>
          <Link
            to="/courses"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Explorer les filières & cours
          </Link>
        </div>
      </div>

      {/* کارت‌های وضعیت تحصیلی دانشجو */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Cours inscrits</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">{enrollments.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Cours validés</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{passedCount}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Moyenne générale</div>
          <div className="text-3xl font-bold text-violet-600 mt-1">
            {averageGrade ? `${averageGrade}/20` : '—'}
          </div>
        </div>
      </div>

      {/* لیست دروس دانشجو */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Mes cours et notes ({enrollments.length})</h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Chargement de vos cours...</div>
        ) : enrollments.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-gray-600 text-sm mb-4">
              Vous n&apos;êtes inscrit à aucun cours pour le moment. Choisissez d&apos;abord votre filière puis votre année.
            </p>
            <Link
              to="/courses"
              className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Voir les filières et cours
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {enrollments.map(item => {
              const st = STATUS_BADGE[item.status] || STATUS_BADGE.enrolled
              return (
                <div
                  key={item.id}
                  className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50/70 transition"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
                      {item.major_name && (
                        <span className="font-semibold text-indigo-600">{item.major_name}</span>
                      )}
                      {item.year && <span>· {item.year}e année</span>}
                    </div>
                    <Link
                      to={`/courses/${item.community}`}
                      className="text-base font-bold text-gray-900 hover:text-indigo-600 transition"
                    >
                      {item.community_name}
                    </Link>
                    {item.grade_comment && (
                      <p className="text-xs text-gray-500 mt-1 italic">« {item.grade_comment} »</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                      {st.label}
                    </span>
                    <div className="text-sm font-bold text-gray-900 min-w-[60px] text-right">
                      {item.grade != null ? `${item.grade}/20` : '—'}
                    </div>
                    <Link
                      to={`/courses/${item.community}`}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
                    >
                      Supports & détails →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
