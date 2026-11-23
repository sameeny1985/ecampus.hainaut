import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getCourse,
  getCourseMembers,
  joinCourse,
  leaveCourse,
  deleteCourse,
  gradeMember,
  uploadResource,
  getResources,
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [members, setMembers] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(null)
  const [gradeForm, setGradeForm] = useState({ status: 'in_progress', grade: '', grade_comment: '' })
  const [message, setMessage] = useState(null)
  const [pdfTitle, setPdfTitle] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const isStaff = user && ['teacher', 'admin', 'moderator'].includes(user.role)

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, mRes, rRes] = await Promise.all([
        getCourse(id),
        getCourseMembers(id),
        getResources(id).catch(() => ({ data: [] })),
      ])
      setCourse(cRes.data)
      const rawM = mRes.data
      setMembers(Array.isArray(rawM) ? rawM : (rawM?.results || []))
      const rawR = rRes.data
      setResources(Array.isArray(rawR) ? rawR : (rawR?.results || []))
    } catch (e) {
      setCourse(null)
      setMembers([])
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleJoin = async () => {
    setJoining(true)
    try {
      const res = await joinCourse(id)
      setMessage({ type: 'success', text: res.data?.message || 'Inscription réussie' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur' })
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!window.confirm('Voulez-vous vraiment vous désinscrire de ce cours ?')) return
    setLeaving(true)
    try {
      const res = await leaveCourse(id)
      setMessage({ type: 'success', text: res.data?.message || 'Désinscription effectuée' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur' })
    } finally {
      setLeaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement ce cours ?')) return
    setDeleting(true)
    try {
      await deleteCourse(id)
      navigate('/courses')
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur de suppression' })
      setDeleting(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!pdfFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', pdfFile)
      fd.append('title', pdfTitle || pdfFile.name)
      await uploadResource(id, fd)
      setPdfFile(null)
      setPdfTitle('')
      setMessage({ type: 'success', text: 'Fichier ajouté' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur upload' })
    } finally {
      setUploading(false)
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
      await gradeMember(id, memberUserId, {
        status: gradeForm.status,
        grade: gradeForm.grade === '' ? null : parseFloat(gradeForm.grade),
        grade_comment: gradeForm.grade_comment,
      })
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
  const students = memberList.filter((m) => m.role === 'member')
  const teachers = memberList.filter((m) => m.role === 'teacher' || m.role === 'animator')
  const resourceList = Array.isArray(resources) ? resources : []

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
            <span className="text-sm text-gray-500">
              {course.members_count ?? students.length} étudiant(s)
            </span>
            {course.is_member ? (
              <>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                  Vous êtes inscrit
                </span>
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={leaving}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  {leaving ? '...' : 'Se désinscrire'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {joining ? 'Inscription...' : "S'inscrire au cours"}
              </button>
            )}
            {isStaff && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '...' : 'Supprimer le cours'}
              </button>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* PDF / Resources */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Documents PDF</h2>
        {resourceList.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">Aucun document pour le moment.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {resourceList.map((r) => (
              <li key={r.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                <span className="font-medium text-gray-800">{r.title}</span>
                {r.file && (
                  <a
                    href={r.file}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Télécharger
                  </a>
                )}
                {r.link && (
                  <a href={r.link} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                    Lien
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        {isStaff && (
          <form onSubmit={handleUpload} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Ajouter un PDF</p>
            <input
              type="text"
              value={pdfTitle}
              onChange={(e) => setPdfTitle(e.target.value)}
              placeholder="Titre du document"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
            <button
              type="submit"
              disabled={uploading || !pdfFile}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {uploading ? 'Envoi...' : 'Uploader le PDF'}
            </button>
          </form>
        )}
      </div>

      {teachers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Enseignants</h2>
          <div className="flex flex-wrap gap-3">
            {teachers.map((t) => (
              <div key={t.id} className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-sm">
                <span className="font-medium">{t.user_detail?.full_name || t.user_detail?.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Étudiants inscrits ({students.length})
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
                {students.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.user_detail?.full_name || m.user_detail?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {editing === m.id ? (
                        <select
                          value={gradeForm.status}
                          onChange={(e) => setGradeForm((f) => ({ ...f, status: e.target.value }))}
                          className="px-2 py-1 rounded-lg border text-sm"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[m.status] || STATUS_BADGE.enrolled}`}>
                          {m.status_display || m.status}
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
                          onChange={(e) => setGradeForm((f) => ({ ...f, grade: e.target.value }))}
                          className="w-20 px-2 py-1 rounded-lg border text-sm"
                        />
                      ) : (
                        <span>{m.grade != null ? `${m.grade}/20` : '—'}</span>
                      )}
                    </td>
                    {isStaff && (
                      <td className="px-4 py-3 text-right">
                        {editing === m.id ? (
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => saveGrade(m.user)} className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded-lg">
                              Enregistrer
                            </button>
                            <button type="button" onClick={() => setEditing(null)} className="px-3 py-1 text-xs text-gray-600">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => startEdit(m)} className="px-3 py-1 text-xs font-semibold text-indigo-600">
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
