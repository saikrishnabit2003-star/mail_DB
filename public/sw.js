const CACHE_NAME = 'email-marketing-shell-v1'

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([
      '/',
      '/index.html',
      '/manifest.webmanifest',
      '/app-icon.svg',
      '/icons/app-icon-192.svg',
      '/icons/app-icon-512.svg',
    ]))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkRequest = fetch(request).then(async response => {
          if (response.ok) {
            await caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
          }
          return response
        })

        if (cached) {
          event.waitUntil(networkRequest.catch(error => {
            console.warn('Unable to refresh a cached application asset.', error)
          }))
        }

        return cached || networkRequest
      })
    )
  }
})
