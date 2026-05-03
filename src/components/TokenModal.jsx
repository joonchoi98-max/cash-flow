import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { verifyWriteToken } from '../utils/github'

export default function TokenModal() {
  const { resolveToken, cancelToken } = useAuth()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')
    const ok = await verifyWriteToken(token.trim())
    setLoading(false)
    if (ok) {
      resolveToken(token.trim())
    } else {
      setError('토큰이 유효하지 않거나 쓰기 권한이 없습니다.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">데이터 저장 설정</h2>
        <p className="text-sm text-gray-500 mb-1">GitHub에 저장하려면 토큰이 필요합니다.</p>
        <p className="text-xs text-gray-400 mb-4">
          한 번 입력하면 이 기기에서는 다시 묻지 않습니다.<br />
          <span className="text-blue-400">github.com/settings/tokens</span> → Fine-grained token<br />
          → cash-flow 레포 → Contents: Read and write
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
            <button type="submit" disabled={loading || !token} className="btn-primary flex-1">
              {loading ? '확인 중...' : '저장'}
            </button>
            <button type="button" onClick={cancelToken} className="btn-secondary">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
