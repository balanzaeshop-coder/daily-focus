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
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      {/* Hlavička */}
      <div className="mb-8">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">
          {formatDatum(new Date().toISOString())}
        </p>
        <h1 className="text-2xl font-bold text-white">Daily Focus</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {store.todayTasks.length === 0
            ? 'Aké sú tvoje 3 priority na dnes?'
            : allDone
              ? 'Všetko hotové. Skvelý deň. 🎯'
              : `${completedCount} z ${store.todayTasks.length} splnené`}
        </p>
      </div>

      {/* Rýchle zachytenie */}
      <div className="mb-8">
        <QuickCapture onCapture={store.capture} />
        {store.backlogTasks.length > 0 && (
          <p className="text-xs text-zinc-600 mt-2 pl-1">
            {pocetPoloziek(store.backlogTasks.length)} v zásobníku
          </p>
        )}
      </div>

      {/* Dnešné priority */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Dnešný fokus
          </h2>
          <span className="text-xs text-zinc-600 font-medium">
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

          {/* Upozornenie */}
          {warningVisible && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-400 animate-slide-up">
              Fokus. Len 3 priority denne. Presuň niečo do zásobníka.
            </div>
          )}

          {/* Tlačidlo na pridanie priority / formulár */}
          {canAddMore && !addingTask && (
            <button
              onClick={() => setAddingTask(true)}
              className="w-full rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-700 py-5 text-sm text-zinc-600 hover:text-zinc-400 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Pridať prioritu {store.todayTasks.length + 1}
            </button>
          )}

          {addingTask && (
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 space-y-3 animate-slide-up">
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
                className="w-full bg-transparent text-white placeholder-zinc-600 text-sm outline-none"
              />
              <CategoryPicker value={newCategory} onChange={setNewCategory} />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddTask}
                  disabled={!newTitle.trim() || !newCategory}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-white text-zinc-950 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                >
                  Pridať
                </button>
                <button
                  onClick={handleCancelAdd}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:text-white transition-colors"
                >
                  Zrušiť
                </button>
              </div>
            </div>
          )}

          {!canAddMore && !addingTask && (
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 px-4 py-3 flex items-center gap-3">
              <span className="text-lg">🎯</span>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Máš svoje 3 priority. <strong className="text-zinc-400">Zostaň sústredený.</strong><br />
                Nové nápady idú do zásobníka.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legenda kategórií */}
      {store.todayTasks.length > 0 && (
        <div className="mt-8 pt-6 border-t border-zinc-900">
          <div className="flex gap-4 justify-center">
            {(['revenue', 'growth', 'ops'] as Category[]).map(cat => {
              const meta = CATEGORY_META[cat]
              const count = store.todayTasks.filter(t => t.category === cat).length
              if (count === 0) return null
              return (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-zinc-600">
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
