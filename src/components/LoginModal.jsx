import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginModal({ onClose }) {
  const { login } = useAuth()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    const ok = await login(token.trim())
    setLoading(false)
    if (ok) {
      onClose()
    } else {
      setError('토큰이 유효하지 않거나 쓰기 권한이 없습니다.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">편집 모드 로그인</h2>
        <p className="text-sm text-gray-500 mb-4">
          GitHub Personal Access Token을 입력하세요.
          <br />
          <span className="text-xs">Settings → Developer settings → Personal access tokens → Fine-grained tokens</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            className="input"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={token}
            onChange={e => setToken(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? '확인 중...' : '로그인'}
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
