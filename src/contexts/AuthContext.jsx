import { createContext, useContext, useState, useEffect } from 'react'
import { verifyToken } from '../utils/github'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('gh_token') || '')
  const [canEdit, setCanEdit] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (token) {
      checkToken(token)
    }
  }, [])

  async function checkToken(t) {
    setChecking(true)
    const ok = await verifyToken(t)
    setCanEdit(ok)
    setChecking(false)
    return ok
  }

  async function login(inputToken) {
    const ok = await checkToken(inputToken)
    if (ok) {
      setToken(inputToken)
      localStorage.setItem('gh_token', inputToken)
    }
    return ok
  }

  function logout() {
    setToken('')
    setCanEdit(false)
    localStorage.removeItem('gh_token')
  }

  return (
    <AuthContext.Provider value={{ token, canEdit, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
