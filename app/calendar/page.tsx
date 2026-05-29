'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { CATEGORY_META, Category } from '@/lib/types'

const MESIACE = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December']
const DNI_HLAVICKY = ['Po','Ut','St','Št','Pi','So','Ne']

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0=Ne, prevediem na Po=0
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function CalendarPage() {
  const store = useStore()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDate(null)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDate(null)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  const selectedTasks = selectedDate ? store.getTasksForDate(selectedDate) : []
  const selectedReview = selectedDate ? store.getReview(selectedDate) : null

  if (!store.hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full animate-spin border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      {/* Hlavička */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          Kalendár
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Prehľad priorít podľa dní</p>
      </div>

      {/* Navigácia mesiac */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-base font-semibold" style={{ color: 'var(--text)' }}>
          {MESIACE[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text-muted)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border overflow-hidden mb-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Hlavičky dní */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {DNI_HLAVICKY.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold" style={{ color: 'var(--text-subtle)' }}>{d}</div>
          ))}
        </div>

        {/* Dni */}
        <div className="grid grid-cols-7">
          {/* Prázdne bunky pred prvým dňom */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12 border-b border-r" style={{ borderColor: 'var(--border-subtle)' }} />
          ))}

          {/* Dni mesiaca */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const iso = toISO(viewYear, viewMonth, day)
            const isToday = iso === todayISO
            const isSelected = iso === selectedDate
            const dayTasks = store.getTasksForDate(iso)
            const review = store.getReview(iso)
            const hasData = dayTasks.length > 0
            const allDone = hasData && review && dayTasks.every(t => review.completedIds.includes(t.id))
            const col = (firstDay + i) % 7
            const isLastRow = Math.floor((firstDay + i) / 7) === Math.floor((firstDay + daysInMonth - 1) / 7)
            const isWeekend = col >= 5

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(iso === selectedDate ? null : iso)}
                className="h-12 flex flex-col items-center justify-center gap-0.5 transition-all relative border-b border-r"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: isSelected ? 'var(--bg)' : 'transparent',
                }}
              >
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-all"
                  style={{
                    background: isToday ? 'var(--text)' : 'transparent',
                    color: isToday ? 'white' : isWeekend ? 'var(--text-subtle)' : 'var(--text)',
                    fontWeight: isToday || isSelected ? 700 : 400,
                  }}
                >
                  {day}
                </span>
                {/* Farebné bodky */}
                {hasData && (
                  <div className="flex gap-0.5">
                    {dayTasks.map(t => {
                      const meta = t.category ? CATEGORY_META[t.category] : null
                      const done = review?.completedIds.includes(t.id)
                      return (
                        <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${meta?.dotColor ?? 'bg-zinc-400'}`}
                          style={{ opacity: done ? 1 : 0.45 }} />
                      )
                    })}
                  </div>
                )}
                {allDone && (
                  <span className="absolute top-0.5 right-1 text-[8px]">🎯</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex gap-4 justify-center mb-5">
        {(['revenue','growth','ops'] as Category[]).map(cat => {
          const meta = CATEGORY_META[cat]
          return (
            <div key={cat} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-subtle)' }}>
              <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
              {meta.label}
            </div>
          )
        })}
      </div>

      {/* Detail vybraného dňa */}
      {selectedDate && (
        <div className="rounded-2xl border p-5 animate-slide-up" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {selectedDate === todayISO && (
              <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>dnes</span>
            )}
          </div>

          {selectedTasks.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>Žiadne priority pre tento deň.</p>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map(task => {
                const meta = task.category ? CATEGORY_META[task.category] : null
                const done = selectedReview?.completedIds.includes(task.id) || !!task.completedAt
                return (
                  <div key={task.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${done ? 'bg-emerald-500 border-emerald-500' : ''}`}
                      style={!done ? { borderColor: meta?.border ? undefined : 'var(--border)' } : {}}>
                      {done && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${done ? 'line-through' : ''}`} style={{ color: done ? 'var(--text-subtle)' : 'var(--text)' }}>
                        {task.title}
                      </p>
                      {meta && <span className={`text-xs ${meta.color}`}>{meta.emoji} {meta.label}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedReview?.note && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text-subtle)' }}>Poznámka:</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedReview.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
