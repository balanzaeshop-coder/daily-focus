const CACHE = 'daily-focus-v2'

const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  // HTML pages — vždy zo siete (kvôli auth middleware)
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request))
    return
  }

  // Auth routes — vždy zo siete
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/auth') || url.pathname === '/login') {
    event.respondWith(fetch(event.request))
    return
  }

  // Statické súbory — cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(event.request, res.clone()))
        }
        return res
      })
    })
  )
})
