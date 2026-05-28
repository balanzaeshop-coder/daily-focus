'use client'

import { useStore } from '@/hooks/useStore'
import { Category, CATEGORY_META } from '@/lib/types'

const DNI_KRATKE = ['Ned', 'Pon', 'Uto', 'Str', 'Štv', 'Pia', 'Sob']

function getPoslednych7Dni(): string[] {
  const dni: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dni.push(d.toISOString().split('T')[0])
  }
  return dni
}

function kratkeDatum(iso: string): { den: string; cislo: number } {
  const d = new Date(iso + 'T12:00:00')
  return { den: DNI_KRATKE[d.getDay()], cislo: d.getDate() }
}

function pocetUloh(n: number): string {
  if (n === 1) return '1 úloha'
  if (n >= 2 && n <= 4) return `${n} úlohy`
  return `${n} úloh`
}

export default function WeeklyPage() {
  const store = useStore()
  const dni = getPoslednych7Dni()
  const dnes = new Date().toISOString().split('T')[0]

  if (!store.hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full animate-spin border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--text)' }} />
      </div>
    )
  }

  const vsetkyUlohy = dni.flatMap(d => store.getTasksForDate(d))
  const poctyKategorii: Record<Category, number> = { revenue: 0, growth: 0, ops: 0 }
  vsetkyUlohy.forEach(t => { if (t.category) poctyKategorii[t.category]++ })
  const spolu = poctyKategorii.revenue + poctyKategorii.growth + poctyKategorii.ops

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garant', serif", color: 'var(--text)' }}>Týždenný prehľad</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Posledných 7 dní — plánované vs splnené</p>
      </div>

      {spolu > 0 && (
        <div className="mb-8 rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
            Kde šiel tvoj čas?
          </h2>
          <div className="space-y-3">
            {(['revenue', 'growth', 'ops'] as Category[]).map(cat => {
              const meta = CATEGORY_META[cat]
              const count = poctyKategorii[cat]
              const pct = spolu > 0 ? Math.round((count / spolu) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-medium ${meta.color}`}>{meta.emoji} {meta.label}</span>
                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>{pocetUloh(count)} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                    <div className={`h-full rounded-full transition-all duration-500 ${meta.dotColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          {poctyKategorii.ops > poctyKategorii.revenue && (
            <p className="mt-4 text-xs flex items-start gap-2" style={{ color: '#92600A' }}>
              <span>⚠️</span>
              <span>Tento týždeň viac prevádzky ako príjmov. Chráň viac času na prácu, ktorá generuje tržby.</span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Denný prehľad</h2>
        {dni.map(datum => {
          const denneUlohy = store.getTasksForDate(datum)
          const review = store.getReview(datum)
          const splneneIds = new Set(review ? review.completedIds : denneUlohy.filter(t => t.completedAt).map(t => t.id))
          const pocetSplnenych = denneUlohy.filter(t => splneneIds.has(t.id)).length
          const label = kratkeDatum(datum)
          const jeDnes = datum === dnes
          const maData = denneUlohy.length > 0

          return (
            <div key={datum} className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: jeDnes ? 'var(--border)' : 'var(--border-subtle)', boxShadow: jeDnes ? '0 0 0 1.5px var(--border)' : 'none' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-center w-10 flex-shrink-0">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>{label.den}</div>
                  <div className="text-lg font-bold" style={{ color: jeDnes ? 'var(--text)' : 'var(--text-muted)' }}>{label.cislo}</div>
                </div>
                <div className="flex-1">
                  {!maData ? (
                    <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Žiadne priority</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => {
                          const task = denneUlohy[i]
                          const done = task && splneneIds.has(task.id)
                          const meta = task?.category ? CATEGORY_META[task.category] : null
                          return (
                            <div key={i} className={`w-5 h-5 rounded-full border flex items-center justify-center ${!task ? '' : done ? `${meta?.dotColor ?? ''} border-transparent` : `${meta?.border ?? ''}`}`}
                              style={!task ? { borderColor: 'var(--border)' } : {}}>
                              {done && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pocetSplnenych}/{denneUlohy.length} hotovo</span>
                    </div>
                  )}
                </div>
                {maData && pocetSplnenych === denneUlohy.length && denneUlohy.length > 0 && <span className="text-base">🎯</span>}
              </div>

              {maData && (
                <div className="space-y-1 pl-1 border-l" style={{ borderColor: 'var(--border)' }}>
                  {denneUlohy.map(task => {
                    const done = splneneIds.has(task.id)
                    const meta = task.category ? CATEGORY_META[task.category] : null
                    return (
                      <div key={task.id} className="flex items-center gap-2 ml-3">
                        {meta && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dotColor}`} />}
                        <span className={`text-xs leading-relaxed ${done ? 'line-through' : ''}`} style={{ color: done ? 'var(--text-subtle)' : 'var(--text-muted)' }}>
                          {task.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
