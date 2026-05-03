import { useState, useEffect } from 'react'
import { fetchFile, saveFile } from '../utils/github'
import { useAuth } from '../contexts/AuthContext'
import { formatWon } from '../utils/format'
import settings from '../../data/settings.json'

const YEARS = [2025, 2026, 2027]

export default function FinancialStatement() {
  const { canEdit } = useAuth()
  const [year, setYear] = useState(2026)
  const [bs, setBs] = useState(null)
  const [bsSha, setBsSha] = useState(null)
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview') // 'overview' | 'edit'

  useEffect(() => { load() }, [year])

  async function load() {
    setLoading(true)
    try {
      const bsResult = await fetchFile(`data/${year}/balance-sheet.json`)
      if (bsResult) { setBs(bsResult.data); setBsSha(bsResult.sha) }
      else setBs({ year, assets: [], liabilities: [] })

      const monthly = []
      for (let m = 1; m <= 12; m++) {
        const r = await fetchFile(`data/${year}/${String(m).padStart(2, '0')}.json`)
        if (r) {
          const totalIncome = r.data.incomes.reduce((s, i) => s + i.amount, 0)
          const totalExpense = r.data.expenses.reduce((s, e) => s + e.amount, 0)
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

  const totalAssets = bs?.assets.reduce((s, a) => s + a.amount, 0) || 0
  const totalLiabilities = bs?.liabilities.reduce((s, l) => s + l.amount, 0) || 0
  const totalEquity = totalAssets - totalLiabilities
  const activeMonths = monthlyData.filter(m => m.income !== null)
  const ytdIncome = activeMonths.reduce((s, m) => s + m.income, 0)
  const ytdExpense = activeMonths.reduce((s, m) => s + m.expense, 0)
  const ytdNI = ytdIncome - ytdExpense
  const endEquity = totalEquity + ytdNI

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">재무제표</h1>
        <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-28">
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          개요
        </button>
        <button
          onClick={() => setTab('edit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'edit' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          기초잔액 수정
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">불러오는 중...</div>
      ) : tab === 'overview' ? (
        <OverviewTab
          year={year}
          bs={bs}
          monthlyData={monthlyData}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
          totalEquity={totalEquity}
          ytdIncome={ytdIncome}
          ytdExpense={ytdExpense}
          ytdNI={ytdNI}
          endEquity={endEquity}
        />
      ) : (
        <EditBalanceSheet
          year={year}
          bs={bs}
          bsSha={bsSha}
          canEdit={canEdit}
          onSaved={(updated, sha) => { setBs(updated); setBsSha(sha) }}
        />
      )}
    </div>
  )
}

function OverviewTab({ year, bs, monthlyData, totalAssets, totalLiabilities, totalEquity, ytdIncome, ytdExpense, ytdNI, endEquity }) {
  return (
    <div className="space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="기초 총자산" value={totalAssets} color="blue" />
        <SummaryCard label="연간 순이익" value={ytdNI} color={ytdNI >= 0 ? 'green' : 'red'} />
        <SummaryCard label="부채" value={totalLiabilities} color="red" sign="-" />
        <SummaryCard label="기말 순자산" value={endEquity} color="blue" />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* 기초 재무상태표 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700">기초 재무상태표</h2>
            <span className="text-xs text-gray-400">{year}.1.1 기준</span>
          </div>
          <p className="text-xs font-semibold text-gray-400 mb-2">자산</p>
          {settings.assetCategories.map(cat => {
            const entry = bs?.assets.find(a => a.categoryId === cat.id)
            return (
              <div key={cat.id} className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{cat.label}</span>
                <span className="font-medium">{entry ? formatWon(entry.amount) : '-'}</span>
              </div>
            )
          })}
          <div className="flex justify-between font-bold pt-2 mt-1 border-t">
            <span>자산 합계</span>
            <span className="text-primary-600">{formatWon(totalAssets)}</span>
          </div>
        </div>

        {/* 월별 손익 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700">월별 손익계산서</h2>
            <span className="text-xs text-gray-400">{year}년</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b">
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
                  <td className="text-right py-1.5 text-emerald-600">{m.income !== null ? formatWon(m.income) : '-'}</td>
                  <td className="text-right py-1.5 text-red-500">{m.expense !== null ? formatWon(m.expense) : '-'}</td>
                  <td className={`text-right py-1.5 font-medium ${m.ni >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {m.ni !== null ? formatWon(m.ni) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t-2">
                <td className="pt-2">합계</td>
                <td className="text-right pt-2 text-emerald-600">{formatWon(ytdIncome)}</td>
                <td className="text-right pt-2 text-red-500">{formatWon(ytdExpense)}</td>
                <td className={`text-right pt-2 ${ytdNI >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatWon(ytdNI)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 기말 재무상태표 */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-3">기말 재무상태표 (기초 + 당기순이익)</h2>
        <div className="grid sm:grid-cols-3 gap-3">
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
    </div>
  )
}

function EditBalanceSheet({ year, bs, bsSha, canEdit, onSaved }) {
  const [draft, setDraft] = useState(() => initDraft(bs))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setDraft(initDraft(bs)) }, [bs])

  function initDraft(bs) {
    const assetMap = {}
    bs?.assets.forEach(a => { assetMap[a.categoryId] = a })
    return {
      assets: settings.assetCategories.map(cat => ({
        categoryId: cat.id,
        amount: assetMap[cat.id]?.amount ?? 0,
        note: assetMap[cat.id]?.note ?? '',
      })),
      liabilities: settings.liabilityCategories.map(cat => {
        const entry = bs?.liabilities?.find(l => l.categoryId === cat.id)
        return { categoryId: cat.id, amount: entry?.amount ?? 0, note: entry?.note ?? '' }
      }),
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = { year, assets: draft.assets.filter(a => a.amount > 0 || a.note), liabilities: draft.liabilities.filter(l => l.amount > 0 || l.note) }
      const newSha = await saveFile(`data/${year}/balance-sheet.json`, updated, bsSha, `Update ${year} balance sheet`)
      onSaved(updated, newSha)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <div className="card text-center py-10 text-gray-400">
        <p className="text-2xl mb-2">🔒</p>
        <p className="text-sm">편집 모드로 로그인하면 수정할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-3">자산 항목</h3>
        <div className="space-y-3">
          {settings.assetCategories.map((cat, i) => (
            <div key={cat.id}>
              <label className="label">{cat.label}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input text-sm"
                  placeholder="금액"
                  value={draft.assets[i]?.amount || ''}
                  onChange={e => setDraft(d => {
                    const assets = [...d.assets]
                    assets[i] = { ...assets[i], amount: Number(e.target.value) }
                    return { ...d, assets }
                  })}
                />
                <input
                  type="text"
                  className="input text-sm w-40"
                  placeholder="메모"
                  value={draft.assets[i]?.note || ''}
                  onChange={e => setDraft(d => {
                    const assets = [...d.assets]
                    assets[i] = { ...assets[i], note: e.target.value }
                    return { ...d, assets }
                  })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-gray-700 mb-3">부채 항목</h3>
        <div className="space-y-3">
          {settings.liabilityCategories.map((cat, i) => (
            <div key={cat.id}>
              <label className="label">{cat.label}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input text-sm"
                  placeholder="금액"
                  value={draft.liabilities[i]?.amount || ''}
                  onChange={e => setDraft(d => {
                    const liabilities = [...d.liabilities]
                    liabilities[i] = { ...liabilities[i], amount: Number(e.target.value) }
                    return { ...d, liabilities }
                  })}
                />
                <input
                  type="text"
                  className="input text-sm w-40"
                  placeholder="메모"
                  value={draft.liabilities[i]?.note || ''}
                  onChange={e => setDraft(d => {
                    const liabilities = [...d.liabilities]
                    liabilities[i] = { ...liabilities[i], note: e.target.value }
                    return { ...d, liabilities }
                  })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3">
        {saving ? '저장 중...' : saved ? '✓ 저장 완료' : '전체 저장'}
      </button>
    </div>
  )
}

function SummaryCard({ label, value, color, sign }) {
  const colors = { blue: 'text-primary-600', green: 'text-emerald-600', red: 'text-red-500' }
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-bold leading-tight ${colors[color] || 'text-gray-700'}`}>
        {sign === '-' ? '-' : ''}{formatWon(value)}
      </p>
    </div>
  )
}
