'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import TaskCard from '@/components/TaskCard'
import CategoryPicker from '@/components/CategoryPicker'
import { Category } from '@/lib/types'

function pocetPoloziek(n: number): string {
  if (n === 1) return '1 zachytená položka'
  if (n >= 2 && n <= 4) return `${n} zachytené položky`
  return `${n} zachytených položiek`
}

export default function BacklogPage() {
  const store = useStore()
  const [pickingCategoryFor, setPickingCategoryFor] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  function handleAddToToday(taskId: string) {
    if (store.todayTasks.length >= 3) { showToast('Fokus. Len 3 priority denne.'); return }
    setPickingCategoryFor(taskId)
  }

  function handleCategoryPicked(cat: Category) {
    if (!pickingCategoryFor) return
    const ok = store.scheduleForToday(pickingCategoryFor, cat)
    setPickingCategoryFor(null)
    if (!ok) showToast('Fokus. Len 3 priority denne.')
  }

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
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>Zásobník</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {store.backlogTasks.length === 0 ? 'Prázdno. Nič nečaká.' : pocetPoloziek(store.backlogTasks.length)}
        </p>
      </div>

      {toastMsg && (
        <div className="mb-4 rounded-xl border px-4 py-3 text-sm animate-slide-up" style={{ background: '#FFF9EB', borderColor: '#F6D860', color: '#92600A' }}>
          {toastMsg}
        </div>
      )}

      {pickingCategoryFor && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={() => setPickingCategoryFor(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg border rounded-t-2xl p-6 pb-10 animate-slide-up" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Pridať na dnes</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Vyber kategóriu pre túto prioritu</p>
            <CategoryPicker value={null} onChange={handleCategoryPicked} />
            <button onClick={() => setPickingCategoryFor(null)} className="mt-4 text-sm transition-colors" style={{ color: 'var(--text-subtle)' }}>
              Zrušiť
            </button>
          </div>
        </div>
      )}

      {store.backlogTasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🧹</div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Zásobník je prázdny.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Zachytávaj nápady na karte Dnes.</p>
        </div>
      ) : (
        <div>
          {store.backlogTasks.map(task => (
            <TaskCard key={task.id} task={task} variant="backlog" onAddToToday={() => handleAddToToday(task.id)} onDelete={() => store.deleteTask(task.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
