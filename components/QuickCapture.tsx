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
    <div className="flex gap-2 items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-zinc-600 transition-colors">
      <svg className="w-4 h-4 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
        className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
      />
      {value && (
        <button
          onClick={submit}
          className="text-xs text-zinc-400 hover:text-white transition-colors font-medium"
        >
          Uložiť
        </button>
      )}
    </div>
  )
}
