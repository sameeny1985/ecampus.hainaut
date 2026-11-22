import { useAuth } from '../../contexts/AuthContext'

export default function StaffDashboard() {
  const { user } = useAuth()
  const roleLabel = {
    teacher: 'Enseignant',
    moderator: 'Modérateur',
    admin: 'Administrateur',
  }[user?.role] || 'Personnel'

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Espace Personnel</h1>
      <p className="text-gray-600 mb-6">Bonjour {user?.first_name} {user?.last_name} — {roleLabel}</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Gestion des communautés</h2>
          <p className="text-gray-500 text-sm">Créer et gérer les communautés de cours.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Publications</h2>
          <p className="text-gray-500 text-sm">Publier des annonces et contenus.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Modération</h2>
          <p className="text-gray-500 text-sm">Signalements et contenus à examiner.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h2 className="font-semibold text-lg mb-2">Mon compte</h2>
          <p className="text-sm"><strong>Rôle :</strong> {roleLabel}</p>
          <p className="text-sm"><strong>Email :</strong> {user?.email}</p>
        </div>
      </div>
    </div>
  )
}
