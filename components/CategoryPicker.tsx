'use client'

import { Category, CATEGORY_META } from '@/lib/types'

interface Props {
  value: Category | null
  onChange: (c: Category) => void
  size?: 'sm' | 'md'
}

export default function CategoryPicker({ value, onChange, size = 'md' }: Props) {
  const categories: Category[] = ['revenue', 'growth', 'ops']
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  return (
    <div className="flex gap-2">
      {categories.map(cat => {
        const meta = CATEGORY_META[cat]
        const selected = value === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`${pad} rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
              selected
                ? `${meta.bg} ${meta.border} ${meta.color}`
                : 'border text-sm'
            }`}
            style={!selected ? { background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' } : {}}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </button>
        )
      })}
    </div>
  )
}
