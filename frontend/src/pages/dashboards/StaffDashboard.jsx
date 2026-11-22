import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function StaffDashboard() {
  const { user } = useAuth()
  const [communities, setCommunities] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const roleLabel = {
    teacher: 'Enseignant',
    moderator: 'Modérateur',
    admin: 'Administrateur',
  }[user?.role] || 'Personnel'

  useEffect(() => {
    api.get('/communities/')
      .then(r => setCommunities(r.data.results || r.data || []))
      .catch(() => {})
  }, [])

  const createCommunity = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await api.post('/communities/', { name, description })
      setCommunities([res.data, ...communities])
      setName('')
      setDescription('')
      setMessage('Communauté créée avec succès')
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-1">Espace {roleLabel}</h1>
      <p className="text-gray-600 mb-6">Bonjour {user?.first_name} {user?.last_name}</p>

      <div className="bg-white rounded-xl p-6 shadow mb-6">
        <h2 className="font-semibold text-lg mb-4">Créer une communauté de cours</h2>
        <form onSubmit={createCommunity} className="space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nom du cours (ex: Mathématiques 1)"
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer la communauté'}
          </button>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>

      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="font-semibold text-lg mb-4">Mes communautés</h2>
        {communities.length === 0 ? (
          <p className="text-gray-500">Aucune communauté créée.</p>
        ) : (
          <div className="space-y-3">
            {communities.map(c => (
              <div key={c.id} className="border rounded-lg p-4">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-600">{c.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
