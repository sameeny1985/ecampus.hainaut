import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/posts/feed/')
      .then(res => setPosts(res.data.results || res.data || []))
      .catch(() => setError('Impossible de charger le fil'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-600">Chargement du fil...</div>
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fil d'actualité</h1>
        <p className="text-gray-600">Bonjour {user?.first_name || user?.email}</p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow">
          <p className="text-gray-500">Aucune publication pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <article key={post.id} className="bg-white rounded-xl p-5 shadow">
              <div className="font-medium">{post.author_detail?.full_name || 'Utilisateur'}</div>
              <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
              <div className="text-xs text-gray-500 mt-3">
                {new Date(post.created_at).toLocaleString('fr-FR')}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
