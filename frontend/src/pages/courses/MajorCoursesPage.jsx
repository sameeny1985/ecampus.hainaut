import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMajors, getCourses, joinCourse } from '../../services/communityService'
import { useAuth } from '../../contexts/AuthContext'

const YEARS = [
  { value: 1, label: '1ère année' },
  { value: 2, label: '2ème année' },
  { value: 3, label: '3ème année' },
]

export default function MajorCoursesPage() {
  const { majorId } = useParams()
  const { user } = useAuth()
  const [major, setMajor] = useState(null)
  const [year, setYear] = useState(1)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    getMajors()
      .then(res => {
        const m = res.data.find(x => x.id === majorId)
        setMajor(m || null)
      })
      .catch(() => setMajor(null))
  }, [majorId])

  useEffect(() => {
    if (!majorId) return
    setLoading(true)
    getCourses({ major: majorId, year })
      .then(res => setCourses(res.data))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false))
  }, [majorId, year])

  const handleJoin = async (courseId) => {
    setJoining(courseId)
    setMessage(null)
    try {
      const res = await joinCourse(courseId)
      setMessage({ type: 'success', text: res.data.message })
      // refresh list to update is_member
      const refreshed = await getCourses({ major: majorId, year })
      setCourses(refreshed.data)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur lors de l\'inscription' })
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/courses" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          ← Toutes les filières
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {major?.name || 'Filière'}
        </h1>
        {major?.description && (
          <p className="mt-1 text-gray-600">{major.description}</p>
        )}
      </div>

      {/* Year tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200">
        {YEARS.map(y => (
          <button
            key={y.value}
            onClick={() => setYear(y.value)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              year === y.value
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {y.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl text-gray-500">
          Aucun cours disponible pour la {year}e année.
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map(course => (
            <div
              key={course.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {course.name}
                  </h3>
                  {course.course_code && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {course.course_code}
                    </span>
                  )}
                </div>
                {course.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{course.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>{course.members_count} inscrit(s)</span>
                  {course.my_status && (
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      course.my_status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                      course.my_status === 'failed' ? 'bg-red-100 text-red-700' :
                      course.my_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {course.my_status === 'passed' ? 'Validé' :
                       course.my_status === 'failed' ? 'Échoué' :
                       course.my_status === 'in_progress' ? 'En cours' : 'Inscrit'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/courses/${course.id}`}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Voir
                </Link>
                {course.is_member ? (
                  <span className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl">
                    Inscrit
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoin(course.id)}
                    disabled={joining === course.id}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {joining === course.id ? 'Inscription...' : "S'inscrire"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
