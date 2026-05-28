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

export default function TaskCard({
  task,
  onComplete,
  onUncomplete,
  onMoveToBacklog,
  onDelete,
  onAddToToday,
  variant = 'today',
}: Props) {
  const done = !!task.completedAt
  const meta = task.category ? CATEGORY_META[task.category] : null

  if (variant === 'today') {
    return (
      <div className={`relative rounded-2xl border p-5 transition-all ${
        done
          ? 'bg-zinc-900/40 border-zinc-800/60'
          : meta
            ? `${meta.bg} ${meta.border}`
            : 'bg-zinc-900 border-zinc-800'
      }`}>
        <div className="flex items-start gap-4">
          <button
            onClick={done ? onUncomplete : onComplete}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
              done
                ? 'border-zinc-600 bg-zinc-600'
                : meta
                  ? `${meta.border} hover:${meta.bg}`
                  : 'border-zinc-600 hover:border-zinc-400'
            }`}
          >
            {done && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-base font-medium leading-snug ${done ? 'line-through text-zinc-500' : 'text-white'}`}>
              {task.title}
            </p>
            {meta && (
              <span className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${meta.color}`}>
                {meta.emoji} {meta.label}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-shrink-0">
            {onMoveToBacklog && (
              <button
                onClick={onMoveToBacklog}
                className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                title="Presunúť do zásobníka"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-zinc-800/60 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 leading-snug">{task.title}</p>
        {meta && (
          <span className={`text-xs ${meta.color} mt-0.5 inline-block`}>
            {meta.emoji} {meta.label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {onAddToToday && (
          <button
            onClick={onAddToToday}
            className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            + Dnes
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
            title="Odstrániť"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
