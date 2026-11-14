// สร้างโดย build/build.py — อย่าแก้ไฟล์นี้ตรง ๆ
// เปิดเว็บได้แม้ไม่มีเน็ต: มีเน็ต = โหลดของใหม่เสมอ (แล้วเก็บสำเนา) · ไม่มีเน็ต = ใช้สำเนาในเครื่อง
var CACHE = "calc-d2b29d6da4";
var CORE = ["./", "index.html", "01-function.html", "02-limit.html", "03-continuity.html", "04-derivative.html", "05-derivative-app.html", "06-optimization.html", "07-indefinite.html", "08-definite-area.html", "appendix-a-formulas.html", "appendix-b-playground.html", "appendix-c-course.html", "appendix-d-pen.html", "appendix-e-stats.html", "appendix-f-feedback.html", "assets/style.css", "assets/nav.js", "assets/widgets.js", "assets/ink.js", "assets/katex/katex.min.css", "assets/katex/katex.min.js", "assets/katex/contrib/auto-render.min.js", "icon/awesome.png", "icon/drink.png", "icon/drink2.png", "icon/electricity.png", "icon/library-diagram.png", "icon/me_cat.png", "icon/nap.png", "icon/prymania.jpg", "icon/thinking.png", "icon/well-done2.png", "icon/worker.png", "icon/worker5.png", "icon/you-did-it.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (/goatcounter\.com|gc\.zgo\.at|script\.google(usercontent)?\.com/.test(e.request.url)) return;   // สถิติผู้เข้าชม / FAQ (Apps Script): ไม่เก็บลง cache
  e.respondWith(fetch(e.request).then(function (res) {
    if (res && (res.ok || res.type === "opaque")) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || (e.request.mode === "navigate" ? caches.match("index.html") : undefined);
    });
  }));
});
