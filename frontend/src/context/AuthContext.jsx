import { createContext, useContext, useEffect, useState } from 'react'
import { fetchCurrentUser } from '../api/auth'
import { clearToken, getToken, setToken as saveToken } from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchCurrentUser(token)
      .then(setUser)
      .catch(() => {
        clearToken()
        setTokenState(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  function signIn(newToken) {
    saveToken(newToken)
    setTokenState(newToken)
  }

  function signOut() {
    clearToken()
    setTokenState(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
