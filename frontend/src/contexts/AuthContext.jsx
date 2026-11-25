import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/auth/me/')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    setIsLoggingOut(false)
    const res = await api.post('/auth/login/', { email, password })
    localStorage.setItem('access_token', res.data.access)
    if (res.data.refresh) localStorage.setItem('refresh_token', res.data.refresh)
    const me = await api.get('/auth/me/')
    setUser(me.data)
    return me.data
  }

  const logout = () => {
    setIsLoggingOut(true)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isLoggingOut, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
