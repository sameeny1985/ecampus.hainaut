import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('student')
  const [bachelor, setBachelor] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setInfoMsg('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.endsWith('@hainaut-ea.be')) {
      setErrorMsg("L'adresse e-mail doit se terminer par @hainaut-ea.be.")
      return
    }
    if (password.length < 8) {
      setErrorMsg('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== passwordConfirm) {
      setErrorMsg('Les mots de passe ne correspondent pas.')
      return
    }
    if (!acceptTerms || !acceptPrivacy) {
      setErrorMsg("Veuillez accepter les conditions d'utilisation et la politique de confidentialité.")
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/auth/register/', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        role,
        bachelor: bachelor.trim(),
        password,
        password_confirm: passwordConfirm,
        accept_terms: acceptTerms,
        accept_privacy: acceptPrivacy,
      })

      if (res.data?.access) {
        localStorage.setItem('access_token', res.data.access)
        if (res.data.refresh) {
          localStorage.setItem('refresh_token', res.data.refresh)
        }
        window.location.href = '#/dashboard'
        window.location.reload()
      } else {
        setInfoMsg(
          res.data?.message ||
          "Votre demande de compte est enregistrée et en attente de validation par l'administration."
        )
      }
    } catch (err) {
      const data = err?.response?.data
      const firstFieldError =
        data && typeof data === 'object'
          ? Object.values(data).flat().find((v) => typeof v === 'string')
          : null
      setErrorMsg(data?.detail || firstFieldError || "Erreur lors de l'inscription.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center py-10 px-4">
      <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-md border p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            CampusConnect
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Créer un compte</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Réservé aux adresses institutionnelles (@hainaut-ea.be)
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-xs sm:text-sm text-green-800 space-y-2">
            <div>{infoMsg}</div>
            <div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-semibold underline text-green-900"
              >
                Aller à la page de connexion
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              E-mail institutionnel (@hainaut-ea.be)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@hainaut-ea.be"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="student">Étudiant</option>
                <option value="teacher">Enseignant (validation requise)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filière / Bachelier</label>
              <input
                type="text"
                value={bachelor}
                onChange={(e) => setBachelor(e.target.value)}
                placeholder="Ex. : Informatique"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <span>J'accepte les conditions générales d'utilisation de CampusConnect.</span>
            </label>
            <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <span>J'accepte la politique de confidentialité et le traitement RGPD de mes données.</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition"
          >
            {submitting ? 'Création en cours...' : "S'inscrire"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs sm:text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}
