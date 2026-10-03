/* Service worker de la app de Reservas.
   Solo da soporte de instalación y arranque sin conexión de la página.
   Nunca intercepta las llamadas a Google Sheets ni a los CDN externos:
   esas siempre van directo a la red, igual que sin este archivo. */
const CACHE = 'reservas-shell-v1';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Solo GET de este mismo sitio (la página y los íconos); todo lo demás
  // -las reservas de Google Sheets, las fuentes, Tailwind, SheetJS- sigue
  // yendo directo a la red, sin pasar por aquí.
  let sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) { sameOrigin = false; }
  if (req.method !== 'GET' || !sameOrigin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
