import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getCourses, getMyEnrollments } from '../../services/communityService'
import api from '../../services/api'

const STATUS_LABELS = {
  enrolled: { label: 'Inscrit', cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
  passed: { label: 'Validé', cls: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Échoué', cls: 'bg-red-100 text-red-700' },
  dropped: { label: 'Abandonné', cls: 'bg-amber-100 text-amber-700' },
}

export default function StaffDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('courses') // 'courses' | 'teachers' | 'students'
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // مشاهده جزئیات دروس یک دانشجوی انتخاب‌شده
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentEnrollments, setStudentEnrollments] = useState([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const [coursesRes, teachersRes, studentsRes] = await Promise.allSettled([
        getCourses(),
        api.get('/accounts/users/', { params: { role: 'teacher' } }),
        api.get('/accounts/users/', { params: { role: 'student' } }),
      ])

      if (coursesRes.status === 'fulfilled') {
        const data = coursesRes.value.data
        setCourses(Array.isArray(data) ? data : data?.results || [])
      } else {
        setCourses([])
      }

      if (teachersRes.status === 'fulfilled' && Array.isArray(teachersRes.value.data)) {
        setTeachers(teachersRes.value.data)
      } else {
        try {
          const fallbackTeachers = await api.get('/communities/teachers/')
          setTeachers(Array.isArray(fallbackTeachers.data) ? fallbackTeachers.data : [])
        } catch {
          setTeachers([])
        }
      }

      if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value.data)) {
        setStudents(studentsRes.value.data)
      } else {
        setStudents([])
      }

      setLoading(false)
    }
    loadAll()
  }, [])

  const inspectStudent = async (student) => {
    setSelectedStudent(student)
    setLoadingEnrollments(true)
    try {
      const res = await getMyEnrollments(student.id)
      setStudentEnrollments(Array.isArray(res.data) ? res.data : res.data?.results || [])
    } catch {
      setStudentEnrollments([])
    } finally {
      setLoadingEnrollments(false)
    }
  }

  const q = search.trim().toLowerCase()
  const filteredCourses = courses.filter(c =>
    !q ||
    c.name?.toLowerCase().includes(q) ||
    c.course_code?.toLowerCase().includes(q) ||
    c.teacher_name?.toLowerCase().includes(q) ||
    c.major_name?.toLowerCase().includes(q)
  )
  const filteredTeachers = teachers.filter(t =>
    !q || t.full_name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)
  )
  const filteredStudents = students.filter(s =>
    !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  )

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 mb-2">
            {user?.role === 'admin' ? 'Espace Administrateur' : 'Espace Personnel Universitaire'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Bonjour, {user?.first_name} {user?.last_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Supervision globale des cours, des enseignants et du suivi pédagogique des étudiants.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/courses"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
          >
            Filières & Années
          </Link>
          <Link
            to="/courses/create"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + Ajouter un cours
          </Link>
        </div>
      </div>

      {/* کارت‌های آماری کل دانشگاه */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => { setActiveTab('courses'); setSelectedStudent(null) }}
          className={`text-left rounded-2xl p-5 border transition shadow-sm ${
            activeTab === 'courses' ? 'bg-indigo-50/60 border-indigo-200' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-500">Total des cours actifs</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">{courses.length}</div>
        </button>

        <button
          onClick={() => { setActiveTab('teachers'); setSelectedStudent(null) }}
          className={`text-left rounded-2xl p-5 border transition shadow-sm ${
            activeTab === 'teachers' ? 'bg-violet-50/60 border-violet-200' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-500">Total des enseignants</div>
          <div className="text-3xl font-bold text-violet-600 mt-1">{teachers.length}</div>
        </button>

        <button
          onClick={() => { setActiveTab('students'); setSelectedStudent(null) }}
          className={`text-left rounded-2xl p-5 border transition shadow-sm ${
            activeTab === 'students' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-sm text-gray-500">Total des étudiants</div>
          <div className="text-3xl font-bold text-emerald-600 mt-1">{students.length}</div>
        </button>
      </div>

      {/* نوار تب‌ها و جستجو */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('courses'); setSelectedStudent(null) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'courses' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📚 Cours ({courses.length})
            </button>
            <button
              onClick={() => { setActiveTab('teachers'); setSelectedStudent(null) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'teachers' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              👨‍🏫 Enseignants ({teachers.length})
            </button>
            <button
              onClick={() => { setActiveTab('students'); setSelectedStudent(null) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === 'students' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🎓 Étudiants ({students.length})
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, code, email..."
            className="w-full sm:w-72 px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Chargement des données...</div>
        ) : activeTab === 'courses' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Cours</th>
                  <th className="px-6 py-3 font-medium">Filière & Année</th>
                  <th className="px-6 py-3 font-medium">Enseignant</th>
                  <th className="px-6 py-3 font-medium">Étudiants</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-gray-400">Aucun cours trouvé.</td>
                  </tr>
                ) : filteredCourses.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      {c.course_code && <div className="text-xs font-mono text-gray-400">{c.course_code}</div>}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {c.major_name || '—'} {c.year_display ? `· ${c.year_display}` : ''}
                    </td>
                    <td className="px-6 py-3.5 text-gray-700 font-medium">
                      {c.teacher_name || <span className="text-gray-400 italic">Non assigné</span>}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                        {c.members_count} inscrit(s)
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        to={`/courses/${c.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'teachers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Enseignant</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Cours assignés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-10 text-center text-gray-400">Aucun enseignant trouvé.</td>
                  </tr>
                ) : filteredTeachers.map(t => {
                  const assigned = courses.filter(c => c.teacher_name === t.full_name)
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60">
                      <td className="px-6 py-3.5 font-semibold text-gray-900">{t.full_name}</td>
                      <td className="px-6 py-3.5 text-gray-500">{t.email}</td>
                      <td className="px-6 py-3.5">
                        {assigned.length === 0 ? (
                          <span className="text-xs text-gray-400">Aucun cours</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {assigned.map(ac => (
                              <Link
                                key={ac.id}
                                to={`/courses/${ac.id}`}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100"
                              >
                                {ac.name} ({ac.members_count})
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            {selectedStudent && (
              <div className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-indigo-600 uppercase">Dossier pédagogique</div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedStudent.full_name} <span className="text-sm font-normal text-gray-500">({selectedStudent.email})</span>
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    ✕ Fermer
                  </button>
                </div>

                {loadingEnrollments ? (
                  <div className="text-sm text-gray-500 py-4">Chargement des inscriptions...</div>
                ) : studentEnrollments.length === 0 ? (
                  <div className="text-sm text-gray-500 py-2">Cet étudiant n&apos;est inscrit à aucun cours.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {studentEnrollments.map(enr => {
                      const st = STATUS_LABELS[enr.status] || STATUS_LABELS.enrolled
                      return (
                        <div key={enr.id} className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-center justify-between gap-2">
                          <div>
                            <Link to={`/courses/${enr.community}`} className="font-semibold text-sm text-gray-900 hover:text-indigo-600">
                              {enr.community_name}
                            </Link>
                            <div className="text-xs text-gray-400">
                              {enr.major_name || ''} {enr.year ? `· ${enr.year}e année` : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                              {st.label}
                            </span>
                            <div className="text-xs font-bold text-gray-800 mt-1">
                              {enr.grade != null ? `${enr.grade}/20` : '—'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-4 py-3 font-medium">Étudiant</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium text-right">Suivi scolaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-10 text-center text-gray-400">Aucun étudiant trouvé.</td>
                    </tr>
                  ) : filteredStudents.map(st => (
                    <tr key={st.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3.5 font-semibold text-gray-900">{st.full_name}</td>
                      <td className="px-4 py-3.5 text-gray-500">{st.email}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => inspectStudent(st)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
                        >
                          Voir les cours & notes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
