import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const ROLE_LABELS = {
  student: 'Étudiant',
  teacher: 'Enseignant',
  moderator: 'Personnel / Modérateur',
  admin: 'Administrateur',
}

export default function ProfileMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur'
  const initials = `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || 'U'
  const roleLabel = ROLE_LABELS[user.role] || user.role || 'Membre'

  const resetPasswordState = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleToggleMenu = () => {
    const next = !open
    setOpen(next)
    if (!next) {
      setShowPasswordForm(false)
      resetPasswordState()
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Veuillez remplir tous les champs du mot de passe.')
      return
    }
    if (newPassword.length < 8) {
      setErrorMsg('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('La confirmation du mot de passe ne correspond pas.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/auth/change-password/', {
        old_password: currentPassword,
        current_password: currentPassword,
        new_password: newPassword,
        new_password2: confirmPassword,
      })
      setSuccessMsg('Mot de passe mis à jour avec succès.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err) {
      const data = err?.response?.data
      const detail =
        data?.detail ||
        data?.old_password?.[0] ||
        data?.current_password?.[0] ||
        data?.new_password?.[0] ||
        'Impossible de modifier le mot de passe. Vérifiez votre mot de passe actuel.'
      setErrorMsg(detail)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={handleToggleMenu}
        className="flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition max-w-[180px] sm:max-w-none"
        title="Profil et sécurité"
      >
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {initials}
        </span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 truncate max-w-[140px]">
          {fullName}
        </span>
        <span className="text-[10px] text-gray-500 shrink-0">▼</span>
      </button>

      {open && (
        <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 mt-2 sm:w-80 bg-white rounded-xl shadow-lg border z-40 p-4 text-left max-w-full">
          {/* اطلاعات هویتی و نقش کاربر */}
          <div className="pb-3 border-b space-y-1 min-w-0">
            <div className="text-sm font-bold text-gray-900 break-words">{fullName}</div>
            <div className="text-xs text-gray-600 break-all">{user.email}</div>
            <div className="pt-1">
              <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* پیام موفقیت در صورت تغییر رمز */}
          {successMsg && (
            <div className="mt-3 p-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
              {successMsg}
            </div>
          )}

          {/* دکمه باز کردن فرم تغییر رمز */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('')
                setSuccessMsg('')
                setShowPasswordForm((prev) => !prev)
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-gray-50 hover:bg-gray-100 text-gray-800 flex items-center justify-between transition"
            >
              <span>Changer le mot de passe</span>
              <span>{showPasswordForm ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* فرم تغییر رمز عبور */}
          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="mt-3 space-y-2.5">
              {errorMsg && (
                <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-600 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 caractères"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    resetPasswordState()
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg"
                >
                  {submitting ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
