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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [error, setError] = useState(null)
  const shaRef = useRef(null) // sha를 ref로 관리 (render 불필요)

  useEffect(() => { load() }, [year, month])

  async function load() {
    setLoading(true)
    setError(null)
    setSaveError(null)
    const path = `data/${year}/${String(month).padStart(2, '0')}.json`
    try {
      const result = await fetchFile(path)
      if (result) {
        setData(result.data)
        shaRef.current = result.sha
      } else {
        setData({ year, month, incomes: [], expenses: [] })
        shaRef.current = null
      }
    } catch (e) {
      setError(e.message || '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function persist(newData) {
    if (!canEdit) return
    // 낙관적 업데이트 — 즉시 화면에 반영
    setData(newData)
    setSaveError(null)
    setSaving(true)
    const path = `data/${year}/${String(month).padStart(2, '0')}.json`
    try {
      const token = await requireToken()
      const newSha = await saveFile(path, newData, shaRef.current, token, `Update ${year}-${month} ledger`)
      shaRef.current = newSha
    } catch (e) {
      if (e?.message !== 'cancelled') {
        setSaveError('저장 실패: ' + (e?.message || '다시 시도해주세요'))
      }
    } finally {
      setSaving(false)
    }
  }

  function addItem(type, item) {
    const newItem = { id: newId(), ...item }
    const newData = {
      ...data,
      incomes: type === 'income' ? [...(data.incomes || []), newItem] : data.incomes || [],
      expenses: type === 'expense' ? [...(data.expenses || []), newItem] : data.expenses || [],
    }
    persist(newData)
  }

  function deleteItem(type, id) {
    const newData = {
      ...data,
      incomes: type === 'income' ? data.incomes.filter(i => i.id !== id) : data.incomes,
      expenses: type === 'expense' ? data.expenses.filter(i => i.id !== id) : data.expenses,
    }
    persist(newData)
  }

  function updateItem(type, id, fields) {
    const newData = {
      ...data,
      incomes: type === 'income' ? data.incomes.map(i => i.id === id ? { ...i, ...fields } : i) : data.incomes,
      expenses: type === 'expense' ? data.expenses.map(i => i.id === id ? { ...i, ...fields } : i) : data.expenses,
    }
    persist(newData)
  }

  const totalIncome = data?.incomes?.reduce((s, i) => s + i.amount, 0) || 0
  const totalExpense = data?.expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const ni = totalIncome - totalExpense

  return (
    <div className="space-y-3 pb-20 sm:pb-4">
      {/* Header: 제목 | 월 탭 | 연도 */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold shrink-0">월별 가계부</h1>

        {/* 월 탭 — 가로 스크롤 */}
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 min-w-max">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <button
                key={m}
                onClick={() => setMonth(m)}
                className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                  month === m
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>

        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="input w-24 py-1.5 text-sm shrink-0"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>

      {/* 저장 상태 */}
      {saving && (
        <div className="text-xs text-center text-primary-500 bg-primary-50 rounded-lg py-1.5">
          GitHub에 저장 중...
        </div>
      )}
      {saveError && (
        <div className="text-xs text-center text-red-500 bg-red-50 rounded-lg py-1.5 flex items-center justify-center gap-2">
          {saveError}
          <button onClick={() => setSaveError(null)} className="underline">닫기</button>
        </div>
      )}

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
  const btnAdd = isIncome
    ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50'
    : 'border-red-200 text-red-400 hover:bg-red-50'

  function handleAddSubmit(e) {
    e.preventDefault()
    if (!addForm.categoryId || !addForm.amount) return
    onAdd({ categoryId: addForm.categoryId, amount: Number(addForm.amount), note: addForm.note })
    setAddForm({ categoryId: '', amount: '', note: '' })
    setAddOpen(false)
  }

  const total = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="card flex flex-col">
      <div className={`flex items-center justify-between pb-2 mb-2 border-b-2 ${borderColor}`}>
        <h3 className={`font-bold ${textColor}`}>{title}</h3>
        <span className={`text-sm font-semibold ${textColor}`}>{formatWon(total)}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-1 text-xs text-gray-400 px-1 mb-1">
        <span>항목</span>
        <span className="text-right w-24">금액</span>
        {canEdit && <span className="w-8" />}
      </div>

      <div className="space-y-0.5">
        {items.length === 0 && !addOpen && (
          <p className="text-center text-gray-300 text-sm py-4">항목 없음</p>
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

      {canEdit && (
        addOpen ? (
          <form onSubmit={handleAddSubmit} className={`mt-2 pt-2 border-t border-dashed ${isIncome ? 'border-emerald-200' : 'border-red-200'} space-y-1.5`}>
            <select
              className="input text-sm py-1.5"
              value={addForm.categoryId}
              onChange={e => {
                setAddForm(v => ({ ...v, categoryId: e.target.value }))
                setTimeout(() => amountRef.current?.focus(), 50)
              }}
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
                disabled={!addForm.categoryId || !addForm.amount}
                className="btn-primary flex-1 text-sm py-1.5"
              >
                추가
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
      <div className="pb-2 border-b-2 border-gray-300">
        <h3 className="font-bold text-gray-700">집계</h3>
      </div>

      <div className={`rounded-lg p-3 ${ni >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <p className={`text-xs font-medium mb-1 ${ni >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>당기순이익</p>
        <p className={`text-xl font-bold ${ni >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatWon(ni)}</p>
      </div>

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
