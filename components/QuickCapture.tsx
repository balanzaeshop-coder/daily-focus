'use client'

import { useState, useRef } from 'react'

interface Props {
  onCapture: (title: string) => void
}

export default function QuickCapture({ onCapture }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onCapture(trimmed)
    setValue('')
  }

  return (
    <div className="flex gap-2 items-center rounded-xl px-4 py-3 border transition-colors" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text-subtle)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setValue(''); inputRef.current?.blur() }
        }}
        placeholder="Zachyť nápad... (Enter na uloženie)"
        className="flex-1 bg-transparent text-sm outline-none"
        style={{ color: 'var(--text)' }}
      />
      {value && (
        <button onClick={submit} className="text-xs font-medium transition-colors" style={{ color: 'var(--text-muted)' }}>
          Uložiť
        </button>
      )}
    </div>
  )
}
