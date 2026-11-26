import { useState, useEffect } from 'react'
import api from '../services/api'

export default function ModeratorRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formsById, setFormsById] = useState({})

  const loadRequests = () => {
    setLoading(true)
    api.get('/auth/registration-requests/')
      .then((res) => {
        const list = res.data || []
        setRequests(list)
        const initialForms = {}
        list.forEach((r) => {
          const slug = `${(r.first_name || 'etu').toLowerCase()}.${(r.last_name || 'user').toLowerCase()}`
            .replace(/[^a-z0-9._-]/g, '')
          initialForms[r.id] = {
            assigned_institutional_email: r.assigned_institutional_email || `${slug}@hainaut-ea.be`,
            assigned_temporary_password: r.assigned_temporary_password || 'Campus2026!',
            moderator_note: r.moderator_note || '',
          }
        })
        setFormsById(initialForms)
      })
      .catch((err) => {
        setErrorMsg(err?.response?.data?.error || 'Erreur lors du chargement des demandes.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const updateField = (id, field, value) => {
    setFormsById((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }))
  }

  const handleDecision = async (id, action) => {
    setErrorMsg('')
    setSuccessMsg('')
    const payload = {
      action,
      ...(formsById[id] || {}),
    }
    try {
      const res = await api.post(`/auth/registration-requests/${id}/decision/`, payload)
      setSuccessMsg(res.data?.message || 'Décision enregistrée.')
      loadRequests()
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || 'Erreur lors de la mise à jour de la demande.')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Validation des inscriptions (1re année)
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Attribuez l'e-mail institutionnel (@hainaut-ea.be), le mot de passe temporaire et le statut d'inscription.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-500">
          Aucune demande d'inscription pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const f = formsById[r.id] || {}
            return (
              <div key={r.id} className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-gray-900">
                      {r.first_name} {r.last_name} — <span className="text-blue-700">{r.bachelor}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      E-mail Google / personnel : <strong>{r.personal_email}</strong>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      r.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : r.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      E-mail institutionnel (@hainaut-ea.be)
                    </label>
                    <input
                      type="email"
                      value={f.assigned_institutional_email || ''}
                      onChange={(e) => updateField(r.id, 'assigned_institutional_email', e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mot de passe temporaire
                    </label>
                    <input
                      type="text"
                      value={f.assigned_temporary_password || ''}
                      onChange={(e) => updateField(r.id, 'assigned_temporary_password', e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Message / Statut envoyé
                    </label>
                    <input
                      type="text"
                      value={f.moderator_note || ''}
                      onChange={(e) => updateField(r.id, 'moderator_note', e.target.value)}
                      placeholder="Ex. : Bienvenue en 1re année"
                      className="w-full px-3 py-2 text-sm border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecision(r.id, 'reject')}
                    className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs sm:text-sm font-semibold"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(r.id, 'approve')}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold"
                  >
                    Approuver et envoyer identifiants
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
