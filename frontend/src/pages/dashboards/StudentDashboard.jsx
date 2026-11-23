import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-1">Espace Étudiant</h1>
      <p className="text-gray-600 mb-8">
        Bonjour {user?.first_name} {user?.last_name}
      </p>

      <div className="bg-white rounded-xl p-6 shadow">
        <p className="text-gray-600 mb-4">
          Pour voir les cours, choisissez d&apos;abord votre filière puis votre année.
        </p>
        <Link
          to="/courses"
          className="inline-block px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Voir les filières et cours
        </Link>
      </div>
    </div>
  )
}
