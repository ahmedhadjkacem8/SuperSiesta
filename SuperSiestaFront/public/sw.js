// SuperSiestaFront/public/sw.js
// Service Worker pour cacher les images du Network

const CACHE_NAME = 'supersiesta-images-v1'
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.avi']

// Installe le service worker
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Active le service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Intercepte les requêtes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // N'intercepter QUE les fichiers de la même origine (Vite sur 8080)
  // Cela permet de laisser au navigateur la gestion directe des images du backend (8000)
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Vérifie si c'est une requête d'image/vidéo
  const isMedia = IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext))
  
  if (isMedia && event.request.method === 'GET') {
    // Utilise la stratégie "Cache First" pour les images
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            // Image trouvée en cache
            return response
          }
          
          // Fetch depuis le réseau
          return fetch(event.request).then((networkResponse) => {
            // Met en cache la réponse
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone())
            }
            return networkResponse
          })
        })
      })
    )
  }
  // Les autres requêtes (HTML, API, JS) passeront naturellement sans passer par le Service Worker.
})
