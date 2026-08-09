const CACHE_NAME = 'dibang-offline-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// 安装时：把网页和插件全部下载到手机本地缓存
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 运行时：拦截所有网络请求，直接从手机本地提取文件（实现彻底断网）
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response; // 如果本地有，就不耗费任何流量，直接返回
      return fetch(event.request);
    })
  );
});
