import { useState, useEffect, useRef } from 'react'
import { fetchFile, saveFile } from '../utils/github'
import { useAuth } from '../contexts/AuthContext'
import { formatWon } from '../utils/format'
import settings from '../../data/settings.json'

const YEARS = [2025, 2026, 2027]

function newId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function MonthlyLedger() {
  const { canEdit, requireToken } = useAuth()
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState(null)
  const [sha, setSha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [year, month])

  async function load() {
    setLoading(true)
    setError(null)
    const path = `data/${year}/${String(month).padStart(2, '0')}.json`
    try {
      const result = await fetchFile(path)
      if (result) { setData(result.data); setSha(result.sha) }
      else { setData({ year, month, incomes: [], expenses: [] }); setSha(null) }
    } catch (e) {
      setError(e.message || '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function persist(newData) {
    if (!canEdit) return
    setSaving(true)
    const path = `data/${year}/${String(month).padStart(2, '00')}.json`
    try {
      const token = await requireToken()
      const newSha = await saveFile(path, newData, sha, token, `Update ${year}-${month} ledger`)
      setSha(newSha)
      setData(newData)
    } catch {
      // cancelled
    } finally {
      setSaving(false)
    }
  }

  function addItem(type, item) {
    const newData = { ...data }
    if (type === 'income') newData.incomes = [...(data.incomes || []), { id: newId(), ...item }]
    else newData.expenses = [...(data.expenses || []), { id: newId(), ...item }]
    persist(newData)
  }

  function deleteItem(type, id) {
    const newData = { ...data }
    if (type === 'income') newData.incomes = data.incomes.filter(i => i.id !== id)
    else newData.expenses = data.expenses.filter(i => i.id !== id)
    persist(newData)
  }

  function updateItem(type, id, fields) {
    const newData = { ...data }
    if (type === 'income') newData.incomes = data.incomes.map(i => i.id === id ? { ...i, ...fields } : i)
    else newData.expenses = data.expenses.map(i => i.id === id ? { ...i, ...fields } : i)
    persist(newData)
  }

  const totalIncome = data?.incomes?.reduce((s, i) => s + i.amount, 0) || 0
  const totalExpense = data?.expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const ni = totalIncome - totalExpense

  return (
    <div className="space-y-4 pb-20 sm:pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold">월별 가계부</h1>
        <div className="flex gap-2 ml-auto">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-24 py-1.5 text-sm">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input w-20 py-1.5 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
      </div>

      {/* NI 요약 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center py-2">
          <p className="text-xs text-gray-400 mb-0.5">총수입</p>
          <p className="font-bold text-emerald-600 text-sm">{formatWon(totalIncome)}</p>
        </div>
        <div className="card text-center py-2">
          <p className="text-xs text-gray-400 mb-0.5">총지출</p>
          <p className="font-bold text-red-500 text-sm">{formatWon(totalExpense)}</p>
        </div>
        <div className="card text-center py-2">
          <p className="text-xs text-gray-400 mb-0.5">순이익</p>
          <p className={`font-bold text-sm ${ni >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatWon(ni)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin mb-2" />
          <p>불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="card text-center py-10 text-red-500">
          <p className="font-medium mb-2">데이터 로딩 실패</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={load} className="btn-primary text-sm">다시 시도</button>
        </div>
      ) : (
        /* 3분할 레이아웃 */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 수입 */}
          <LedgerColumn
            title="수입"
            accentColor="emerald"
            items={data?.incomes || []}
            categories={settings.incomeCategories}
            type="income"
            canEdit={canEdit}
            saving={saving}
            onAdd={item => addItem('income', item)}
            onDelete={id => deleteItem('income', id)}
            onUpdate={(id, fields) => updateItem('income', id, fields)}
          />

          {/* 지출 */}
          <LedgerColumn
            title="지출"
            accentColor="red"
            items={data?.expenses || []}
            categories={settings.expenseCategories}
            type="expense"
            canEdit={canEdit}
            saving={saving}
            onAdd={item => addItem('expense', item)}
            onDelete={id => deleteItem('expense', id)}
            onUpdate={(id, fields) => updateItem('expense', id, fields)}
          />

          {/* 집계 */}
          <SummaryColumn
            incomes={data?.incomes || []}
            expenses={data?.expenses || []}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            ni={ni}
          />
        </div>
      )}
    </div>
  )
}

function LedgerColumn({ title, accentColor, items, categories, type, canEdit, saving, onAdd, onDelete, onUpdate }) {
  const [editId, setEditId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ categoryId: '', amount: '', note: '' })
  const amountRef = useRef(null)

  const isIncome = type === 'income'
  const textColor = isIncome ? 'text-emerald-600' : 'text-red-500'
  const borderColor = isIncome ? 'border-emerald-400' : 'border-red-400'
  const bgAdd = isIncome ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
  const btnAdd = isIncome ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : 'border-red-200 text-red-400 hover:bg-red-50'

  function handleAddSubmit(e) {
    e.preventDefault()
    if (!addForm.categoryId || !addForm.amount) return
    onAdd({ categoryId: addForm.categoryId, amount: Number(addForm.amount), note: addForm.note })
    setAddForm({ categoryId: '', amount: '', note: '' })
    setAddOpen(false)
  }

  const total = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="card flex flex-col min-h-0">
      {/* 컬럼 헤더 */}
      <div className={`flex items-center justify-between pb-2 mb-2 border-b-2 ${borderColor}`}>
        <h3 className={`font-bold ${textColor}`}>{title}</h3>
        <span className={`text-sm font-semibold ${textColor}`}>{formatWon(total)}</span>
      </div>

      {/* 항목 테이블 헤더 */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-1 text-xs text-gray-400 px-1 mb-1">
        <span>항목</span>
        <span className="text-right w-24">금액</span>
        {canEdit && <span className="w-8" />}
      </div>

      {/* 항목 목록 */}
      <div className="flex-1 space-y-0.5 overflow-y-auto max-h-96">
        {items.length === 0 && !addOpen && (
          <p className="text-center text-gray-300 text-sm py-6">항목 없음</p>
        )}
        {items.map(item => {
          const cat = categories.find(c => c.id === item.categoryId)
          if (editId === item.id) {
            return (
              <EditRow
                key={item.id}
                item={item}
                categories={categories}
                saving={saving}
                onSave={fields => { onUpdate(item.id, fields); setEditId(null) }}
                onCancel={() => setEditId(null)}
              />
            )
          }
          return (
            <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-1 items-center px-1 py-1.5 rounded hover:bg-gray-50 group text-sm">
              <div className="min-w-0">
                <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 mr-1 whitespace-nowrap">{cat?.label || item.categoryId}</span>
                {item.note && <span className="text-xs text-gray-400 truncate">{item.note}</span>}
              </div>
              <span className={`font-medium text-sm text-right w-24 ${textColor}`}>{formatWon(item.amount)}</span>
              {canEdit && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 w-8 justify-end">
                  <button onClick={() => setEditId(item.id)} className="text-blue-400 hover:text-blue-600 text-xs">✎</button>
                  <button onClick={() => onDelete(item.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 추가 폼 */}
      {canEdit && (
        addOpen ? (
          <form onSubmit={handleAddSubmit} className={`mt-2 pt-2 border-t border-dashed ${isIncome ? 'border-emerald-200' : 'border-red-200'} space-y-1.5`}>
            <select
              className="input text-sm py-1.5"
              value={addForm.categoryId}
              onChange={e => { setAddForm(v => ({ ...v, categoryId: e.target.value })); setTimeout(() => amountRef.current?.focus(), 50) }}
              autoFocus
            >
              <option value="">카테고리 선택</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <div className="flex gap-1">
              <input
                ref={amountRef}
                type="number"
                className="input text-sm py-1.5 flex-1"
                placeholder="금액"
                value={addForm.amount}
                onChange={e => setAddForm(v => ({ ...v, amount: e.target.value }))}
              />
              <input
                type="text"
                className="input text-sm py-1.5 flex-1"
                placeholder="메모"
                value={addForm.note}
                onChange={e => setAddForm(v => ({ ...v, note: e.target.value }))}
              />
            </div>
            <div className="flex gap-1">
              <button
                type="submit"
                disabled={saving || !addForm.categoryId || !addForm.amount}
                className="btn-primary flex-1 text-sm py-1.5"
              >
                {saving ? '저장 중...' : '추가'}
              </button>
              <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary text-sm py-1.5 px-3">취소</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddOpen(true)}
            className={`mt-2 w-full py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors ${btnAdd}`}
          >
            + {title} 추가
          </button>
        )
      )}
    </div>
  )
}

function EditRow({ item, categories, saving, onSave, onCancel }) {
  const [categoryId, setCategoryId] = useState(item.categoryId)
  const [amount, setAmount] = useState(item.amount)
  const [note, setNote] = useState(item.note)
  return (
    <div className="bg-blue-50 rounded p-2 space-y-1 text-sm">
      <select className="input text-sm py-1" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <div className="flex gap-1">
        <input type="number" className="input text-sm py-1 flex-1" value={amount} onChange={e => setAmount(Number(e.target.value))} />
        <input type="text" className="input text-sm py-1 flex-1" value={note} onChange={e => setNote(e.target.value)} placeholder="메모" />
      </div>
      <div className="flex gap-1">
        <button onClick={() => onSave({ categoryId, amount: Number(amount), note })} disabled={saving} className="btn-primary flex-1 text-xs py-1">저장</button>
        <button onClick={onCancel} className="btn-secondary text-xs py-1 px-2">취소</button>
      </div>
    </div>
  )
}

function SummaryColumn({ incomes, expenses, totalIncome, totalExpense, ni }) {
  const expenseByGroup = {}
  expenses.forEach(e => {
    const cat = settings.expenseCategories.find(c => c.id === e.categoryId)
    const group = cat?.group || '기타'
    expenseByGroup[group] = (expenseByGroup[group] || 0) + e.amount
  })

  const incomeByPerson = {}
  incomes.forEach(i => {
    const cat = settings.incomeCategories.find(c => c.id === i.categoryId)
    const person = cat?.person || '기타'
    incomeByPerson[person] = (incomeByPerson[person] || 0) + i.amount
  })

  return (
    <div className="card space-y-4">
      <div className={`pb-2 border-b-2 border-gray-300`}>
        <h3 className="font-bold text-gray-700">집계</h3>
      </div>

      {/* 순이익 */}
      <div className={`rounded-lg p-3 ${ni >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <p className={`text-xs font-medium mb-1 ${ni >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>당기순이익</p>
        <p className={`text-xl font-bold ${ni >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatWon(ni)}</p>
      </div>

      {/* 수입 인별 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-1.5">수입 인별</p>
        {Object.entries(incomeByPerson).map(([person, amt]) => (
          <div key={person} className="flex justify-between py-1 text-sm border-b border-gray-50 last:border-0">
            <span className="text-gray-600">{person}</span>
            <span className="font-medium text-emerald-600">{formatWon(amt)}</span>
          </div>
        ))}
        {Object.keys(incomeByPerson).length === 0 && <p className="text-xs text-gray-300">-</p>}
      </div>

      {/* 지출 그룹별 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-1.5">지출 항목별</p>
        {Object.entries(expenseByGroup).sort((a, b) => b[1] - a[1]).map(([group, amt]) => (
          <div key={group} className="flex justify-between py-1 text-sm border-b border-gray-50 last:border-0">
            <span className="text-gray-600">{group}</span>
            <span className="font-medium text-red-500">{formatWon(amt)}</span>
          </div>
        ))}
        {Object.keys(expenseByGroup).length === 0 && <p className="text-xs text-gray-300">-</p>}
      </div>
    </div>
  )
}
