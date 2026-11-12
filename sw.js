// DiBang 离线缓存 v2：只缓存本站本地文件，不再碰任何国外 CDN。
// 旧版的问题：缓存列表里有国外 CDN 上的 xlsx 文件，
// 不开 VPN 时这个地址打不开，cache.addAll 只要其中一个失败就整个安装失败，
// 结果是什么都没缓存；而且它根本没缓存本地的 vue.global.prod.js / xlsx.full.min.js，
// 也就是 app 真正用的那两个文件，断网时自然打不开。
const CACHE_NAME = 'dibang-offline-v39';
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './vue.global.prod.js',
  './xlsx.full.min.js'
];
// 图标不一定在仓库根目录，单个缓存、失败也不影响主文件
const OPTIONAL_FILES = [
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // 逐个缓存：一个文件失败（比如图标不在仓库里）也不拖垮整个安装
      Promise.all(CORE_FILES.concat(OPTIONAL_FILES).map(url =>
        cache.add(url).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 同源文件联网拿到后顺手存一份，下次断网也能用
        if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        // 断网且没缓存时，打开 app 至少回到缓存的首页，而不是白屏报错
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw new Error('offline and not cached');
      });
    })
  );
});
