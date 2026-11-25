import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getCourse,
  getCourseMembers,
  joinCourse,
  leaveCourse,
  gradeMember,
  deleteCourse,
  uploadResource,
  deleteResource
} from '../../services/communityService'
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
  const navigate = useNavigate()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deletingCourse, setDeletingCourse] = useState(false)
  const [editing, setEditing] = useState(null) // membership id
  const [gradeForm, setGradeForm] = useState({ status: 'in_progress', grade: '', grade_comment: '' })
  const [message, setMessage] = useState(null)

  // State برای آپلود جزوه و منابع درسی
  const [resTitle, setResTitle] = useState('')
  const [resFile, setResFile] = useState(null)
  const [resLink, setResLink] = useState('')
  const [uploadingRes, setUploadingRes] = useState(false)
  const resFileInputRef = useRef(null)

  const isStaff = user && ['teacher', 'admin', 'moderator'].includes(user.role)

  const extractList = (data) => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.results)) return data.results
    return []
  }

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, mRes] = await Promise.all([
        getCourse(id),
        getCourseMembers(id),
      ])
      setCourse(cRes.data)
      setMembers(extractList(mRes.data))
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

  const handleLeave = async () => {
    if (!window.confirm(`Voulez-vous vraiment vous désinscrire du cours « ${course.name} » ?`)) return
    setLeaving(true)
    try {
      const res = await leaveCourse(id)
      setMessage({ type: 'success', text: res.data.message })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la désinscription' })
    } finally {
      setLeaving(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le cours « ${course.name} » ?`)) return
    setDeletingCourse(true)
    try {
      await deleteCourse(id)
      navigate(course.major ? `/courses/major/${course.major}` : '/courses')
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la suppression du cours' })
      setDeletingCourse(false)
    }
  }

  const handleUploadResource = async (e) => {
    e.preventDefault()
    if (!resTitle.trim() || (!resFile && !resLink.trim())) return
    setUploadingRes(true)
    try {
      const formData = new FormData()
      formData.append('title', resTitle.trim())
      if (resFile) formData.append('file', resFile)
      if (resLink.trim()) formData.append('link', resLink.trim())

      await uploadResource(id, formData)
      setResTitle('')
      setResFile(null)
      setResLink('')
      if (resFileInputRef.current) resFileInputRef.current.value = ''
      setMessage({ type: 'success', text: 'Ressource ajoutée et étudiants notifiés.' })
      await load()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Erreur lors de l\'ajout de la ressource'
      })
    } finally {
      setUploadingRes(false)
    }
  }

  const handleDeleteResource = async (resourceId, title) => {
    if (!window.confirm(`Supprimer le document « ${title} » ?`)) return
    try {
      await deleteResource(id, resourceId)
      setMessage({ type: 'success', text: 'Document supprimé.' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la suppression' })
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

  const safeMembers = Array.isArray(members) ? members : []
  const students = safeMembers.filter(m => m.role === 'member')
  const teachers = safeMembers.filter(m => m.role === 'teacher' || m.role === 'animator')
  const resources = Array.isArray(course.resources) ? course.resources : []

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
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 mb-2">
            <div className="flex flex-wrap items-center gap-2">
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
            {isStaff && (
              <button
                onClick={handleDeleteCourse}
                disabled={deletingCourse}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50 transition"
              >
                {deletingCourse ? 'Suppression...' : '🗑️ Supprimer le cours'}
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{course.name}</h1>
          {course.teacher_name && (
            <p className="mt-2 text-sm font-medium text-indigo-600">
              👨‍🏫 Enseignant : {course.teacher_name}
            </p>
          )}
          {course.description && (
            <p className="mt-3 text-gray-600 leading-relaxed">{course.description}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">{course.members_count} étudiant(s)</span>
            {isStaff || course.my_role === 'teacher' || course.my_role === 'animator' ? (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700">
                {course.my_role === 'teacher'
                  ? '👨‍🏫 Vous êtes l\'enseignant de ce cours'
                  : '🛡️ Espace gestion / personnel'}
              </span>
            ) : course.is_member ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                  Vous êtes inscrit · {course.my_status === 'passed' ? 'Validé' : course.my_status === 'failed' ? 'Échoué' : course.my_status === 'in_progress' ? 'En cours' : 'Inscrit'}
                </span>
                {course.my_role === 'member' && (
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="px-4 py-1.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition"
                  >
                    {leaving ? 'Désinscription...' : 'Se désinscrire du cours'}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {joining ? 'Inscription...' : "S'inscrire au cours"}
              </button>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Teachers */}
      {teachers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Enseignants</h2>
          <div className="flex flex-wrap gap-3">
            {teachers.map(t => (
              <div key={t.id} className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-sm">
                <span className="font-medium">{t.user_detail?.full_name || t.user_detail?.email}</span>
                <span className="ml-2 text-gray-400">{t.role === 'teacher' ? 'Enseignant' : 'Animateur'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supports de cours & Documents */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          📚 Supports de cours & Documents ({resources.length})
        </h2>

        {isStaff && (
          <form onSubmit={handleUploadResource} className="mb-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <div className="text-sm font-semibold text-gray-800">Ajouter un document ou un lien</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={resTitle}
                onChange={e => setResTitle(e.target.value)}
                placeholder="Titre du document (ex: Chapitre 1 - Introduction)"
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="url"
                value={resLink}
                onChange={e => setResLink(e.target.value)}
                placeholder="Lien externe optionnel (https://...)"
                disabled={Boolean(resFile)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  ref={resFileInputRef}
                  type="file"
                  onChange={e => setResFile(e.target.files[0] || null)}
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {resFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setResFile(null)
                      if (resFileInputRef.current) resFileInputRef.current.value = ''
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    ✕ Retirer
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={uploadingRes || !resTitle.trim() || (!resFile && !resLink.trim())}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {uploadingRes ? 'Téléversement...' : '📤 Publier le support'}
              </button>
            </div>
          </form>
        )}

        {resources.length === 0 ? (
          <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-2xl text-sm">
            Aucun support de cours disponible pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resources.map(res => {
              const targetUrl = res.link || res.file
              return (
                <div
                  key={res.id}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3 hover:border-indigo-100 transition"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate" title={res.title}>
                      📄 {res.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Par {res.uploaded_by_name || 'Enseignant'} · {new Date(res.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {targetUrl && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
                      >
                        📥 Ouvrir
                      </a>
                    )}
                    {isStaff && (
                      <button
                        onClick={() => handleDeleteResource(res.id, res.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Supprimer ce support"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Students list (staff + own view) */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Étudiants ({students.length})
        </h2>

        {students.length === 0 ? (
          <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-2xl">
            Aucun étudiant inscrit pour le moment.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">Étudiant</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  {isStaff && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(m => (
                  <tr key={m.id} className={`hover:bg-gray-50/50 ${!m.is_active ? 'opacity-75 bg-amber-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {m.user_detail?.full_name || m.user_detail?.email}
                      </div>
                      <div className="text-xs text-gray-400">{m.user_detail?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {editing === m.id ? (
                        <select
                          value={gradeForm.status}
                          onChange={e => setGradeForm(f => ({ ...f, status: e.target.value }))}
                          className="px-2 py-1 rounded-lg border border-gray-200 text-sm"
                        >
                          {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[m.status] || STATUS_BADGE.enrolled}`}>
                          {m.status_display || (m.status === 'dropped' ? 'Abandonné' : m.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editing === m.id ? (
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          value={gradeForm.grade}
                          onChange={e => setGradeForm(f => ({ ...f, grade: e.target.value }))}
                          placeholder="/20"
                          className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-sm"
                        />
                      ) : (
                        <span className="font-medium">
                          {m.grade != null ? `${m.grade}/20` : '—'}
                        </span>
                      )}
                    </td>
                    {isStaff && (
                      <td className="px-4 py-3 text-right">
                        {!m.is_active && m.status === 'dropped' ? (
                          <span className="text-xs text-amber-700 italic">Désinscrit</span>
                        ) : editing === m.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveGrade(m.user)}
                              className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(m)}
                            className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Noter
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
