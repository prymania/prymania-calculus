// ---------- เมนูด้านซ้าย: คลิกชื่อบทเพื่อเปิดหน้าบทนั้น และกางหัวข้อย่อยของบทที่อ่านอยู่ ----------
(function () {
  var nav = document.querySelector(".course-nav");
  if (!nav) return;
  var aside = nav.closest("aside");
  var toggle = aside.querySelector(".nav-toggle");

  // จอเล็ก: ปุ่มเปิด/ปิดสารบัญ
  if (toggle) toggle.addEventListener("click", function () {
    var open = aside.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest(".nav-topics a, a.nav-title") && aside.classList.contains("nav-open")) {
      aside.classList.remove("nav-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  });

  // จอกว้าง: ปุ่ม « ซ่อนเมนู / ☰ เมนู แสดงกลับ (จำค่าไว้ทุกหน้า)
  function side(collapsed) {
    document.documentElement.classList.toggle("side-collapsed", collapsed);
    try { localStorage.setItem("side-collapsed", collapsed ? "1" : "0"); } catch (e) {}
  }
  var hideBtn = document.querySelector(".side-hide"), showBtn = document.querySelector(".side-show");
  if (hideBtn) hideBtn.addEventListener("click", function () { side(true); });
  if (showBtn) showBtn.addEventListener("click", function () { side(false); });

  // คงตำแหน่งเลื่อนของเมนูไว้เมื่อคลิกไปหน้าอื่น
  var KEY = "course-nav-scroll";
  function save() { try { sessionStorage.setItem(KEY, String(aside.scrollTop)); } catch (e) {} }
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) save(); });
  addEventListener("pagehide", save);
  var current = nav.querySelector(".nav-chapter[open]"), saved = null;
  try { saved = sessionStorage.getItem(KEY); } catch (e) {}
  if (saved !== null) aside.scrollTop = Number(saved);
  else if (current && aside.scrollHeight > aside.clientHeight) aside.scrollTop = current.offsetTop - 90;

  // ไฮไลต์หัวข้อย่อยที่กำลังอ่านอยู่
  if (!current || !("IntersectionObserver" in window)) return;
  var links = [];
  current.querySelectorAll('.nav-topics a[href^="#"]').forEach(function (a) {
    var t = document.getElementById(a.getAttribute("href").slice(1));
    if (t && t.id !== "lesson-content") links.push([t, a]);
  });
  var visible = new Set();
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    var first = links.find(function (l) { return visible.has(l[0]); });
    links.forEach(function (l) { l[1].classList.toggle("is-active", !!first && l === first); });
  }, { rootMargin: "0px 0px -60% 0px" });
  links.forEach(function (l) { obs.observe(l[0]); });
})();

// ---------- แสดงสูตรคณิตศาสตร์ด้วย KaTeX ----------
(function () {
  var done = false;
  function run() {
    if (done || !window.renderMathInElement) return;   // KaTeX ยังไม่พร้อม → รอรอบถัดไป (load)
    done = true;
    renderMathInElement(document.body, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
      throwOnError: false
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  // กันพลาด: ถ้าสคริปต์ KaTeX มาช้า (เช่นเน็ตช้า หรือ service worker กำลังติดตั้ง) ให้ลองอีกครั้งตอนโหลดหน้าเสร็จ
  addEventListener("load", run);
})();

// ---------- ไฮไลต์ Python อัตโนมัติ (<pre class="py">) ----------
(function () {
  var KW = "from import as def return if elif else for in while and or not None True False print lambda".split(" ");
  var kw = {}; KW.forEach(function (w) { kw[w] = 1; });
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var re = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g;
  document.querySelectorAll("pre.py").forEach(function (pre) {
    var src = pre.textContent, out = "", m;
    re.lastIndex = 0;
    while ((m = re.exec(src)) !== null) {
      if (m[1]) out += '<span class="c">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="s">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="n">' + m[3] + "</span>";
      else if (m[4]) {
        if (kw[m[4]]) out += '<span class="k">' + m[4] + "</span>";
        else if (src.charAt(re.lastIndex) === "(") out += '<span class="f">' + m[4] + "</span>";
        else out += m[4];
      } else out += esc(m[5]);
    }
    pre.innerHTML = out;
  });
})();

// ---------- ปุ่มคัดลอกในทุก code card ----------
(function () {
  function copy(text, done) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done); return; }
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy");
    document.body.removeChild(ta); done();
  }
  window.__copyText = copy;
  document.querySelectorAll(".code").forEach(function (block) {
    var head = block.querySelector(".code-head");
    var pre = block.querySelector("pre.py");
    if (!head || !pre) return;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "copy-btn"; btn.textContent = "คัดลอก";
    btn.addEventListener("click", function () {
      copy(pre.textContent, function () {
        btn.textContent = "คัดลอกแล้ว ✓"; btn.classList.add("copied");
        setTimeout(function () { btn.textContent = "คัดลอก"; btn.classList.remove("copied"); }, 1500);
      });
    });
    head.appendChild(btn);
  });
})();

// ---------- ถอดรหัสเฉลย ----------
// build.py เข้ารหัสเฉลยแต่ละข้อด้วย AES-GCM (กุญแจ = PBKDF2 ของรหัสบทนั้น) เว็บไม่มีรหัสเก็บไว้
// รหัสจริงอยู่ใน private/passwords.json ของอาจารย์เท่านั้น · พิมพ์รหัสถูก = ถอดเฉลยได้, ผิด = ถอดไม่ออก
window.__calcUnlock = (function () {
  var ITER = 150000;   // ต้องตรงกับ KDF_ITER ใน build/build.py
  var te = new TextEncoder();
  function bytes(b64) { var b = atob(b64), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function deriveKey(kind, chap, pw) {
    var salt = crypto.subtle.digest("SHA-256", te.encode("calc1204105:" + kind + ":" + chap));
    var base = crypto.subtle.importKey("raw", te.encode(pw), "PBKDF2", false, ["deriveKey"]);
    return Promise.all([salt, base]).then(function (r) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: new Uint8Array(r[0]).slice(0, 16), iterations: ITER, hash: "SHA-256" },
        r[1], { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    });
  }
  function math(el) {
    if (window.renderMathInElement) renderMathInElement(el, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }], throwOnError: false });
  }
  // ถอดทุกกล่องใน els → Promise<true> ถ้ารหัสถูก, <false> ถ้าผิด
  return function (kind, chap, pw, els) {
    els = els.filter(function (el) { return el.hasAttribute("data-enc"); });
    if (!els.length) return Promise.resolve(true);
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error("เบราว์เซอร์นี้ถอดรหัสไม่ได้ (ต้องเปิดผ่าน https)"));
    return deriveKey(kind, chap, pw).then(function (key) {
      return Promise.all(els.map(function (el) {
        var u = bytes(el.getAttribute("data-enc"));
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: u.slice(0, 12) }, key, u.slice(12)).then(function (buf) {
          return [el, new TextDecoder().decode(buf)];
        });
      }));
    }).then(function (pairs) {
      pairs.forEach(function (p) { p[0].innerHTML = p[1]; p[0].removeAttribute("data-enc"); math(p[0]); });
      return true;
    }, function () { return false; });
  };
})();

// ---------- ปุ่มดูเฉลย / ซ่อนเฉลย (ตัวอย่างในเนื้อหา — รหัสตัวอย่างของบท) ----------
(function () {
  var m = location.pathname.match(/(?:^|\/)(\d+)-[^\/]*$/);       // 02-limit.html → บท 2
  var CH = m ? parseInt(m[1], 10) : null;                           // หน้าที่ไม่ใช่บทเรียน: ไม่ล็อก
  var KEY = "calcExamplesPw-" + CH;
  var boxes = [].slice.call(document.querySelectorAll(".answer[data-enc]"));
  function saved() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function remember(pw) { try { sessionStorage.setItem(KEY, pw); } catch (e) {} }
  function unlock(pw) { return window.__calcUnlock("examples", CH, pw, boxes); }
  var forms = [];

  function lockForm(btn, onOpen) {
    var form = document.createElement("form");
    form.className = "review-lock ans-lock";
    form.hidden = true;
    form.innerHTML = '<label>รหัสผ่านสำหรับดูเฉลยตัวอย่าง<input type="password" autocomplete="off" placeholder="รหัสผ่าน"></label>' +
      '<button type="submit">ตกลง</button><span class="review-msg"></span>';
    var input = form.querySelector("input"), msg = form.querySelector(".review-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = input.value;
      msg.textContent = "กำลังตรวจ…";
      unlock(pw).then(function (good) {
        if (!good) { msg.textContent = "รหัสผ่านไม่ถูกต้อง"; input.select(); return; }
        remember(pw); input.value = ""; msg.textContent = "";
        forms.forEach(function (f) { f.hidden = true; });   // ปลดล็อกทั้งบทแล้ว ซ่อนฟอร์มอื่นที่เปิดค้างไว้ด้วย
        onOpen();
      }, function (err) { msg.textContent = err.message; });
    });
    btn.insertAdjacentElement("afterend", form);
    forms.push(form);
    return form;
  }

  document.querySelectorAll(".ans-btn").forEach(function (btn) {
    var ans = btn.nextElementSibling;
    if (!ans || !ans.classList.contains("answer")) return;
    function set(open) {
      ans.classList.toggle("show", open);
      btn.classList.toggle("open", open);
      btn.textContent = open ? "ซ่อนเฉลย" : "ดูเฉลย";
    }
    var form = null;
    btn.addEventListener("click", function () {
      if (ans.classList.contains("show")) { set(false); return; }
      if (!ans.hasAttribute("data-enc")) { set(true); return; }          // ถอดแล้ว หรือหน้าที่ไม่ล็อก
      var pw = saved();
      if (pw) { unlock(pw).then(function (good) { if (good) set(true); }); return; }
      form = form || lockForm(btn, function () { set(true); });
      form.hidden = !form.hidden;
      form.querySelector(".review-msg").textContent = "";
      if (!form.hidden) form.querySelector("input").focus();
    });
  });
})();

// ---------- ปุ่มคัดลอกคำถามท้ายบททั้งหมด (พร้อมเลขข้อ) ----------
(function () {
  function plain(node) {
    var c = node.cloneNode(true);
    c.querySelectorAll(".rv-ans").forEach(function (x) { x.remove(); });
    // ใช้ต้นฉบับ LaTeX ของสูตรแทนตัวที่แสดงผลแล้ว
    c.querySelectorAll(".katex").forEach(function (k) {
      var a = k.querySelector("annotation");
      k.replaceWith(document.createTextNode(a ? " " + a.textContent + " " : k.textContent));
    });
    return c.textContent.replace(/\s+/g, " ").trim();
  }
  document.querySelectorAll(".review").forEach(function (box) {
    var btn = box.querySelector(".review-copy");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var lines = [], n = 0;
      box.querySelectorAll("ol > li").forEach(function (li) {
        var txt = plain(li);
        if (li.classList.contains("part")) { lines.push("", "[" + txt + "]"); return; }
        n += 1; lines.push(n + ". " + txt);
      });
      var text = "คำถามท้ายบท — " + document.title.split(" — ")[0] + "\n" + lines.join("\n").replace(/^\n/, "");
      window.__copyText(text, function () {
        btn.textContent = "คัดลอกแล้ว ✓"; btn.classList.add("copied");
        setTimeout(function () { btn.textContent = "คัดลอกคำถามทั้งหมด"; btn.classList.remove("copied"); }, 1600);
      });
    });
  });
})();

// ---------- เฉลยคำถามท้ายบท (รหัสคำถามท้ายบทของบท — ถอดรหัสด้วย __calcUnlock) ----------
(function () {
  var m = location.pathname.match(/(?:^|\/)(\d+)-[^\/]*$/);       // 02-limit.html → บท 2
  var CH = m ? parseInt(m[1], 10) : null;
  var KEY = "calcAnswersPw-" + CH;
  function saved() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function remember(pw) { try { sessionStorage.setItem(KEY, pw); } catch (e) {} }
  document.querySelectorAll(".review").forEach(function (box) {
    var btn = box.querySelector(".review-key"), form = box.querySelector(".review-lock");
    if (!btn || !form) return;
    var sols = [].slice.call(box.querySelectorAll(".rv-ans"));
    if (!sols.length) { btn.hidden = true; return; }
    var input = form.querySelector("input"), msg = form.querySelector(".review-msg");
    function unlock(pw) { return window.__calcUnlock("exercises", CH, pw, sols); }
    function show(on) {
      box.classList.toggle("unlocked", on);
      btn.textContent = on ? "ซ่อนเฉลย" : "ดูเฉลย";
      form.hidden = true;
    }
    btn.addEventListener("click", function () {
      if (box.classList.contains("unlocked")) { show(false); return; }
      if (!box.querySelector(".rv-ans[data-enc]")) { show(true); return; }
      var pw = saved();
      if (pw) { unlock(pw).then(function (good) { if (good) show(true); }); return; }
      form.hidden = !form.hidden;
      msg.textContent = "";
      if (!form.hidden) input.focus();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pw = input.value;
      msg.textContent = "กำลังตรวจ…";
      unlock(pw).then(function (good) {
        if (!good) { msg.textContent = "รหัสผ่านไม่ถูกต้อง"; input.select(); return; }
        remember(pw); input.value = ""; msg.textContent = ""; show(true);
      }, function (err) { msg.textContent = err.message; });
    });
  });
})();

// ---------- เปิดเว็บได้แม้ไม่มีเน็ต (service worker: docs/sw.js สร้างโดย build.py) ----------
(function () {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  if (!/(^|\/)[^\/]*\.html$|\/$/.test(location.pathname) || /\/assets\//.test(location.pathname)) return;
  addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
})();
