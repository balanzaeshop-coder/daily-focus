'use client'

import { useState, useEffect } from 'react'
import { useStore, getToday } from '@/hooks/useStore'
import { CATEGORY_META } from '@/lib/types'

function getStreak(reviews: { date: string; completedIds: string[] }[], tasksByDate: (date: string) => { id: string }[]): number {
  let streak = 0
  const today = getToday()
  const cursor = new Date(today)

  for (let i = 0; i < 30; i++) {
    const dateStr = cursor.toISOString().split('T')[0]
    const dayTasks = tasksByDate(dateStr)
    const review = reviews.find(r => r.date === dateStr)

    if (dayTasks.length === 0) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    const allDone = dayTasks.length > 0 && review && dayTasks.every(t => review.completedIds.includes(t.id))
    if (!allDone) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function seriaDni(n: number): string {
  if (n === 1) return '1-dňová séria'
  if (n >= 2 && n <= 4) return `${n}-dňová séria`
  return `${n}-dňová séria`
}

export default function ReviewPage() {
  const store = useStore()
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!store.hydrated) return
    const existing = store.getReview(store.today)
    if (existing) {
      setCompletedIds(existing.completedIds)
      setNote(existing.note)
    } else {
      setCompletedIds(store.todayTasks.filter(t => t.completedAt).map(t => t.id))
    }
  }, [store.hydrated, store.today])

  function toggleId(id: string) {
    setCompletedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
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
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Koniec dňa</h1>
        <p className="text-sm text-zinc-500 mt-1">Ako sa darilo dnes?</p>
      </div>

      {/* Séria */}
      {streak > 0 && (
        <div className="mb-6 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-sm font-semibold text-white">{seriaDni(streak)}</p>
            <p className="text-xs text-zinc-500">Pokračuj ďalej</p>
          </div>
        </div>
      )}

      {store.todayTasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-zinc-600 text-sm">Na dnes nie sú žiadne priority.</p>
          <p className="text-zinc-700 text-xs mt-1">Prejdi na kartu Dnes a pridaj nejaké.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Splnené úlohy */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Ktoré si splnil?
            </h2>
            <div className="space-y-3">
              {store.todayTasks.map(task => {
                const done = completedIds.includes(task.id)
                const meta = task.category ? CATEGORY_META[task.category] : null
                return (
                  <button
                    key={task.id}
                    onClick={() => toggleId(task.id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-4 ${
                      done
                        ? 'bg-zinc-900/60 border-zinc-700'
                        : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      done ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
                    }`}>
                      {done && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-zinc-500' : 'text-white'}`}>
                        {task.title}
                      </p>
                      {meta && (
                        <span className={`text-xs ${meta.color}`}>{meta.emoji} {meta.label}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Poznámka */}
          <div>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Čo ti stálo v ceste? <span className="normal-case font-normal text-zinc-600">(voliteľné)</span>
            </h2>
            <textarea
              value={note}
              onChange={e => { setNote(e.target.value); setSaved(false) }}
              placeholder="Rozptyľovanie, bloky, nečakané problémy..."
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 resize-none transition-colors"
            />
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            {saved ? '✓ Uložené' : 'Uložiť hodnotenie'}
          </button>

          {completedIds.length > 0 && (
            <div className="text-center text-sm text-zinc-600">
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
