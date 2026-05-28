export type Category = 'revenue' | 'growth' | 'ops'

export interface Task {
  id: string
  title: string
  category: Category | null
  createdAt: string
  scheduledDate: string | null
  completedAt: string | null
  isBacklog: boolean
}

export interface DayReview {
  date: string
  completedIds: string[]
  note: string
}

export const CATEGORY_META: Record<Category, {
  label: string
  emoji: string
  color: string
  bg: string
  border: string
  dotColor: string
}> = {
  revenue: {
    label: 'Príjmy',
    emoji: '🔴',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    dotColor: 'bg-red-500',
  },
  growth: {
    label: 'Rast',
    emoji: '🟡',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dotColor: 'bg-amber-500',
  },
  ops: {
    label: 'Prevádzka',
    emoji: '🔵',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    dotColor: 'bg-blue-500',
  },
}
