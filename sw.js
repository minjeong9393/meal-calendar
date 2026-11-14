/* 신철민정 식단표 서비스워커 — 앱 껍데기만 캐시해서 오프라인 실행·홈 화면 설치를 돕습니다.
 * 식단 기록은 브라우저 localStorage 에만 있고 여기에는 저장하지 않습니다.
 * 화면(HTML)과 매니페스트는 네트워크 우선이라 새 버전이 바로 반영됩니다. */
var CACHE = 'meal-calendar-v5';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './favicon.png?v=4', './icon-192.png?v=4', './icon-512.png?v=4'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
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

function isHtml(req, url) {
  if (req.mode === 'navigate') return true;
  if (url.pathname === '/' || /\/$/.test(url.pathname)) return true;
  return /\/index\.html$/.test(url.pathname);
}

/* 매니페스트도 네트워크 우선 — 홈 화면 이름·아이콘이 항상 최신 */
function isManifest(url) { return /\/manifest\.webmanifest$/.test(url.pathname); }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;

  /* 화면은 네트워크 우선 — 새로 올린 앱이 바로 보이게, 끊겼을 때만 캐시 */
  if (isHtml(req, url)) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); }).catch(function () { });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }

  /* 매니페스트도 네트워크 우선, 끊겼을 때만 캐시 (오프라인 설치 정보 유지) */
  if (isManifest(url)) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./manifest.webmanifest', copy); }).catch(function () { });
        }
        return res;
      }).catch(function () {
        return caches.match('./manifest.webmanifest').then(function (hit) { return hit || caches.match(req); });
      })
    );
    return;
  }

  /* 아이콘 등은 캐시 우선 */
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
