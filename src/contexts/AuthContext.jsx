import { createContext, useContext, useState } from 'react'

const CORRECT_PASSWORD = '7990'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [canEdit, setCanEdit] = useState(() => localStorage.getItem('edit_auth') === '1')

  function login(password) {
    if (password === CORRECT_PASSWORD) {
      setCanEdit(true)
      localStorage.setItem('edit_auth', '1')
      return true
    }
    return false
  }

  function logout() {
    setCanEdit(false)
    localStorage.removeItem('edit_auth')
  }

  return (
    <AuthContext.Provider value={{ canEdit, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
