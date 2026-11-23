import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getCourse, getCourseMembers, joinCourse, gradeMember } from '../../services/communityService'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_OPTIONS = [
  { value: 'enrolled', label: 'Inscrit' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'passed', label: 'Validé / Réussi' },
  { value: 'failed', label: 'Échoué / Ajourné' },
]

const STATUS_BADGE = {
  enrolled: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  passed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  dropped: 'bg-amber-100 text-amber-700',
}

export default function CourseDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [editing, setEditing] = useState(null)
  const [gradeForm, setGradeForm] = useState({ status: 'in_progress', grade: '', grade_comment: '' })
  const [message, setMessage] = useState(null)

  const isStaff = user && ['teacher', 'admin', 'moderator'].includes(user.role)

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, mRes] = await Promise.all([
        getCourse(id),
        getCourseMembers(id),
      ])
      setCourse(cRes.data)
      const raw = mRes.data
      setMembers(Array.isArray(raw) ? raw : (raw?.results || []))
    } catch {
      setCourse(null)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const res = await joinCourse(id)
      setMessage({ type: 'success', text: res.data.message })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur' })
    } finally {
      setJoining(false)
    }
  }

  const startEdit = (m) => {
    setEditing(m.id)
    setGradeForm({
      status: m.status || 'in_progress',
      grade: m.grade ?? '',
      grade_comment: m.grade_comment || '',
    })
  }

  const saveGrade = async (memberUserId) => {
    try {
      const payload = {
        status: gradeForm.status,
        grade: gradeForm.grade === '' ? null : parseFloat(gradeForm.grade),
        grade_comment: gradeForm.grade_comment,
      }
      await gradeMember(id, memberUserId, payload)
      setEditing(null)
      setMessage({ type: 'success', text: 'Note mise à jour' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur de notation' })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-20 text-gray-500">
        Cours introuvable.
        <div className="mt-4">
          <Link to="/courses" className="text-indigo-600 font-medium">Retour aux filières</Link>
        </div>
      </div>
    )
  }

  const memberList = Array.isArray(members) ? members : []
  const students = memberList.filter(m => m.role === 'member')
  const teachers = memberList.filter(m => m.role === 'teacher' || m.role === 'animator')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to={course.major ? `/courses/major/${course.major}` : '/courses'}
        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
      >
        ← Retour
      </Link>

      <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
            {course.major_detail && (
              <span className="font-medium text-indigo-600">{course.major_detail.name}</span>
            )}
            {course.year_display && (
              <>
                <span>·</span>
                <span>{course.year_display}</span>
              </>
            )}
            {course.course_code && (
              <>
                <span>·</span>
                <span className="font-mono">{course.course_code}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{course.name}</h1>
          {course.description && (
            <p className="mt-3 text-gray-600 leading-relaxed">{course.description}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">{course.members_count ?? students.length} étudiant(s)</span>
            {course.is_member ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                Vous êtes inscrit
              </span>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {joining ? 'Inscription...' : 
