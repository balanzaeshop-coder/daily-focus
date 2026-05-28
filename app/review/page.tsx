'use client'

import { useState, useEffect } from 'react'
import { useStore, getToday } from '@/hooks/useStore'
import { CATEGORY_META } from '@/lib/types'

function getStreak(reviews: { date: string; completedIds: string[] }[], tasksByDate: (date: string) => { id: string }[]): number {
  let streak = 0
  const cursor = new Date(getToday())
  for (let i = 0; i < 30; i++) {
    const dateStr = cursor.toISOString().split('T')[0]
    const dayTasks = tasksByDate(dateStr)
    const review = reviews.find(r => r.date === dateStr)
    if (dayTasks.length === 0) { cursor.setDate(cursor.getDate() - 1); continue }
    if (!review || !dayTasks.every(t => review.completedIds.includes(t.id))) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default function ReviewPage() {
  const store = useStore()
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!store.hydrated) return
    const existing = store.getReview(store.today)
    if (existing) { setCompletedIds(existing.completedIds); setNote(existing.note) }
    else setCompletedIds(store.todayTasks.filter(t => t.completedAt).map(t => t.id))
  }, [store.hydrated, store.today])

  function toggleId(id: string) {
    setCompletedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    setSaved(false)
  }

  function handleSave() {
    store.saveReview(completedIds, note)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const streak = store.hydrated ? getStreak(store.reviews, store.getTasksForDate) : 0

  if (!store.hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full animate-spin border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>Koniec dňa</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Ako sa darilo dnes?</p>
      </div>

      {streak > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{streak}-dňová séria</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pokračuj ďalej</p>
          </div>
        </div>
      )}

      {store.todayTasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Na dnes nie sú žiadne priority.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Prejdi na kartu Dnes a pridaj nejaké.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Ktoré si splnil?
            </h2>
            <div className="space-y-3">
              {store.todayTasks.map(task => {
                const done = completedIds.includes(task.id)
                const meta = task.category ? CATEGORY_META[task.category] : null
                return (
                  <button key={task.id} onClick={() => toggleId(task.id)}
                    className="w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-4"
                    style={{ background: done ? 'var(--card)' : 'rgba(255,255,255,0.5)', borderColor: done ? 'var(--border)' : 'var(--border-subtle)' }}>
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${done ? 'bg-emerald-500 border-emerald-500' : ''}`}
                      style={!done ? { borderColor: 'var(--border)' } : {}}>
                      {done && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through' : ''}`} style={{ color: done ? 'var(--text-subtle)' : 'var(--text)' }}>
                        {task.title}
                      </p>
                      {meta && <span className={`text-xs ${meta.color}`}>{meta.emoji} {meta.label}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Čo ti stálo v ceste? <span className="normal-case font-normal" style={{ color: 'var(--text-subtle)' }}>(voliteľné)</span>
            </h2>
            <textarea
              value={note}
              onChange={e => { setNote(e.target.value); setSaved(false) }}
              placeholder="Rozptyľovanie, bloky, nečakané problémy..."
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>

          <button onClick={handleSave}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all text-white"
            style={{ background: saved ? '#059669' : 'var(--text)' }}>
            {saved ? '✓ Uložené' : 'Uložiť hodnotenie'}
          </button>

          {completedIds.length > 0 && (
            <div className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {completedIds.length === store.todayTasks.length
                ? '🎯 Perfektný deň — všetky priority splnené.'
                : `${completedIds.length}/${store.todayTasks.length} priorít splnených.`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
