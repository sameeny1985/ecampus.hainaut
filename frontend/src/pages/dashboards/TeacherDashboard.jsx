import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getCourses } from '../../services/communityService'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [myCourses, setMyCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const allCoursesRes = await getCourses()
        const allCourses = Array.isArray(allCoursesRes.data)
          ? allCoursesRes.data
          : allCoursesRes.data?.results || []

        const filtered = allCourses.filter(
          c => c.my_role === 'teacher' || c.my_role === 'animator'
        )
        setMyCourses(filtered)
      } catch {
        setMyCourses([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalStudents = myCourses.reduce((acc, c) => acc + (c.members_count || 0), 0)

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
            Espace Enseignant
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Bonjour, {user?.first_name} {user?.last_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez vos cours assignés, publiez vos supports PDF et évaluez vos étudiants.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/courses"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
          >
            Toutes les filières
          </Link>
        </div>
      </div>

      {/* آمار خلاصه استاد */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Mes cours enseignés</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">{myCourses.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Total des étudiants inscrits dans mes cours</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{totalStudents}</div>
        </div>
      </div>

      {/* لیست دروس خود استاد */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Mes cours ({myCourses.length})</h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Chargement de vos cours...</div>
        ) : myCourses.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-gray-500 text-sm">
              Aucun cours ne vous est encore assigné par l&apos;administration.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {myCourses.map(course => (
              <div
                key={course.id}
                className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-gray-50/70 transition"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
                    {course.major_name && (
                      <span className="font-semibold text-indigo-600">{course.major_name}</span>
                    )}
                    {course.year_display && <span>· {course.year_display}</span>}
                    {course.course_code && <span className="font-mono">· {course.course_code}</span>}
                  </div>
                  <Link
                    to={`/courses/${course.id}`}
                    className="text-base font-bold text-gray-900 hover:text-indigo-600 transition"
                  >
                    {course.name}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1">
                    👥 {course.members_count} étudiant(s) inscrit(s)
                  </div>
                </div>

                <Link
                  to={`/courses/${course.id}`}
                  className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
                >
                  Gérer le cours, supports & notes →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
