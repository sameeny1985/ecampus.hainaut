import { Link } from 'react-router-dom'
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
      <h1 className="text-2xl font-bold mb-1">Espace {roleLabel}</h1>
      <p className="text-gray-600 mb-8">
        Bonjour {user?.first_name} {user?.last_name}
      </p>

      <div className="bg-white rounded-xl p-6 shadow">
        <p className="text-gray-600 mb-4">
          Utilisez le menu en haut pour gérer les cours et les filières.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/courses"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Voir les filières et cours
          </Link>
          <Link
            to="/courses/create"
            className="px-5 py-2.5 rounded-lg border border-indigo-600 text-indigo-600 text-sm font-medium hover:bg-indigo-50"
          >
            Ajouter un cours
          </Link>
        </div>
      </div>
    </div>
  )
}
