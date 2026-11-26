import { useState, useEffect } from 'react'
import api from '../services/api'

export default function ModeratorRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formsById, setFormsById] = useState({})

  const loadRequests = () => {
    setLoading(true)
    api.get('/auth/registration-requests/')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results || [])
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

  const handleDecision = async (reqItem, action) => {
    setErrorMsg('')
    setSuccessMsg('')
    setSubmittingId(reqItem.id)

    const isUpperYear = ['2eme', '3eme'].includes(reqItem.academic_year)
    const currentForm = formsById[reqItem.id] || {}

    const payload = {
      action,
      moderator_note: currentForm.moderator_note || '',
    }

    if (action === 'approve') {
      if (isUpperYear) {
        payload.assigned_institutional_email =
          currentForm.assigned_institutional_email ||
          reqItem.assigned_institutional_email ||
          reqItem.personal_email
      } else {
        payload.assigned_institutional_email = currentForm.assigned_institutional_email || ''
        payload.assigned_temporary_password = currentForm.assigned_temporary_password || ''
      }
    }

    try {
      const res = await api.post(`/auth/registration-requests/${reqItem.id}/decision/`, payload)
      setSuccessMsg(res.data?.message || 'Décision enregistrée.')
      loadRequests()
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || 'Erreur lors de la mise à jour de la demande.')
    } finally {
      setSubmittingId(null)
    }
  }

  const upperYearRequests = requests.filter((r) => ['2eme', '3eme'].includes(r.academic_year))
  const firstYearRequests = requests.filter((r) => !['2eme', '3eme'].includes(r.academic_year))

  const renderRequestCard = (r) => {
    const f = formsById[r.id] || {}
    const isUpperYear = ['2eme', '3eme'].includes(r.academic_year)
    const isBusy = submittingId === r.id

    const yearLabel =
      r.academic_year === '2eme'
        ? '2e année'
        : r.academic_year === '3eme'
        ? '3e année'
        : '1re année'

    const statusBadgeClass =
      r.status === 'approved'
        ? 'bg-green-100 text-green-800'
        : r.status === 'rejected'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800'

    const statusLabel =
      r.status === 'approved'
        ? 'Approuvée'
        : r.status === 'rejected'
        ? 'Refusée'
        : 'En attente'

    return (
      <div key={r.id} className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-900">
                {r.first_name} {r.last_name}
              </span>
              <span className="text-blue-700 font-semibold">— {r.bachelor}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                {yearLabel}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              E-mail étudiant : <strong>{r.personal_email}</strong>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass}`}>
            {statusLabel}
          </span>
        </div>

        {isUpperYear ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Remarque du modérateur (optionnel)
            </label>
            <input
              type="text"
              value={f.moderator_note || ''}
              onChange={(e) => updateField(r.id, 'moderator_note', e.target.value)}
              placeholder={`Ex. : Validation ${yearLabel} — ${r.bachelor}`}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>
        ) : (
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
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleDecision(r, 'reject')}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 text-xs sm:text-sm font-semibold"
          >
            {isBusy ? 'Traitement...' : 'Refuser'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleDecision(r, 'approve')}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 text-xs sm:text-sm font-semibold"
          >
            {isBusy
              ? 'Traitement...'
              : isUpperYear
              ? `Approuver (${yearLabel})`
              : 'Approuver et envoyer identifiants'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Validation des inscriptions
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Validez les demandes d&apos;inscription pour la 2e / 3e année et la 1re année.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          className="px-3.5 py-2 rounded-lg border bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium text-gray-700"
        >
          Actualiser
        </button>
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
          Aucune demande d&apos;inscription pour le moment.
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              2e et 3e années ({upperYearRequests.length})
            </h2>
            {upperYearRequests.length === 0 ? (
              <div className="bg-white rounded-xl border p-5 text-sm text-gray-500">
                Aucune demande pour la 2e ou 3e année.
              </div>
            ) : (
              <div className="space-y-4">{upperYearRequests.map(renderRequestCard)}</div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              1re année ({firstYearRequests.length})
            </h2>
            {firstYearRequests.length === 0 ? (
              <div className="bg-white rounded-xl border p-5 text-sm text-gray-500">
                Aucune demande pour la 1re année.
              </div>
            ) : (
              <div className="space-y-4">{firstYearRequests.map(renderRequestCard)}</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
