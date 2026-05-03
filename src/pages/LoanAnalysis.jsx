import { useState, useEffect } from 'react'
import { fetchFile, saveFile } from '../utils/github'
import { useAuth } from '../contexts/AuthContext'
import { formatWon, formatWonShort } from '../utils/format'
import { buildRepaymentSchedule, buildEquitySchedule, calcMonthlyPayment } from '../utils/loan'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const DEFAULT_SCENARIO = {
  id: '1',
  name: '새 시나리오',
  createdAt: new Date().toISOString().slice(0,10),
  loans: [
    { id: 'l1', name: '주택담보대출', principal: 540000000, annualRate: 0.045, termYears: 30, startYear: 2026, type: 'annuity' }
  ],
  annualIncomes: Array.from({length:8},(_,i)=>({ year:2026+i, amount:0 })),
  monthlyLivingCost: 350000,
  initialEquity: 0,
}

export default function LoanAnalysis() {
  const { token, canEdit } = useAuth()
  const [scenarios, setScenarios] = useState([])
  const [sha, setSha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const result = await fetchFile('data/loan-scenarios.json', token)
      if (result) {
        setScenarios(result.data.scenarios)
        setSha(result.sha)
        setActiveId(result.data.scenarios[0]?.id || null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function persist(newScenarios) {
    setSaving(true)
    try {
      const newSha = await saveFile('data/loan-scenarios.json', { scenarios: newScenarios }, sha, token, 'Update loan scenarios')
      setSha(newSha)
      setScenarios(newScenarios)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(scenario) {
    setDraft(JSON.parse(JSON.stringify(scenario)))
    setEditMode(true)
  }

  function saveEdit() {
    const updated = scenarios.map(s => s.id === draft.id ? draft : s)
    persist(updated)
    setEditMode(false)
    setDraft(null)
  }

  function addScenario() {
    const id = Math.random().toString(36).slice(2,9)
    const s = { ...DEFAULT_SCENARIO, id, name: `시나리오 ${scenarios.length+1}` }
    startEdit(s)
    setScenarios(v => [...v, s])
    setActiveId(id)
  }

  function deleteScenario(id) {
    const updated = scenarios.filter(s => s.id !== id)
    persist(updated)
    setActiveId(updated[0]?.id || null)
  }

  const active = scenarios.find(s => s.id === activeId)
  const scenario = editMode && draft?.id === activeId ? draft : active

  // 계산
  const schedule = scenario ? buildRepaymentSchedule(scenario.loans, scenario.loans[0]?.startYear || 2026, 8) : []
  const equity = scenario ? buildEquitySchedule(scenario.loans, schedule, scenario.initialEquity, scenario.annualIncomes, scenario.monthlyLivingCost, scenario.loans[0]?.startYear || 2026) : []

  const chartData = schedule.map((row, i) => ({
    year: `${row.year}`,
    원금상환: row.totalPrincipal,
    이자상환: row.totalInterest,
    수입: equity[i]?.income || 0,
    저축가능액: Math.max(0, equity[i]?.savings || 0),
    자기자본: equity[i]?.equity || 0,
  }))

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">원리금 상환 분석</h1>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={addScenario} className="btn-secondary text-sm">+ 시나리오 추가</button>
          )}
        </div>
      </div>

      {/* Scenario tabs */}
      {scenarios.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveId(s.id); setEditMode(false) }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeId===s.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">불러오는 중...</div>
      ) : !scenario ? (
        <div className="text-center py-16 text-gray-400">시나리오가 없습니다.</div>
      ) : (
        <>
          {/* Scenario header */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              {editMode && draft?.id === activeId ? (
                <input
                  className="input text-lg font-bold w-48"
                  value={draft.name}
                  onChange={e => setDraft(v => ({...v, name: e.target.value}))}
                />
              ) : (
                <h2 className="text-lg font-bold">{scenario.name}</h2>
              )}
              {canEdit && (
                editMode && draft?.id === activeId ? (
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm">
                      {saving ? '저장 중...' : '저장'}
                    </button>
                    <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">취소</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(scenario)} className="btn-secondary text-sm">편집</button>
                    {scenarios.length > 1 && (
                      <button onClick={() => deleteScenario(scenario.id)} className="btn-danger text-sm">삭제</button>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Loans */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">대출 현황</p>
              {(editMode && draft?.id === activeId ? draft : scenario).loans.map((loan, li) => (
                <LoanRow
                  key={loan.id}
                  loan={loan}
                  editMode={editMode && draft?.id === activeId}
                  onChange={updated => setDraft(d => ({ ...d, loans: d.loans.map((l,i)=>i===li?{...l,...updated}:l) }))}
                  onDelete={() => setDraft(d => ({ ...d, loans: d.loans.filter((_,i)=>i!==li) }))}
                />
              ))}
              {editMode && draft?.id === activeId && (
                <button
                  onClick={() => setDraft(d => ({ ...d, loans: [...d.loans, { id: Math.random().toString(36).slice(2,7), name: '대출', principal: 0, annualRate: 0.05, termYears: 10, startYear: 2026, type: 'annuity' }] }))}
                  className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:bg-gray-50"
                >
                  + 대출 추가
                </button>
              )}
            </div>

            {/* Basic settings */}
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">초기 자기자본</label>
                {editMode && draft?.id === activeId ? (
                  <input type="number" className="input text-sm" value={draft.initialEquity}
                    onChange={e => setDraft(d=>({...d,initialEquity:Number(e.target.value)}))} />
                ) : (
                  <p className="text-sm font-medium py-2">{formatWon(scenario.initialEquity)}</p>
                )}
              </div>
              <div>
                <label className="label">월 생활비</label>
                {editMode && draft?.id === activeId ? (
                  <input type="number" className="input text-sm" value={draft.monthlyLivingCost}
                    onChange={e => setDraft(d=>({...d,monthlyLivingCost:Number(e.target.value)}))} />
                ) : (
                  <p className="text-sm font-medium py-2">{formatWon(scenario.monthlyLivingCost)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Annual income input */}
          {editMode && draft?.id === activeId && (
            <div className="card">
              <h3 className="font-bold text-sm mb-3">연도별 수입 설정</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {draft.annualIncomes.map((inc, i) => (
                  <div key={inc.year}>
                    <label className="label">{inc.year}년</label>
                    <input
                      type="number"
                      className="input text-sm"
                      value={inc.amount}
                      onChange={e => setDraft(d => ({
                        ...d,
                        annualIncomes: d.annualIncomes.map((v,j)=>j===i?{...v,amount:Number(e.target.value)}:v)
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results table */}
          <div className="card overflow-x-auto">
            <h3 className="font-bold text-sm mb-3">연도별 상환 계획</h3>
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2">연도</th>
                  <th className="text-right py-2">연수입</th>
                  <th className="text-right py-2">원리금 총계</th>
                  <th className="text-right py-2">상환 후 가용</th>
                  <th className="text-right py-2">저축 예상</th>
                  <th className="text-right py-2">자기자본</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => {
                  const eq = equity[i] || {}
                  return (
                    <tr key={row.year} className="border-b border-gray-50">
                      <td className="py-2 font-medium">{row.year}</td>
                      <td className="text-right py-2 text-emerald-600">{formatWonShort(eq.income)}</td>
                      <td className="text-right py-2 text-red-500">{formatWonShort(row.totalRepayment)}</td>
                      <td className={`text-right py-2 font-medium ${eq.afterRepayment >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
                        {formatWonShort(eq.afterRepayment)}
                      </td>
                      <td className={`text-right py-2 font-medium ${eq.savings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatWonShort(eq.savings)}
                      </td>
                      <td className="text-right py-2 text-primary-600 font-bold">{formatWonShort(eq.equity)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Monthly payment summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {scenario.loans.map(loan => {
              const monthly = calcMonthlyPayment(loan.principal, loan.annualRate, loan.termYears)
              return (
                <div key={loan.id} className="card text-center">
                  <p className="text-xs text-gray-400 mb-1">{loan.name}</p>
                  <p className="font-bold text-primary-600">{formatWon(Math.round(monthly))}<span className="text-xs text-gray-400">/월</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{(loan.annualRate*100).toFixed(2)}% · {loan.termYears}년</p>
                </div>
              )
            })}
          </div>

          {/* Charts */}
          <div className="card">
            <h3 className="font-bold text-sm mb-4">연도별 원리금 상환 내역</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => formatWonShort(v)} tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v, name) => [formatWon(v), name]} />
                <Legend />
                <Bar dataKey="원금상환" stackId="a" fill="#3b82f6" radius={[0,0,4,4]} />
                <Bar dataKey="이자상환" stackId="a" fill="#93c5fd" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-bold text-sm mb-4">자기자본 성장 추이</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => formatWonShort(v)} tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v, name) => [formatWon(v), name]} />
                <Legend />
                <Line type="monotone" dataKey="자기자본" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="저축가능액" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

function LoanRow({ loan, editMode, onChange, onDelete }) {
  if (!editMode) {
    const monthly = calcMonthlyPayment(loan.principal, loan.annualRate, loan.termYears)
    return (
      <div className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
        <div>
          <span className="font-medium text-gray-700">{loan.name}</span>
          <span className="text-xs text-gray-400 ml-2">{(loan.annualRate*100).toFixed(2)}% · {loan.termYears}년</span>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-700">{formatWon(loan.principal)}</p>
          <p className="text-xs text-gray-400">월 {formatWon(Math.round(monthly))}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex gap-2">
        <input className="input text-sm flex-1" placeholder="대출명" value={loan.name} onChange={e=>onChange({name:e.target.value})} />
        <button onClick={onDelete} className="text-red-400 hover:text-red-600 text-sm px-2">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">대출 원금</label>
          <input type="number" className="input text-sm" value={loan.principal} onChange={e=>onChange({principal:Number(e.target.value)})} />
        </div>
        <div>
          <label className="label">연이율 (%)</label>
          <input type="number" className="input text-sm" step="0.01" value={(loan.annualRate*100).toFixed(2)}
            onChange={e=>onChange({annualRate:Number(e.target.value)/100})} />
        </div>
        <div>
          <label className="label">기간 (년)</label>
          <input type="number" className="input text-sm" value={loan.termYears} onChange={e=>onChange({termYears:Number(e.target.value)})} />
        </div>
        <div>
          <label className="label">시작 연도</label>
          <input type="number" className="input text-sm" value={loan.startYear} onChange={e=>onChange({startYear:Number(e.target.value)})} />
        </div>
      </div>
    </div>
  )
}
