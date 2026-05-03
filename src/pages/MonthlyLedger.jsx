import { useState, useEffect } from 'react'
import { fetchFile, saveFile } from '../utils/github'
import { useAuth } from '../contexts/AuthContext'
import { formatWon } from '../utils/format'
import settings from '../../data/settings.json'

const YEARS = [2025, 2026, 2027]

function newId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function MonthlyLedger() {
  const { canEdit } = useAuth()
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState(null)
  const [sha, setSha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('income') // 'income' | 'expense' | 'summary'
  const [addForm, setAddForm] = useState(null) // { type: 'income'|'expense', categoryId, amount, note }
  const [editId, setEditId] = useState(null)

  useEffect(() => { load() }, [year, month])

  async function load() {
    setLoading(true)
    const path = `data/${year}/${String(month).padStart(2,'0')}.json`
    try {
      const result = await fetchFile(path)
      if (result) { setData(result.data); setSha(result.sha) }
      else { setData({ year, month, incomes: [], expenses: [] }); setSha(null) }
    } finally {
      setLoading(false)
    }
  }

  async function persist(newData) {
    if (!canEdit) return
    setSaving(true)
    const path = `data/${year}/${String(month).padStart(2,'0')}.json`
    try {
      const newSha = await saveFile(path, newData, sha, `Update ${year}-${month} ledger`)
      setSha(newSha)
      setData(newData)
    } finally {
      setSaving(false)
    }
  }

  function addItem(type) {
    if (!addForm) return
    const newData = { ...data }
    const item = { id: newId(), categoryId: addForm.categoryId, amount: Number(addForm.amount), note: addForm.note || '' }
    if (type === 'income') newData.incomes = [...(data.incomes || []), item]
    else newData.expenses = [...(data.expenses || []), item]
    persist(newData)
    setAddForm(null)
  }

  function deleteItem(type, id) {
    const newData = { ...data }
    if (type === 'income') newData.incomes = data.incomes.filter(i => i.id !== id)
    else newData.expenses = data.expenses.filter(i => i.id !== id)
    persist(newData)
  }

  function updateItem(type, id, fields) {
    const newData = { ...data }
    if (type === 'income') {
      newData.incomes = data.incomes.map(i => i.id === id ? { ...i, ...fields } : i)
    } else {
      newData.expenses = data.expenses.map(i => i.id === id ? { ...i, ...fields } : i)
    }
    persist(newData)
    setEditId(null)
  }

  const totalIncome = data?.incomes?.reduce((s, i) => s + i.amount, 0) || 0
  const totalExpense = data?.expenses?.reduce((s, e) => s + e.amount, 0) || 0
  const ni = totalIncome - totalExpense

  // 카테고리별 지출 집계
  const expenseByGroup = {}
  ;(data?.expenses || []).forEach(e => {
    const cat = settings.expenseCategories.find(c => c.id === e.categoryId)
    const group = cat?.group || '기타'
    expenseByGroup[group] = (expenseByGroup[group] || 0) + e.amount
  })

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold">가계부</h1>
        <div className="flex gap-2 ml-auto">
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="input w-24 py-1.5">
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="input w-20 py-1.5">
            {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
        </div>
      </div>

      {/* NI summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">총수입</p>
          <p className="font-bold text-emerald-600 text-sm">{formatWon(totalIncome)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">총지출</p>
          <p className="font-bold text-red-500 text-sm">{formatWon(totalExpense)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">순이익</p>
          <p className={`font-bold text-sm ${ni >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatWon(ni)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[['income','수입'],['expense','지출'],['summary','집계']].map(([key,label])=>(
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===key ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">불러오는 중...</div>
      ) : (
        <>
          {tab === 'income' && (
            <ItemList
              items={data?.incomes || []}
              categories={settings.incomeCategories}
              type="income"
              canEdit={canEdit}
              saving={saving}
              editId={editId}
              setEditId={setEditId}
              onDelete={id => deleteItem('income', id)}
              onUpdate={(id, fields) => updateItem('income', id, fields)}
              addForm={addForm?.type === 'income' ? addForm : null}
              onAddFormChange={f => setAddForm(f ? { ...f, type: 'income' } : null)}
              onAddSubmit={() => addItem('income')}
            />
          )}
          {tab === 'expense' && (
            <ItemList
              items={data?.expenses || []}
              categories={settings.expenseCategories}
              type="expense"
              canEdit={canEdit}
              saving={saving}
              editId={editId}
              setEditId={setEditId}
              onDelete={id => deleteItem('expense', id)}
              onUpdate={(id, fields) => updateItem('expense', id, fields)}
              addForm={addForm?.type === 'expense' ? addForm : null}
              onAddFormChange={f => setAddForm(f ? { ...f, type: 'expense' } : null)}
              onAddSubmit={() => addItem('expense')}
            />
          )}
          {tab === 'summary' && (
            <SummaryTab
              incomes={data?.incomes || []}
              expenses={data?.expenses || []}
              expenseByGroup={expenseByGroup}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
            />
          )}
        </>
      )}
    </div>
  )
}

function ItemList({ items, categories, type, canEdit, saving, editId, setEditId, onDelete, onUpdate, addForm, onAddFormChange, onAddSubmit }) {
  const colorClass = type === 'income' ? 'text-emerald-600' : 'text-red-500'
  const bgAdd = type === 'income' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-2">
      {items.map(item => {
        const cat = categories.find(c => c.id === item.categoryId)
        const isEdit = editId === item.id
        if (isEdit) {
          return (
            <EditRow
              key={item.id}
              item={item}
              categories={categories}
              saving={saving}
              onSave={fields => onUpdate(item.id, fields)}
              onCancel={() => setEditId(null)}
            />
          )
        }
        return (
          <div key={item.id} className="card flex items-center justify-between gap-2 py-3 group">
            <div className="flex-1 min-w-0">
              <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 mr-2">{cat?.label || item.categoryId}</span>
              {item.note && <span className="text-xs text-gray-400">{item.note}</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-semibold text-sm ${colorClass}`}>{formatWon(item.amount)}</span>
              {canEdit && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => setEditId(item.id)} className="text-xs text-blue-400 hover:text-blue-600">편집</button>
                  <button onClick={() => onDelete(item.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Add form */}
      {canEdit && (
        addForm ? (
          <div className={`card border ${bgAdd} space-y-2`}>
            <select
              className="input text-sm"
              value={addForm.categoryId || ''}
              onChange={e => onAddFormChange({ ...addForm, categoryId: e.target.value })}
            >
              <option value="">카테고리 선택</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input
              type="number"
              className="input text-sm"
              placeholder="금액"
              value={addForm.amount || ''}
              onChange={e => onAddFormChange({ ...addForm, amount: e.target.value })}
            />
            <input
              type="text"
              className="input text-sm"
              placeholder="메모 (선택)"
              value={addForm.note || ''}
              onChange={e => onAddFormChange({ ...addForm, note: e.target.value })}
            />
            <div className="flex gap-2">
              <button
                onClick={onAddSubmit}
                disabled={saving || !addForm.categoryId || !addForm.amount}
                className="btn-primary flex-1 text-sm py-1.5"
              >
                {saving ? '저장 중...' : '추가'}
              </button>
              <button onClick={() => onAddFormChange(null)} className="btn-secondary text-sm py-1.5">취소</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onAddFormChange({ categoryId: '', amount: '', note: '' })}
            className={`w-full py-2.5 border-2 border-dashed rounded-xl text-sm font-medium transition-colors ${type === 'income' ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : 'border-red-200 text-red-400 hover:bg-red-50'}`}
          >
            + {type === 'income' ? '수입' : '지출'} 항목 추가
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
    <div className="card border border-blue-200 bg-blue-50 space-y-2">
      <select className="input text-sm" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <input type="number" className="input text-sm" value={amount} onChange={e => setAmount(Number(e.target.value))} />
      <input type="text" className="input text-sm" value={note} onChange={e => setNote(e.target.value)} placeholder="메모" />
      <div className="flex gap-2">
        <button onClick={() => onSave({ categoryId, amount: Number(amount), note })} disabled={saving} className="btn-primary flex-1 text-sm py-1.5">
          {saving ? '저장 중...' : '저장'}
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm py-1.5">취소</button>
      </div>
    </div>
  )
}

function SummaryTab({ incomes, expenses, expenseByGroup, totalIncome, totalExpense }) {
  const incomeByPerson = {}
  incomes.forEach(i => {
    const cat = settings.incomeCategories.find(c => c.id === i.categoryId)
    const person = cat?.person || '기타'
    incomeByPerson[person] = (incomeByPerson[person] || 0) + i.amount
  })

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-bold text-sm mb-3">수입 인별 집계</h3>
        {Object.entries(incomeByPerson).map(([person, amount]) => (
          <div key={person} className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
            <span className="text-gray-600">{person}</span>
            <span className="font-medium text-emerald-600">{formatWon(amount)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 font-bold text-sm border-t mt-1">
          <span>합계</span>
          <span className="text-emerald-600">{formatWon(totalIncome)}</span>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-sm mb-3">지출 항목별 집계</h3>
        {Object.entries(expenseByGroup).sort((a,b) => b[1]-a[1]).map(([group, amount]) => (
          <div key={group} className="flex justify-between py-1.5 text-sm border-b border-gray-50 last:border-0">
            <span className="text-gray-600">{group}</span>
            <span className="font-medium text-red-500">{formatWon(amount)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2 font-bold text-sm border-t mt-1">
          <span>합계</span>
          <span className="text-red-500">{formatWon(totalExpense)}</span>
        </div>
      </div>
    </div>
  )
}
