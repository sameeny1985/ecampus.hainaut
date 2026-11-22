import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [communities, setCommunities] = useState([])

  useEffect(() => {
    api.get('/communities/')
      .then(r => setCommunities(r.data.results || r.data || []))
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-1">Espace Étudiant</h1>
      <p className="text-gray-600 mb-6">Bonjour {user?.first_name} {user?.last_name}</p>

      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="font-semibold text-lg mb-4">Communautés disponibles</h2>
        {communities.length === 0 ? (
          <p className="text-gray-500">Aucune communauté pour le moment. Les enseignants en créeront bientôt.</p>
        ) : (
          <div className="space-y-3">
            {communities.map(c => (
              <div key={c.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-600">{c.description}</div>
                </div>
                <button className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded">
                  Rejoindre
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
