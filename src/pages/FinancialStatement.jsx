import { useState, useEffect } from 'react'
import { fetchFile, saveFile } from '../utils/github'
import { useAuth } from '../contexts/AuthContext'
import { formatWon } from '../utils/format'
import settings from '../../data/settings.json'

const YEARS = [2025, 2026, 2027]
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export default function FinancialStatement() {
  const { token, canEdit } = useAuth()
  const [year, setYear] = useState(2026)
  const [bs, setBs] = useState(null)
  const [bsSha, setBsSha] = useState(null)
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editAsset, setEditAsset] = useState(null)

  useEffect(() => { load() }, [year])

  async function load() {
    setLoading(true)
    try {
      // 재무상태표 로드
      const bsResult = await fetchFile(`data/${year}/balance-sheet.json`, token)
      if (bsResult) { setBs(bsResult.data); setBsSha(bsResult.sha) }
      else setBs({ year, assets: [], liabilities: [] })

      // 월별 손익 로드
      const monthly = []
      for (let m = 1; m <= 12; m++) {
        const r = await fetchFile(`data/${year}/${String(m).padStart(2,'0')}.json`, token)
        if (r) {
          const { incomes, expenses } = r.data
          const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
          const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
          monthly.push({ month: m, income: totalIncome, expense: totalExpense, ni: totalIncome - totalExpense })
        } else {
          monthly.push({ month: m, income: null, expense: null, ni: null })
        }
      }
      setMonthlyData(monthly)
    } finally {
      setLoading(false)
    }
  }

  async function saveAsset(categoryId, amount, note) {
    if (!canEdit) return
    setSaving(true)
    try {
      const updated = { ...bs }
      const idx = updated.assets.findIndex(a => a.categoryId === categoryId)
      if (idx >= 0) {
        updated.assets[idx] = { categoryId, amount: Number(amount), note }
      } else {
        updated.assets.push({ categoryId, amount: Number(amount), note })
      }
      const newSha = await saveFile(`data/${year}/balance-sheet.json`, updated, bsSha, token, `Update ${year} balance sheet`)
      setBs(updated)
      setBsSha(newSha)
      setEditAsset(null)
    } finally {
      setSaving(false)
    }
  }

  const totalAssets = bs ? bs.assets.reduce((s, a) => s + a.amount, 0) : 0
  const totalLiabilities = bs ? bs.liabilities.reduce((s, l) => s + l.amount, 0) : 0
  const totalEquity = totalAssets - totalLiabilities

  const activeMonths = monthlyData.filter(m => m.income !== null)
  const ytdIncome = activeMonths.reduce((s, m) => s + m.income, 0)
  const ytdExpense = activeMonths.reduce((s, m) => s + m.expense, 0)
  const ytdNI = ytdIncome - ytdExpense
  const endEquity = totalEquity + ytdNI

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">재무제표</h1>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="input w-28"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">불러오는 중...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="기초 총자산" value={totalAssets} color="blue" />
            <SummaryCard label="연간 순이익" value={ytdNI} color={ytdNI >= 0 ? 'green' : 'red'} />
            <SummaryCard label="부채" value={-totalLiabilities} color="red" />
            <SummaryCard label="기말 순자산" value={endEquity} color="blue" />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* 기초 재무상태표 */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-700">기초 재무상태표</h2>
                <span className="text-xs text-gray-400">{year}.1.1 기준</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">자산</p>
                {settings.assetCategories.map(cat => {
                  const entry = bs?.assets.find(a => a.categoryId === cat.id)
                  const isEditing = editAsset?.categoryId === cat.id
                  return (
                    <AssetRow
                      key={cat.id}
                      cat={cat}
                      entry={entry}
                      isEditing={isEditing}
                      canEdit={canEdit}
                      saving={saving}
                      onEdit={() => setEditAsset({ categoryId: cat.id, amount: entry?.amount || 0, note: entry?.note || '' })}
                      onCancel={() => setEditAsset(null)}
                      onSave={(amount, note) => saveAsset(cat.id, amount, note)}
                      editAsset={editAsset}
                      setEditAsset={setEditAsset}
                    />
                  )
                })}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>자산 합계</span>
                  <span className="text-primary-600">{formatWon(totalAssets)}</span>
                </div>
              </div>
            </div>

            {/* 월별 손익 집계 */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-700">월별 손익계산서</h2>
                <span className="text-xs text-gray-400">{year}년 집계</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left py-1">월</th>
                      <th className="text-right py-1">수입</th>
                      <th className="text-right py-1">지출</th>
                      <th className="text-right py-1">순이익</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map(m => (
                      <tr key={m.month} className={`border-b border-gray-50 ${m.income === null ? 'opacity-30' : ''}`}>
                        <td className="py-1.5 text-gray-600">{m.month}월</td>
                        <td className="text-right py-1.5 text-emerald-600">
                          {m.income !== null ? formatWon(m.income) : '-'}
                        </td>
                        <td className="text-right py-1.5 text-red-500">
                          {m.expense !== null ? formatWon(m.expense) : '-'}
                        </td>
                        <td className={`text-right py-1.5 font-medium ${m.ni >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {m.ni !== null ? formatWon(m.ni) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-sm border-t-2">
                      <td className="pt-2">합계</td>
                      <td className="text-right pt-2 text-emerald-600">{formatWon(ytdIncome)}</td>
                      <td className="text-right pt-2 text-red-500">{formatWon(ytdExpense)}</td>
                      <td className={`text-right pt-2 ${ytdNI >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatWon(ytdNI)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* 기말 재무상태표 */}
          <div className="card">
            <h2 className="font-bold text-gray-700 mb-3">기말 재무상태표 (기초 + 당기순이익)</h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-500 font-medium mb-1">기초 순자산</p>
                <p className="text-lg font-bold text-blue-700">{formatWon(totalEquity)}</p>
              </div>
              <div className={`rounded-lg p-3 ${ytdNI >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className={`text-xs font-medium mb-1 ${ytdNI >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>당기순이익</p>
                <p className={`text-lg font-bold ${ytdNI >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatWon(ytdNI)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">기말 순자산</p>
                <p className="text-lg font-bold text-gray-700">{formatWon(endEquity)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  const colors = {
    blue: 'text-primary-600',
    green: 'text-emerald-600',
    red: 'text-red-500',
  }
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-bold ${colors[color] || 'text-gray-700'} leading-tight`}>
        {formatWon(value)}
      </p>
    </div>
  )
}

function AssetRow({ cat, entry, isEditing, canEdit, saving, onEdit, onCancel, onSave, editAsset, setEditAsset }) {
  if (isEditing) {
    return (
      <div className="bg-blue-50 rounded-lg p-2 space-y-1">
        <p className="text-xs font-medium text-blue-700">{cat.label}</p>
        <input
          type="number"
          className="input text-sm"
          value={editAsset.amount}
          onChange={e => setEditAsset(v => ({ ...v, amount: e.target.value }))}
          placeholder="금액"
        />
        <input
          type="text"
          className="input text-sm"
          value={editAsset.note}
          onChange={e => setEditAsset(v => ({ ...v, note: e.target.value }))}
          placeholder="메모"
        />
        <div className="flex gap-1">
          <button onClick={() => onSave(editAsset.amount, editAsset.note)} disabled={saving} className="btn-primary text-xs py-1 flex-1">
            {saving ? '저장 중...' : '저장'}
          </button>
          <button onClick={onCancel} className="btn-secondary text-xs py-1">취소</button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-1 group">
      <div>
        <span className="text-sm text-gray-700">{cat.label}</span>
        {entry?.note && <span className="text-xs text-gray-400 ml-1">({entry.note})</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{entry ? formatWon(entry.amount) : '-'}</span>
        {canEdit && (
          <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 text-xs text-primary-500 hover:underline">
            편집
          </button>
        )}
      </div>
    </div>
  )
}
