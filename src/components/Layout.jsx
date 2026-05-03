import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import LoginModal from './LoginModal'

const navItems = [
  { to: '/', label: '재무제표', icon: '📊' },
  { to: '/ledger', label: '가계부', icon: '📒' },
  { to: '/loan', label: '원리금 분석', icon: '🏠' },
]

export default function Layout() {
  const { canEdit, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary-600">웅마웅두</span>
            <span className="text-gray-400 text-sm hidden sm:block">가계부</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-1">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {canEdit ? (
              <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                로그아웃
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} className="btn-primary text-sm py-1.5">
                편집 모드
              </button>
            )}
            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMenuOpen(v => !v)}
            >
              <span className="text-xl">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="sm:hidden border-t border-gray-100 bg-white">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600'
                  }`
                }
              >
                <span>{item.icon}</span> {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Edit mode banner */}
      {canEdit && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-center py-1.5 text-xs text-emerald-700 font-medium">
          ✏️ 편집 모드 활성화 — 변경사항이 GitHub에 자동 저장됩니다
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav for mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sm:hidden h-16" />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
