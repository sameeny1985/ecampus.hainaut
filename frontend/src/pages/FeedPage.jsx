import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function FeedPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.get('/posts/feed/').then(res => res.data),
  })

  if (isLoading) return <div className="p-8 text-center">Chargement du fil...</div>
  if (error) return <div className="p-8 text-center text-red-600">Erreur de chargement</div>

  const posts = data?.results || data || []

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fil d'actualité</h1>
        <p className="text-gray-600">Bonjour {user?.first_name || user?.email}</p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow">
          <p className="text-gray-500">Aucune publication pour le moment.</p>
          <p className="text-sm text-gray-400 mt-2">Rejoignez des communautés pour voir des contenus.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <article key={post.id} className="bg-white rounded-xl p-5 shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-medium">
                  {post.author_detail?.first_name?.[0] || '?'}
                </div>
                <div>
                  <div className="font-medium">{post.author_detail?.full_name || 'Utilisateur'}</div>
                  <div className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('fr-FR')}</div>
                </div>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
              {post.community_name && (
                <div className="mt-3 text-sm text-primary-600">Dans : {post.community_name}</div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
