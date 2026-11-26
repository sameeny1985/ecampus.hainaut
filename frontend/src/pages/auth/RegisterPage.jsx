import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const BACHELOR_OPTIONS = [
  'Bachelier en Informatique de gestion',
  'Bachelier en Comptabilité',
  'Bachelier en Électromécanique',
  'Bachelier en Automatique',
  'Bachelier en Marketing',
  'Bachelier en Droit',
]

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const googleButtonRef = useRef(null)

  // 'choose' | 'first_year_google' | 'first_year_details' | 'upper_year_login' | 'upper_year_form'
  const [step, setStep] = useState('choose')

  // ورود با ایمیل و پسورد موجود برای سال دوم / سوم
  const [existingEmail, setExistingEmail] = useState('')
  const [existingPassword, setExistingPassword] = useState('')
  const [loggingInUpper, setLoggingInUpper] = useState(false)

  // فرم ثبت‌نام سال دوم و سوم پس از ورود
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [academicYear, setAcademicYear] = useState('2eme')
  const [bachelor, setBachelor] = useState(BACHELOR_OPTIONS[0])
  const [acceptTerms, setAcceptTerms] = useState(true)
  const [acceptPrivacy, setAcceptPrivacy] = useState(true)

  // فرم دانشجوی سال اول: مرحله ۱ ایمیل گوگل، مرحله ۲ تکمیل مشخصات
  const [fyFirstName, setFyFirstName] = useState('')
  const [fyLastName, setFyLastName] = useState('')
  const [googleEmail, setGoogleEmail] = useState('')
  const [googleVerified, setGoogleVerified] = useState(false)
  const [fyBachelor, setFyBachelor] = useState(BACHELOR_OPTIONS[0])

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (user) {
      if (user.email && !existingEmail) setExistingEmail(user.email)
      if (user.first_name && !firstName) setFirstName(user.first_name)
      if (user.last_name && !lastName) setLastName(user.last_name)
    }
  }, [user, existingEmail, firstName, lastName])

  useEffect(() => {
    if (step !== 'first_year_google' || !clientId || !googleButtonRef.current) return

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          const payload = decodeJwtPayload(response?.credential || '')
          if (payload?.email) {
            setGoogleEmail(String(payload.email).toLowerCase())
            if (payload.given_name && !fyFirstName) setFyFirstName(payload.given_name)
            if (payload.family_name && !fyLastName) setFyLastName(payload.family_name)
            setGoogleVerified(true)
            setErrorMsg('')
            setStep('first_year_details')
          } else {
            setErrorMsg("Impossible de lire l'adresse e-mail depuis le compte Google.")
          }
        },
      })
      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
      })
    }

    if (window.google?.accounts?.id) {
      initGoogle()
      return
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      existingScript.addEventListener('load', initGoogle)
      return () => existingScript.removeEventListener('load', initGoogle)
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initGoogle
    document.head.appendChild(script)
  }, [step, clientId, fyFirstName, fyLastName])

  const handleContinueGoogleStep = (e) => {
    e.preventDefault()
    setErrorMsg('')
    const clean = googleEmail.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      setErrorMsg('Veuillez saisir ou sélectionner une adresse e-mail Google valide.')
      return
    }
    setGoogleEmail(clean)
    setGoogleVerified(true)
    setStep('first_year_details')
  }

  const handleUpperYearLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setInfoMsg('')

    const cleanEmail = existingEmail.trim().toLowerCase()
    if (!cleanEmail || !existingPassword) {
      setErrorMsg('Veuillez saisir votre e-mail et votre mot de passe existants.')
      return
    }

    setLoggingInUpper(true)
    try {
      const loggedInUser = await login(cleanEmail, existingPassword)
      if (loggedInUser?.first_name) setFirstName(loggedInUser.first_name)
      if (loggedInUser?.last_name) setLastName(loggedInUser.last_name)
      setExistingPassword('')
      setStep('upper_year_form')
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Identifiants existants incorrects.'
      setErrorMsg(msg)
    } finally {
      setLoggingInUpper(false)
    }
  }

  const handleUpperYearRegisterSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setInfoMsg('')

    if (!acceptTerms || !acceptPrivacy) {
      setErrorMsg("Veuillez accepter les conditions d'utilisation et la politique de confidentialité.")
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/auth/upper-year-register/', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        academic_year: academicYear,
        bachelor,
      })

      if (res.data?.access) {
        localStorage.setItem('access_token', res.data.access)
        if (res.data.refresh) {
          localStorage.setItem('refresh_token', res.data.refresh)
        }
      }

      window.location.href = '#/dashboard'
      window.location.reload()
    } catch (err) {
      const data = err?.response?.data
      setErrorMsg(data?.error || data?.detail || "Erreur lors de l'inscription.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFirstYearSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setInfoMsg('')

    const cleanEmail = googleEmail.trim().toLowerCase()
    if (!cleanEmail) {
      setErrorMsg("Veuillez d'abord vous connecter avec votre e-mail Google.")
      setStep('first_year_google')
      return
    }
    if (!fyFirstName.trim() || !fyLastName.trim() || !fyBachelor) {
      setErrorMsg('Veuillez remplir le prénom, le nom et la filière.')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/auth/first-year-requests/', {
        first_name: fyFirstName.trim(),
        last_name: fyLastName.trim(),
        personal_email: cleanEmail,
        bachelor: fyBachelor,
      })
      setInfoMsg(
        res.data?.message ||
          "Votre demande a été envoyée au modérateur. Il vous enverra votre e-mail et mot de passe universitaires ainsi que le statut de votre inscription."
      )
      setFyFirstName('')
      setFyLastName('')
      setGoogleEmail('')
      setGoogleVerified(false)
      setStep('choose')
    } catch (err) {
      const data = err?.response?.data
      setErrorMsg(data?.detail || data?.error || "Erreur lors de l'envoi de la demande.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center py-10 px-4">
      <div className="max-w-lg w-full mx-auto bg-white rounded-2xl shadow-md border p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            CampusConnect
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Inscription étudiant</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            IETC Charleroi — Choisissez votre situation d'inscription
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
                Retour à la page de connexion
              </button>
            </div>
          </div>
        )}

        {/* انتخاب سال اولی یا سال دوم/سوم */}
        {step === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-800 text-center">
              Êtes-vous étudiant de 1re année ou de 2e / 3e année ?
            </p>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('')
                setInfoMsg('')
                setStep('first_year_google')
              }}
              className="w-full p-4 rounded-xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/40 text-left transition"
            >
              <div className="font-bold text-gray-900 text-sm sm:text-base">
                1re année (Nouvel étudiant — sans e-mail @hainaut-ea.be)
              </div>
              <div className="text-xs text-gray-600 mt-1">
                1. Connexion via Google puis 2. Saisie de vos informations et envoi au modérateur.
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('')
                setInfoMsg('')
                if (user) {
                  setExistingEmail(user.email || '')
                  setFirstName(user.first_name || '')
                  setLastName(user.last_name || '')
                  setStep('upper_year_form')
                } else {
                  setStep('upper_year_login')
                }
              }}
              className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-600 bg-white text-left transition"
            >
              <div className="font-bold text-gray-900 text-sm sm:text-base">
                2e ou 3e année (Avec e-mail et mot de passe existants)
              </div>
              <div className="text-xs text-gray-600 mt-1">
                1. Connexion avec votre e-mail et mot de passe existants puis 2. Inscription en 2e ou 3e année.
              </div>
            </button>
          </div>
        )}

        {/* مرحله ۱ سال اولی: ورود با کلید گوگل */}
        {step === 'first_year_google' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                1re année — Étape 1/2 : Connexion Google
              </span>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs text-blue-600 hover:underline"
              >
                ← Retour
              </button>
            </div>

            {clientId ? (
              <div className="flex justify-center py-2">
                <div ref={googleButtonRef} />
              </div>
            ) : (
              <form onSubmit={handleContinueGoogleStep} className="space-y-3">
                <p className="text-xs text-gray-600">
                  Saisissez votre adresse e-mail Google pour continuer vers le formulaire d'inscription :
                </p>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="prenom.nom@gmail.com"
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
                >
                  Continuer avec Google
                </button>
              </form>
            )}
          </div>
        )}

        {/* مرحله ۲ سال اولی: تکمیل مشخصات پس از ورود گوگل */}
        {step === 'first_year_details' && (
          <form onSubmit={handleFirstYearSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                1re année — Étape 2/2 : Informations
              </span>
              <button
                type="button"
                onClick={() => setStep('first_year_google')}
                className="text-xs text-blue-600 hover:underline"
              >
                ← Changer d'e-mail Google
              </button>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border text-xs text-gray-700">
              E-mail Google {googleVerified ? 'sélectionné' : ''} : <strong>{googleEmail}</strong>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text"
                  value={fyFirstName}
                  onChange={(e) => setFyFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={fyLastName}
                  onChange={(e) => setFyLastName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filière souhaitée</label>
              <select
                value={fyBachelor}
                onChange={(e) => setFyBachelor(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BACHELOR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition"
            >
              {submitting ? 'Envoi au modérateur...' : 'Envoyer la demande au modérateur'}
            </button>
          </form>
        )}

        {/* مرحله ۱ سال دوم / سوم: ورود با ایمیل و پسورد موجود */}
        {step === 'upper_year_login' && (
          <form onSubmit={handleUpperYearLogin} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                2e / 3e année — Étape 1/2 : Connexion existante
              </span>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs text-blue-600 hover:underline"
              >
                ← Retour
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                E-mail existant
              </label>
              <input
                type="email"
                value={existingEmail}
                onChange={(e) => setExistingEmail(e.target.value)}
                placeholder="prenom.nom@hainaut-ea.be"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mot de passe existant
              </label>
              <input
                type="password"
                value={existingPassword}
                onChange={(e) => setExistingPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loggingInUpper}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition"
            >
              {loggingInUpper ? 'Connexion...' : 'Se connecter et continuer'}
            </button>
          </form>
        )}

        {/* مرحله ۲ سال دوم / سوم: فرم ثبت‌نام در سال دوم یا سوم پس از ورود */}
        {step === 'upper_year_form' && (
          <form onSubmit={handleUpperYearRegisterSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                2e / 3e année — Étape 2/2 : Inscription
              </span>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs text-blue-600 hover:underline"
              >
                ← Changer de choix
              </button>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 border text-xs text-gray-700">
              Compte connecté : <strong>{user?.email || existingEmail}</strong>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Année d'inscription</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2eme">2e année</option>
                  <option value="3eme">3e année</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filière / Bachelier</label>
                <select
                  value={bachelor}
                  onChange={(e) => setBachelor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BACHELOR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
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
              {submitting ? 'Enregistrement...' : 'Valider mon inscription'}
            </button>
          </form>
        )}

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
