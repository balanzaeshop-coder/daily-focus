const CACHE = 'daily-focus-v1'

const PRECACHE = [
  '/',
  '/backlog',
  '/review',
  '/weekly',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
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
  if (!event.request.url.startsWith(self.location.origin)) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      const live = fetch(event.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(event.request, res.clone()))
        }
        return res
      }).catch(() => cached)
      return cached || live
    })
  )
})
