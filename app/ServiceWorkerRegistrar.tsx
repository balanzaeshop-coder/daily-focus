'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Unregister old cached service workers first
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) reg.unregister()
      })
      // Register fresh
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
