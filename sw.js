/* 식단 달력 서비스워커 — 앱 껍데기만 캐시해서 오프라인 실행·홈 화면 설치를 돕습니다.
 * 기록은 브라우저 localStorage 에만 있고 여기에는 저장하지 않습니다. */
var CACHE = 'meal-calendar-v1';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* 화면 이동은 네트워크 우선, 끊겼을 때만 캐시 */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }

  /* 아이콘·매니페스트 등은 캐시 우선 */
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
