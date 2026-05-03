import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginModal({ onClose }) {
  const { login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const ok = login(password)
    if (ok) {
      onClose()
    } else {
      setError('비밀번호가 올바르지 않습니다.')
      setPassword('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
        <h2 className="text-lg font-bold mb-4 text-center">편집 모드</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            className="input text-center text-xl tracking-widest"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={!password} className="btn-primary flex-1">
              확인
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
