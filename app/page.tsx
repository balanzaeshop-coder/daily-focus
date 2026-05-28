'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import QuickCapture from '@/components/QuickCapture'
import TaskCard from '@/components/TaskCard'
import CategoryPicker from '@/components/CategoryPicker'
import { Category, CATEGORY_META } from '@/lib/types'

const DNI = ['Ned', 'Pon', 'Uto', 'Str', 'Štv', 'Pia', 'Sob']
const MESIACE = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec']

function formatDatum(iso: string): string {
  const d = new Date(iso)
  return `${DNI[d.getDay()]}, ${d.getDate()}. ${MESIACE[d.getMonth()]}`
}

function pocetPoloziek(n: number): string {
  if (n === 1) return '1 položka'
  if (n >= 2 && n <= 4) return `${n} položky`
  return `${n} položiek`
}

export default function Dashboard() {
  const store = useStore()
  const [addingTask, setAddingTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<Category | null>(null)
  const [warningVisible, setWarningVisible] = useState(false)

  const completedCount = store.todayTasks.filter(t => t.completedAt).length
  const allDone = store.todayTasks.length === 3 && completedCount === 3

  function handleAddTask() {
    if (!newTitle.trim() || !newCategory) return
    const ok = store.addTodayTask(newTitle, newCategory)
    if (!ok) {
      setWarningVisible(true)
      setTimeout(() => setWarningVisible(false), 3000)
      return
    }
    setNewTitle('')
    setNewCategory(null)
    setAddingTask(false)
  }

  function handleCancelAdd() {
    setNewTitle('')
    setNewCategory(null)
    setAddingTask(false)
  }

  const canAddMore = store.todayTasks.length < 3

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
        <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--text-subtle)' }}>
          {formatDatum(new Date().toISOString())}
        </p>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>
          Daily Focus
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {store.todayTasks.length === 0
            ? 'Aké sú tvoje 3 priority na dnes?'
            : allDone
              ? 'Všetko hotové. Skvelý deň. 🎯'
              : `${completedCount} z ${store.todayTasks.length} splnené`}
        </p>
      </div>

      <div className="mb-8">
        <QuickCapture onCapture={store.capture} />
        {store.backlogTasks.length > 0 && (
          <p className="text-xs mt-2 pl-1" style={{ color: 'var(--text-subtle)' }}>
            {pocetPoloziek(store.backlogTasks.length)} v zásobníku
          </p>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Dnešný fokus
          </h2>
          <span className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
            {store.todayTasks.length}/3
          </span>
        </div>

        <div className="space-y-3">
          {store.todayTasks.map(task => (
            <div key={task.id} className="animate-slide-up">
              <TaskCard
                task={task}
                variant="today"
                onComplete={() => store.completeTask(task.id)}
                onUncomplete={() => store.uncompleteTask(task.id)}
                onMoveToBacklog={() => store.moveToBacklog(task.id)}
              />
            </div>
          ))}

          {warningVisible && (
            <div className="rounded-xl border px-4 py-3 text-sm animate-slide-up" style={{ background: '#FFF9EB', borderColor: '#F6D860', color: '#92600A' }}>
              Fokus. Len 3 priority denne. Presuň niečo do zásobníka.
            </div>
          )}

          {canAddMore && !addingTask && (
            <button
              onClick={() => setAddingTask(true)}
              className="w-full rounded-2xl border border-dashed py-5 text-sm transition-all flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--border)', color: 'var(--text-subtle)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Pridať prioritu {store.todayTasks.length + 1}
            </button>
          )}

          {addingTask && (
            <div className="rounded-2xl border p-4 space-y-3 animate-slide-up" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <input
                autoFocus
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newCategory) handleAddTask()
                  if (e.key === 'Escape') handleCancelAdd()
                }}
                placeholder="Čo treba urobiť?"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: 'var(--text)' }}
              />
              <CategoryPicker value={newCategory} onChange={setNewCategory} />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddTask}
                  disabled={!newTitle.trim() || !newCategory}
                  className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-opacity text-white"
                  style={{ background: 'var(--text)' }}
                >
                  Pridať
                </button>
                <button
                  onClick={handleCancelAdd}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Zrušiť
                </button>
              </div>
            </div>
          )}

          {!canAddMore && !addingTask && (
            <div className="rounded-2xl border px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'var(--border)' }}>
              <span className="text-lg">🎯</span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Máš svoje 3 priority. <strong style={{ color: 'var(--text)' }}>Zostaň sústredený.</strong><br />
                Nové nápady idú do zásobníka.
              </p>
            </div>
          )}
        </div>
      </div>

      {store.todayTasks.length > 0 && (
        <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-4 justify-center">
            {(['revenue', 'growth', 'ops'] as Category[]).map(cat => {
              const meta = CATEGORY_META[cat]
              const count = store.todayTasks.filter(t => t.category === cat).length
              if (count === 0) return null
              return (
                <div key={cat} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-subtle)' }}>
                  <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                  <span>{count}× {meta.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
