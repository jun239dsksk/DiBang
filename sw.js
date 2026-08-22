const CACHE_NAME = 'dibang-offline-v14'; // 每次更新必须改大版本号 (如 v5, v6)

// 必须缓存的核心文件
const REQUIRED_FILES = [
  './',
  './index.html',
  './manifest.json',
  './xlsx.full.min.js',
  './vue.global.prod.js'
];

// 可选文件 (即使找不到也不会中断缓存)
const OPTIONAL_FILES = [
  './icon.png'
];

// 1. 安装 Service Worker 并容错写入缓存
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 强制覆盖旧版
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 逐个缓存核心文件
      for (const file of REQUIRED_FILES) {
        try {
          await cache.add(file);
        } catch (err) {
          console.error('[SW] 核心文件缓存失败，请检查文件路径是否正确:', file, err);
        }
      }
      // 逐个缓存可选文件
      for (const file of OPTIONAL_FILES) {
        try {
          await cache.add(file);
        } catch (err) {
          console.warn('[SW] 可选文件未找到(跳过):', file);
        }
      }
    })
  );
});

// 2. 激活并自动清理旧版废弃缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 拦截网络请求：优先读取本地缓存，断网时自动回退，彻底防止白屏
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // 命中缓存，直接离线读取
      }
      
      // 未命中缓存时尝试联网 Fetch，并自动动态写入缓存
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 完全断网且未命中任何缓存时的防白屏保底机制
        return caches.match('./index.html') || caches.match('./');
      });
    })
  );
});
