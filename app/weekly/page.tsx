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
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
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
        <h1 className="text-2xl font-bold text-white">Týždenný prehľad</h1>
        <p className="text-sm text-zinc-500 mt-1">Posledných 7 dní — plánované vs splnené</p>
      </div>

      {/* Rozdelenie podľa kategórií */}
      {spolu > 0 && (
        <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
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
                    <span className="text-xs text-zinc-500">{pocetUloh(count)} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${meta.dotColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {poctyKategorii.ops > poctyKategorii.revenue && (
            <p className="mt-4 text-xs text-amber-400/80 flex items-start gap-2">
              <span>⚠️</span>
              <span>Tento týždeň viac prevádzky ako príjmov. Chráň viac času na prácu, ktorá generuje tržby.</span>
            </p>
          )}
        </div>
      )}

      {/* Denný prehľad */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
          Denný prehľad
        </h2>
        {dni.map(datum => {
          const denneUlohy = store.getTasksForDate(datum)
          const review = store.getReview(datum)
          const splneneIds = new Set(
            review ? review.completedIds : denneUlohy.filter(t => t.completedAt).map(t => t.id)
          )
          const pocetSplnenych = denneUlohy.filter(t => splneneIds.has(t.id)).length
          const label = kratkeDatum(datum)
          const jeDnes = datum === dnes
          const maData = denneUlohy.length > 0

          return (
            <div
              key={datum}
              className={`rounded-2xl border p-4 ${
                jeDnes
                  ? 'border-zinc-700 bg-zinc-900/60'
                  : 'border-zinc-800/60 bg-zinc-900/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`text-center w-10 flex-shrink-0 ${jeDnes ? 'text-white' : 'text-zinc-500'}`}>
                  <div className="text-xs font-medium">{label.den}</div>
                  <div className={`text-lg font-bold ${jeDnes ? 'text-white' : 'text-zinc-400'}`}>{label.cislo}</div>
                </div>
                <div className="flex-1">
                  {!maData ? (
                    <p className="text-xs text-zinc-700">Žiadne priority</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => {
                          const task = denneUlohy[i]
                          const done = task && splneneIds.has(task.id)
                          const meta = task?.category ? CATEGORY_META[task.category] : null
                          return (
                            <div
                              key={i}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                !task
                                  ? 'border-zinc-800 bg-transparent'
                                  : done
                                    ? `${meta?.dotColor ?? 'bg-zinc-600'} border-transparent`
                                    : `border ${meta?.border ?? 'border-zinc-700'} bg-transparent`
                              }`}
                            >
                              {done && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {pocetSplnenych}/{denneUlohy.length} hotovo
                      </span>
                    </div>
                  )}
                </div>
                {maData && pocetSplnenych === denneUlohy.length && denneUlohy.length > 0 && (
                  <span className="text-base">🎯</span>
                )}
              </div>

              {maData && (
                <div className="space-y-1 pl-1 border-l border-zinc-800">
                  {denneUlohy.map(task => {
                    const done = splneneIds.has(task.id)
                    const meta = task.category ? CATEGORY_META[task.category] : null
                    return (
                      <div key={task.id} className="flex items-center gap-2 ml-3">
                        {meta && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dotColor}`} />}
                        <span className={`text-xs leading-relaxed ${done ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
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
