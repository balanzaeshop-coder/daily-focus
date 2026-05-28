'use client'

import { useState, useEffect, useCallback } from 'react'
import { Task, DayReview, Category } from '@/lib/types'

const TASKS_KEY = 'daily-focus:tasks'
const REVIEWS_KEY = 'daily-focus:reviews'

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

function readReviews(): DayReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeReviews(reviews: DayReview[]) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
}

export function useStore() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [reviews, setReviews] = useState<DayReview[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setTasks(readTasks())
    setReviews(readReviews())
    setHydrated(true)
  }, [])

  const mutateTasks = useCallback((next: Task[]) => {
    setTasks(next)
    writeTasks(next)
  }, [])

  const mutateReviews = useCallback((next: DayReview[]) => {
    setReviews(next)
    writeReviews(next)
  }, [])

  const today = getToday()
  const todayTasks = tasks.filter(t => t.scheduledDate === today && !t.isBacklog)
  const backlogTasks = tasks.filter(t => t.isBacklog)

  const capture = useCallback((title: string) => {
    const task: Task = {
      id: uid(),
      title: title.trim(),
      category: null,
      createdAt: new Date().toISOString(),
      scheduledDate: null,
      completedAt: null,
      isBacklog: true,
    }
    mutateTasks([...readTasks(), task])
  }, [mutateTasks])

  const addTodayTask = useCallback((title: string, category: Category): boolean => {
    const current = readTasks()
    const count = current.filter(t => t.scheduledDate === today && !t.isBacklog).length
    if (count >= 3) return false
    const task: Task = {
      id: uid(),
      title: title.trim(),
      category,
      createdAt: new Date().toISOString(),
      scheduledDate: today,
      completedAt: null,
      isBacklog: false,
    }
    mutateTasks([...current, task])
    return true
  }, [today, mutateTasks])

  const scheduleForToday = useCallback((taskId: string, category: Category): boolean => {
    const current = readTasks()
    const count = current.filter(t => t.scheduledDate === today && !t.isBacklog).length
    if (count >= 3) return false
    mutateTasks(current.map(t =>
      t.id === taskId
        ? { ...t, isBacklog: false, scheduledDate: today, category, completedAt: null }
        : t
    ))
    return true
  }, [today, mutateTasks])

  const completeTask = useCallback((taskId: string) => {
    mutateTasks(readTasks().map(t =>
      t.id === taskId ? { ...t, completedAt: new Date().toISOString() } : t
    ))
  }, [mutateTasks])

  const uncompleteTask = useCallback((taskId: string) => {
    mutateTasks(readTasks().map(t =>
      t.id === taskId ? { ...t, completedAt: null } : t
    ))
  }, [mutateTasks])

  const moveToBacklog = useCallback((taskId: string) => {
    mutateTasks(readTasks().map(t =>
      t.id === taskId
        ? { ...t, isBacklog: true, scheduledDate: null, completedAt: null }
        : t
    ))
  }, [mutateTasks])

  const deleteTask = useCallback((taskId: string) => {
    mutateTasks(readTasks().filter(t => t.id !== taskId))
  }, [mutateTasks])

  const saveReview = useCallback((completedIds: string[], note: string) => {
    const current = readReviews()
    mutateReviews([...current.filter(r => r.date !== today), { date: today, completedIds, note }])
  }, [today, mutateReviews])

  const getReview = useCallback((date: string): DayReview | null => {
    return readReviews().find(r => r.date === date) ?? null
  }, [])

  const getTasksForDate = useCallback((date: string): Task[] => {
    return readTasks().filter(t => t.scheduledDate === date && !t.isBacklog)
  }, [])

  return {
    hydrated,
    tasks,
    reviews,
    todayTasks,
    backlogTasks,
    today,
    capture,
    addTodayTask,
    scheduleForToday,
    completeTask,
    uncompleteTask,
    moveToBacklog,
    deleteTask,
    saveReview,
    getReview,
    getTasksForDate,
  }
}
