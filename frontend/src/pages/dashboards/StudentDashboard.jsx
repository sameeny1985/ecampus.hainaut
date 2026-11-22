import { useAuth } from '../../contexts/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Espace Étudiant</h1>
      <p className="text-gray-600 mb-6">Bonjour {user?.first_name} {user?.last_name}</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Mes cours</h2>
          <p className="text-gray-500 text-sm">Aucune communauté rejointe pour le moment.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Fil d'actualité</h2>
          <p className="text-gray-500 text-sm">Aucune publication récente.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Messages</h2>
          <p className="text-gray-500 text-sm">Aucun nouveau message.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Mon profil</h2>
          <p className="text-sm"><strong>Rôle :</strong> Étudiant</p>
          <p className="text-sm"><strong>Email :</strong> {user?.email}</p>
        </div>
      </div>
    </div>
  )
}
