import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getMajors, getTeachers, createCourse } from '../../services/communityService'
import { useAuth } from '../../contexts/AuthContext'

export default function CreateCoursePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [majors, setMajors] = useState([])
  const [teachers, setTeachers] = useState([])
  const [form, setForm] = useState({
    major: '',
    year: '1',
    name: '',
    course_code: '',
    description: '',
    teacher: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMajors()
      .then(res => {
        const data = res.data
        setMajors(Array.isArray(data) ? data : (data?.results || []))
      })
      .catch(() => setMajors([]))

    getTeachers()
      .then(res => {
        const data = res.data
        setTeachers(Array.isArray(data) ? data : (data?.results || []))
      })
      .catch(() => setTeachers([]))
  }, [])

  if (user && !['teacher', 'admin', 'moderator'].includes(user.role)) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 text-center bg-amber-50 rounded-2xl">
        <p className="text-amber-800 font-medium">
          Seuls les enseignants et le personnel peuvent créer des cours.
        </p>
        <Link to="/courses" className="mt-4 inline-block text-indigo-600 font-medium">
          Retour aux filières
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload = {
        ...form,
        year: parseInt(form.year, 10),
        major: form.major,
        teacher: form.teacher || null,
      }
      const res = await createCourse(payload)
      navigate(`/courses/${res.data.id}`)
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object' && data !== null) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        setError(msgs.join(' · ') || 'Erreur')
      } else {
        setError(data?.error || 'Erreur lors de la création')
      }
    } finally {
      setLoading(false)
    }
  }

  const majorList = Array.isArray(majors) ? majors : []
  const teacherList = Array.isArray(teachers) ? teachers : []

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Link to="/courses" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
        ← Retour
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">Nouveau cours</h1>
      <p className="mt-1 text-gray-600">
        Sélectionnez la filière, l’année, puis saisissez le nom du cours.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Filière <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.major}
            onChange={e => setForm(f => ({ ...f, major: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">— Choisir une filière —</option>
            {majorList.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {majorList.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Aucune filière chargée. Vérifiez que seed_majors اجرا شده.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Année <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {[1, 2, 3].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => setForm(f => ({ ...f, year: String(y) }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  form.year === String(y)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {y}e année
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Professeur <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.teacher}
            onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="">— Choisir un enseignant —</option>
            {teacherList.map(t => (
              <option key={t.id} value={t.id}>
                {t.full_name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email}
              </option>
            ))}
          </select>
          {teacherList.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Aucun enseignant trouvé. Vérifiez que des professeurs ont été créés par l'administrateur.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Nom du cours <span className="text-red-500">*</span>
          </label>
          <input
            required
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Algorithmique et structures de données"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code du cours</label>
          <input
            type="text"
            value={form.course_code}
            onChange={e => setForm(f => ({ ...f, course_code: e.target.value }))}
            placeholder="Ex: INFO-L1-01"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Objectifs, contenu..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Créer le cours'}
        </button>
      </form>
    </div>
  )
}
