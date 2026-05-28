'use client'

import { Task, CATEGORY_META } from '@/lib/types'

interface Props {
  task: Task
  onComplete?: () => void
  onUncomplete?: () => void
  onMoveToBacklog?: () => void
  onDelete?: () => void
  onAddToToday?: () => void
  variant?: 'today' | 'backlog'
}

export default function TaskCard({ task, onComplete, onUncomplete, onMoveToBacklog, onDelete, onAddToToday, variant = 'today' }: Props) {
  const done = !!task.completedAt
  const meta = task.category ? CATEGORY_META[task.category] : null

  if (variant === 'today') {
    return (
      <div className={`relative rounded-2xl border p-5 transition-all ${done ? '' : meta ? `${meta.bg} ${meta.border}` : ''}`}
        style={done ? { background: 'rgba(255,255,255,0.5)', borderColor: 'var(--border)' } : !meta ? { background: 'var(--card)', borderColor: 'var(--border)' } : {}}>
        <div className="flex items-start gap-4">
          <button
            onClick={done ? onUncomplete : onComplete}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${done ? 'bg-[#1C1B23] border-[#1C1B23]' : meta ? `${meta.border}` : 'border-[#D4D0E8]'}`}
          >
            {done && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-base font-medium leading-snug ${done ? 'line-through' : ''}`}
              style={{ color: done ? 'var(--text-subtle)' : 'var(--text)' }}>
              {task.title}
            </p>
            {meta && (
              <span className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${meta.color}`}>
                {meta.emoji} {meta.label}
              </span>
            )}
          </div>

          {onMoveToBacklog && (
            <button onClick={onMoveToBacklog} className="p-1.5 transition-colors" style={{ color: 'var(--text-subtle)' }} title="Presunúť do zásobníka">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b group" style={{ borderColor: 'var(--border)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{task.title}</p>
        {meta && (
          <span className={`text-xs ${meta.color} mt-0.5 inline-block`}>{meta.emoji} {meta.label}</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {onAddToToday && (
          <button onClick={onAddToToday} className="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            + Dnes
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-1.5 transition-colors hover:text-red-500" style={{ color: 'var(--text-subtle)' }} title="Odstrániť">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
