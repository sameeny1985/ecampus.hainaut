import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMajors } from '../../services/communityService'

const MAJOR_COLORS = {
  INFO: 'from-blue-500 to-indigo-600',
  DROIT: 'from-slate-600 to-slate-800',
  MKT: 'from-pink-500 to-rose-600',
  GEST: 'from-emerald-500 to-teal-600',
  ECO: 'from-amber-500 to-orange-600',
  COM: 'from-violet-500 to-purple-600',
  PSY: 'from-cyan-500 to-sky-600',
  LANG: 'from-fuchsia-500 to-pink-600',
}

export default function MajorsPage() {
  const [majors, setMajors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMajors()
      .then((res) => {
        const data = res.data
        setMajors(Array.isArray(data) ? data : (data?.results || []))
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Erreur de chargement')
        setMajors([])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 rounded-xl max-w-lg mx-auto mt-10">
        {error}
      </div>
    )
  }

  const list = Array.isArray(majors) ? majors : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Filières</h1>
        <p className="mt-2 text-gray-600">
          Choisissez votre filière pour découvrir les cours par année et vous y inscrire.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl">
          Aucune filière disponible. Vérifiez que seed_majors a été exécuté.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((major) => {
            const gradient = MAJOR_COLORS[major.code] || 'from-gray-500 to-gray-700'
            return (
              <Link
                key={major.id}
                to={`/courses/major/${major.id}`}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-300"
              >
                <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {major.code}
                      </span>
                      <h2 className="mt-1 text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {major.name}
                      </h2>
                    </div>
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
                      →
                    </span>
                  </div>
                  {major.description && (
                    <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                      {major.description}
                    </p>
                  )}
                  <div className="mt-4 text-sm text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-50 text-gray-600 font-medium">
                      {major.courses_count ?? 0} cours
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
