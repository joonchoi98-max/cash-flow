import { createContext, useContext, useState, useCallback } from 'react'

const CORRECT_PASSWORD = '7990'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [canEdit, setCanEdit] = useState(() => localStorage.getItem('edit_auth') === '1')
  const [ghToken, setGhTokenState] = useState(() => localStorage.getItem('gh_write_token') || '')
  const [tokenPromise, setTokenPromise] = useState(null) // { resolve, reject }

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

  function saveGhToken(token) {
    setGhTokenState(token)
    localStorage.setItem('gh_write_token', token)
  }

  // 저장 시도할 때 토큰 없으면 모달 띄우고 토큰 반환
  const requireToken = useCallback(() => {
    const stored = localStorage.getItem('gh_write_token')
    if (stored) return Promise.resolve(stored)
    return new Promise((resolve, reject) => {
      setTokenPromise({ resolve, reject })
    })
  }, [])

  function resolveToken(token) {
    saveGhToken(token)
    tokenPromise?.resolve(token)
    setTokenPromise(null)
  }

  function cancelToken() {
    tokenPromise?.reject(new Error('cancelled'))
    setTokenPromise(null)
  }

  return (
    <AuthContext.Provider value={{ canEdit, ghToken, login, logout, saveGhToken, requireToken, tokenPromise, resolveToken, cancelToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
