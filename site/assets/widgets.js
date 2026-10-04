// ============================================================
//  กราฟโต้ตอบ (interactive widgets) สำหรับเว็บแคลคูลัส
//  ใช้: <div class="widget" data-w="secant" data-f="x^2" ...></div>
// ============================================================
(function () {
  "use strict";
  var C = { grape: "#6C4CE0", coral: "#FF6B5B", mint: "#12B5A0", mango: "#E39B00", sky: "#2F80ED", rose: "#E04A6E",
    ink: "#231E3D", mute: "#8A85A3", grid: "#EEEAF6", axis: "#5F5A7A" };

  // ---------- ตัวแปลงนิพจน์คณิตศาสตร์ (รองรับ ^, ลบหน้าเลข, คูณแบบไม่ต้องเขียน *, |x|) ----------
  var FN = { sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan, ln: Math.log, log: Math.log, exp: Math.exp };
  var CONST = { pi: Math.PI, e: Math.E };
  function compile(src) {
    var s = String(src).replace(/\*\*/g, "^").replace(/\s+/g, ""), i = 0;
    var toks = [];
    while (i < s.length) {
      var ch = s[i], m;
      if ((m = /^\d*\.?\d+(?:e[+-]?\d+)?/i.exec(s.slice(i))) && /[\d.]/.test(ch)) { toks.push({ t: "n", v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (/[a-zA-Z]/.test(ch)) {
        m = /^[a-zA-Z]+/.exec(s.slice(i))[0];
        // แยกชื่อที่ติดกัน เช่น "xsqrt" หรือ "xx"
        var w = m, out = [];
        while (w.length) {
          var hit = null;
          ["sqrt", "abs", "sin", "cos", "tan", "exp", "ln", "log", "pi", "e", "x"].some(function (k) { if (w.indexOf(k) === 0) { hit = k; return true; } return false; });
          if (!hit) throw new Error("ไม่รู้จัก '" + w + "'");
          out.push(hit); w = w.slice(hit.length);
        }
        out.forEach(function (k) { toks.push({ t: "id", v: k }); });
        i += m.length; continue;
      }
      if ("+-*/^()|,".indexOf(ch) >= 0) { toks.push({ t: ch }); i++; continue; }
      throw new Error("อักขระ '" + ch + "' ใช้ไม่ได้");
    }
    var p = 0;
    function peek() { return toks[p]; }
    function eat(t) { if (!toks[p] || toks[p].t !== t) throw new Error("รูปแบบนิพจน์ไม่ถูกต้อง"); p++; }
    function startsFactor(k) { return k && (k.t === "n" || k.t === "id" || k.t === "("); }
    function expr() {
      var a = term();
      while (peek() && (peek().t === "+" || peek().t === "-")) {
        var op = toks[p++].t, b = term();
        a = (function (A, b, plus) {
          return plus ? function (x) { return A(x) + b(x); } : function (x) { return A(x) - b(x); };
        })(a, b, op === "+");
      }
      return a;
    }
    function term() {
      var a = unary();
      for (;;) {
        var k = peek();
        if (k && (k.t === "*" || k.t === "/")) {
          p++; var b = unary(), A = a;
          a = k.t === "*" ? (function (A, b) { return function (x) { return A(x) * b(x); }; })(A, b)
                          : (function (A, b) { return function (x) { return A(x) / b(x); }; })(A, b);
        } else if (startsFactor(k)) {
          var b2 = power(), A2 = a;
          a = (function (A, b) { return function (x) { return A(x) * b(x); }; })(A2, b2);
        } else break;
      }
      return a;
    }
    function unary() {
      var k = peek();
      if (k && k.t === "-") { p++; var u = unary(); return function (x) { return -u(x); }; }
      if (k && k.t === "+") { p++; return unary(); }
      return power();
    }
    function power() {
      var b = primary();
      if (peek() && peek().t === "^") {
        p++; var e = unary();
        return function (x) {
          var B = b(x), E = e(x);
          if (B < 0 && Math.abs(E - Math.round(E)) > 1e-12) {        // เช่น x^(1/3) ของจำนวนลบ
            var q = Math.round(1 / E);
            if (Math.abs(1 / E - q) < 1e-9 && q % 2) return -Math.pow(-B, E);
          }
          return Math.pow(B, E);
        };
      }
      return b;
    }
    function primary() {
      var k = toks[p++];
      if (!k) throw new Error("นิพจน์ไม่ครบ");
      if (k.t === "n") { var v = k.v; return function () { return v; }; }
      if (k.t === "(") { var e = expr(); eat(")"); return e; }
      if (k.t === "|") { var e2 = expr(); eat("|"); return function (x) { return Math.abs(e2(x)); }; }
      if (k.t === "id") {
        if (k.v === "x") return function (x) { return x; };
        if (CONST[k.v] !== undefined) { var c = CONST[k.v]; return function () { return c; }; }
        var f = FN[k.v];
        if (peek() && peek().t === "(") { p++; var arg = expr(); eat(")"); return function (x) { return f(arg(x)); }; }
        var arg2 = power();                                            // เช่น sqrt x
        return function (x) { return f(arg2(x)); };
      }
      throw new Error("รูปแบบนิพจน์ไม่ถูกต้อง");
    }
    var fn = expr();
    if (p !== toks.length) throw new Error("รูปแบบนิพจน์ไม่ถูกต้อง");
    return function (x) { var y = fn(x); return typeof y === "number" ? y : NaN; };
  }
  window.CalcCompile = compile;

  var deriv = function (f, x) { var h = 1e-5 * Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); };
  function simpson(f, a, b, n) {
    n = n || 2000; var h = (b - a) / n, s = f(a) + f(b);
    for (var i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
    return s * h / 3;
  }
  function fmt(v, d) {
    if (!isFinite(v)) return isNaN(v) ? "หาค่าไม่ได้" : (v > 0 ? "∞" : "−∞");
    d = d === undefined ? 4 : d;
    var r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    if (Object.is(r, -0)) r = 0;
    return String(r).replace("-", "−");
  }
  function niceStep(r) {
    var raw = r / 8, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
  }

  // ---------- ตัววาดกราฟบน canvas ----------
  function Plot(canvas, xr, yr) {
    this.cv = canvas; this.ctx = canvas.getContext("2d"); this.xr = xr; this.yr = yr;
  }
  Plot.prototype.size = function () {
    var dpr = window.devicePixelRatio || 1, w = this.cv.clientWidth, h = this.cv.clientHeight;
    this.cv.width = w * dpr; this.cv.height = h * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h; this.pl = 40; this.pr = 12; this.pt = 12; this.pb = 26;
  };
  Plot.prototype.X = function (x) { return this.pl + (x - this.xr[0]) / (this.xr[1] - this.xr[0]) * (this.w - this.pl - this.pr); };
  Plot.prototype.Y = function (y) { return this.pt + (this.yr[1] - y) / (this.yr[1] - this.yr[0]) * (this.h - this.pt - this.pb); };
  Plot.prototype.invX = function (px) { return this.xr[0] + (px - this.pl) / (this.w - this.pl - this.pr) * (this.xr[1] - this.xr[0]); };
  Plot.prototype.clear = function () {
    var c = this.ctx, xr = this.xr, yr = this.yr, self = this;
    this.size(); c.clearRect(0, 0, this.w, this.h);
    var sx = niceStep(xr[1] - xr[0]), sy = niceStep(yr[1] - yr[0]);
    c.lineWidth = 1; c.strokeStyle = C.grid; c.font = "11px JetBrains Mono, monospace"; c.fillStyle = C.mute;
    var ax = Math.min(Math.max(0, yr[0]), yr[1]), ay = Math.min(Math.max(0, xr[0]), xr[1]);
    for (var gx = Math.ceil(xr[0] / sx) * sx; gx <= xr[1] + 1e-9; gx += sx) {
      var X = this.X(gx); c.beginPath(); c.moveTo(X, this.pt); c.lineTo(X, this.h - this.pb); c.stroke();
      if (Math.abs(gx) > 1e-9) { c.textAlign = "center"; c.fillText(fmt(gx, 3), X, Math.min(this.Y(ax) + 14, this.h - 8)); }
    }
    for (var gy = Math.ceil(yr[0] / sy) * sy; gy <= yr[1] + 1e-9; gy += sy) {
      var Y = this.Y(gy); c.beginPath(); c.moveTo(this.pl, Y); c.lineTo(this.w - this.pr, Y); c.stroke();
      if (Math.abs(gy) > 1e-9) { c.textAlign = "right"; c.fillText(fmt(gy, 3), Math.max(this.X(ay) - 5, 34), Y + 4); }
    }
    c.strokeStyle = C.axis; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(this.pl, this.Y(ax)); c.lineTo(this.w - this.pr, this.Y(ax)); c.stroke();
    c.beginPath(); c.moveTo(this.X(ay), this.pt); c.lineTo(this.X(ay), this.h - this.pb); c.stroke();
    c.textAlign = "right"; c.fillText("0", this.X(ay) - 4, this.Y(ax) + 13);
    // พื้นที่วาด (clip)
    c.save(); c.beginPath(); c.rect(this.pl, this.pt, this.w - this.pl - this.pr, this.h - this.pt - this.pb); c.clip();
    this._clipped = true; void self;
  };
  Plot.prototype.done = function () { if (this._clipped) { this.ctx.restore(); this._clipped = false; } };
  Plot.prototype.curve = function (f, color, width, dash, from, to) {
    var c = this.ctx, a = from === undefined ? this.xr[0] : from, b = to === undefined ? this.xr[1] : to;
    var n = 700, span = this.yr[1] - this.yr[0], prev = null;
    c.strokeStyle = color; c.lineWidth = width || 2.6; c.setLineDash(dash || []); c.lineJoin = "round"; c.lineCap = "round";
    c.beginPath();
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n, y = f(x);
      if (!isFinite(y) || (prev !== null && Math.abs(y - prev) > span * 1.5)) { prev = isFinite(y) ? y : null; if (isFinite(y)) c.moveTo(this.X(x), this.Y(y)); continue; }
      var Y = this.Y(Math.max(Math.min(y, this.yr[1] + span * 2), this.yr[0] - span * 2));
      if (prev === null) c.moveTo(this.X(x), Y); else c.lineTo(this.X(x), Y);
      prev = y;
    }
    c.stroke(); c.setLineDash([]);
  };
  Plot.prototype.line = function (x1, y1, x2, y2, color, width, dash) {
    var c = this.ctx; c.strokeStyle = color; c.lineWidth = width || 1.6; c.setLineDash(dash || []);
    c.beginPath(); c.moveTo(this.X(x1), this.Y(y1)); c.lineTo(this.X(x2), this.Y(y2)); c.stroke(); c.setLineDash([]);
  };
  Plot.prototype.dot = function (x, y, color, open, r) {
    var c = this.ctx; r = r || 5.5; c.beginPath(); c.arc(this.X(x), this.Y(y), r, 0, 7);
    if (open) { c.fillStyle = "#fff"; c.fill(); c.lineWidth = 2.4; c.strokeStyle = color; c.stroke(); }
    else { c.fillStyle = color; c.fill(); c.lineWidth = 1.5; c.strokeStyle = "#fff"; c.stroke(); }
  };
  Plot.prototype.text = function (s, x, y, color, align, dy) {
    var c = this.ctx; c.font = "bold 13px Anuphan, sans-serif"; c.textAlign = align || "left";
    c.lineWidth = 4; c.strokeStyle = "#fff"; c.strokeText(s, this.X(x), this.Y(y) + (dy || 0));
    c.fillStyle = color; c.fillText(s, this.X(x), this.Y(y) + (dy || 0));
  };
  Plot.prototype.fillBetween = function (f, a, b, color, alpha) {
    var c = this.ctx, n = 300; c.globalAlpha = alpha || 0.22; c.fillStyle = color; c.beginPath();
    c.moveTo(this.X(a), this.Y(0));
    for (var i = 0; i <= n; i++) { var x = a + (b - a) * i / n, y = f(x); c.lineTo(this.X(x), this.Y(isFinite(y) ? y : 0)); }
    c.lineTo(this.X(b), this.Y(0)); c.closePath(); c.fill(); c.globalAlpha = 1;
  };
  Plot.prototype.rect = function (x0, x1, y, color, alpha) {
    var c = this.ctx, X0 = this.X(x0), X1 = this.X(x1), Y0 = this.Y(0), Y1 = this.Y(y);
    c.globalAlpha = alpha || 0.28; c.fillStyle = color; c.fillRect(X0, Math.min(Y0, Y1), X1 - X0, Math.abs(Y1 - Y0));
    c.globalAlpha = 0.9; c.strokeStyle = color; c.lineWidth = 1; c.strokeRect(X0, Math.min(Y0, Y1), X1 - X0, Math.abs(Y1 - Y0)); c.globalAlpha = 1;
  };

  function autoY(f, xr) {
    var vals = [];
    for (var i = 0; i <= 400; i++) { var y = f(xr[0] + (xr[1] - xr[0]) * i / 400); if (isFinite(y)) vals.push(y); }
    if (!vals.length) return [-10, 10];
    vals.sort(function (a, b) { return a - b; });
    var lo = vals[Math.floor(vals.length * 0.03)], hi = vals[Math.ceil(vals.length * 0.97) - 1];
    lo = Math.min(lo, 0); hi = Math.max(hi, 0);
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    var pad = (hi - lo) * 0.12; return [lo - pad, hi + pad];
  }
  function nums(s, d) { return s ? s.split(",").map(Number) : d; }
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (html !== undefined) e.innerHTML = html; return e; }
  function shell(box, title, tag) {
    box.innerHTML = "";
    var head = el("div", { "class": "widget-head" }, '<span class="tag">' + (tag || "ลองเล่น") + "</span>" + title);
    var body = el("div", { "class": "widget-body" });
    var cv = el("canvas"); body.appendChild(cv);
    var ctl = el("div", { "class": "wctl" }), out = el("div", { "class": "wout" });
    body.appendChild(ctl); body.appendChild(out);
    box.appendChild(head); box.appendChild(body);
    if (box.dataset.h) cv.style.height = box.dataset.h + "px";
    return { cv: cv, ctl: ctl, out: out, body: body };
  }
  function slider(ctl, label, min, max, step, val) {
    var lab = el("label", {}, label), r = el("input", { type: "range", min: min, max: max, step: step, value: val });
    lab.appendChild(r); ctl.appendChild(lab); return r;
  }
  function onResize(fn) { var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(fn, 80); }); }

  // ---------- 1) ลิมิต: x เข้าใกล้ a จากสองฝั่ง ----------
  function approach(box) {
    var d = box.dataset, a = parseFloat(d.a), fl = compile(d.fl || d.f), fr = compile(d.fr || d.f);
    var xr = nums(d.x, [a - 3, a + 3]), yr = nums(d.y, null);
    var u = shell(box, d.title || "ให้ x วิ่งเข้าหา " + a + " จากทั้งสองฝั่ง");
    var fv = function (x) { return x < a ? fl(x) : x > a ? fr(x) : (d.fa !== undefined ? parseFloat(d.fa) : NaN); };
    if (!yr) yr = autoY(fv, xr);
    var P = new Plot(u.cv, xr, yr);
    var r = slider(u.ctl, "ระยะห่าง δ", 0, 3, 0.05, 0);
    u.ctl.appendChild(el("span", { "class": "wnote" }, "เลื่อนไปทางขวา → δ เล็กลงเรื่อย ๆ (1 → 0.001)"));
    function draw() {
      var dl = Math.pow(10, -parseFloat(r.value)), xl = a - dl, xR = a + dl, yl = fl(xl), yR = fr(xR);
      var Ll = fl(a - 1e-7), Lr = fr(a + 1e-7);
      P.clear();
      P.curve(fl, C.grape, 2.8, null, xr[0], a); P.curve(fr, C.grape, 2.8, null, a, xr[1]);
      P.line(xl, 0, xl, yl, C.mint, 1.4, [4, 4]); P.line(xR, 0, xR, yR, C.coral, 1.4, [4, 4]);
      P.line(xr[0], yl, xl, yl, C.mint, 1.2, [2, 4]); P.line(xr[0], yR, xR, yR, C.coral, 1.2, [2, 4]);
      if (isFinite(Ll)) P.dot(a, Ll, C.grape, true, 5.5);
      if (isFinite(Lr) && Math.abs(Lr - Ll) > 1e-6) P.dot(a, Lr, C.grape, true, 5.5);
      if (d.fa !== undefined) P.dot(a, parseFloat(d.fa), C.grape, false, 5.5);
      P.dot(xl, yl, C.mint, false, 6.5); P.dot(xR, yR, C.coral, false, 6.5);
      P.done();
      var same = Math.abs(Ll - Lr) < 1e-4;
      u.out.innerHTML = '<span class="pos">ฝั่งซ้าย x = ' + fmt(xl, 4) + " → f(x) = " + fmt(yl, 4) + "</span>" +
        '<span class="hot">ฝั่งขวา x = ' + fmt(xR, 4) + " → f(x) = " + fmt(yR, 4) + "</span>" +
        "<span>" + (same ? "ทั้งสองฝั่งเข้าใกล้ " + fmt(Ll, 3) + " ⇒ ลิมิต = " + fmt(Ll, 3) : "ซ้ายเข้าใกล้ " + fmt(Ll, 3) + " แต่ขวาเข้าใกล้ " + fmt(Lr, 3) + " ⇒ ลิมิตหาค่าไม่ได้") + "</span>";
    }
    r.addEventListener("input", draw); onResize(draw); draw();
  }

  // ---------- 2) เส้นตัด → เส้นสัมผัส ----------
  function secant(box) {
    var d = box.dataset, f = compile(d.f), x0 = parseFloat(d.x0), xr = nums(d.x, [x0 - 3, x0 + 4]);
    var yr = nums(d.y, null) || autoY(f, xr);
    var u = shell(box, d.title || "เส้นตัด (secant) กลายเป็นเส้นสัมผัส (tangent) เมื่อ h → 0");
    var P = new Plot(u.cv, xr, yr);
    var r = slider(u.ctl, "h", 0, 3, 0.02, 0);
    var tg = el("label", {}, '<input type="checkbox" checked> แสดงเส้นสัมผัสจริง'); u.ctl.appendChild(tg);
    var cb = tg.querySelector("input");
    function draw() {
      var h = 2 * Math.pow(10, -parseFloat(r.value) * 1.1), y0 = f(x0), y1 = f(x0 + h), m = (y1 - y0) / h, mt = deriv(f, x0);
      P.clear();
      P.curve(f, C.grape, 2.8);
      if (cb.checked) P.curve(function (x) { return y0 + mt * (x - x0); }, C.mint, 1.6, [6, 5]);
      P.curve(function (x) { return y0 + m * (x - x0); }, C.coral, 2.2);
      P.line(x0, y0, x0 + h, y0, C.mango, 1.6, [3, 3]); P.line(x0 + h, y0, x0 + h, y1, C.mango, 1.6, [3, 3]);
      P.dot(x0, y0, C.grape); P.dot(x0 + h, y1, C.coral);
      P.text("P", x0, y0, C.grape, "right", -10); P.text("Q", x0 + h, y1, C.coral, "left", -10);
      P.done();
      u.out.innerHTML = "<span>h = " + fmt(h, 5) + "</span><span>Δy = f(x+h) − f(x) = " + fmt(y1 - y0, 5) + "</span>" +
        '<span class="hot">ความชันเส้นตัด Δy/Δx = ' + fmt(m, 5) + "</span>" + '<span class="pos">ความชันเส้นสัมผัส f′(' + fmt(x0, 3) + ") = " + fmt(mt, 4) + "</span>";
    }
    r.addEventListener("input", draw); cb.addEventListener("change", draw); onResize(draw); draw();
  }

  // ---------- 3) เลื่อนเส้นสัมผัสไปตามกราฟ ----------
  function critPoints(f, xr) {
    var res = [], n = 800, prev = null, px = null;
    for (var i = 0; i <= n; i++) {
      var x = xr[0] + (xr[1] - xr[0]) * i / n, g = deriv(f, x);
      if (prev !== null && isFinite(g) && isFinite(prev) && (g === 0 || prev * g < 0)) {
        var lo = px, hi = x;
        for (var k = 0; k < 60; k++) { var mid = (lo + hi) / 2; if (deriv(f, lo) * deriv(f, mid) <= 0) hi = mid; else lo = mid; }
        var c = (lo + hi) / 2; if (!res.length || Math.abs(res[res.length - 1] - c) > 1e-4) res.push(c);
      }
      // จุดที่ความชันแตะ 0 แต่ไม่เปลี่ยนเครื่องหมาย (เช่น x^3)
      if (prev !== null && Math.abs(g) < 1e-3 && Math.abs(prev) < 1e-2) {
        var c2 = Math.round(x * 1000) / 1000; if (Math.abs(deriv(f, c2)) < 1e-6 && (!res.length || Math.abs(res[res.length - 1] - c2) > 1e-2)) res.push(c2);
      }
      prev = g; px = x;
    }
    return res;
  }
  function tangent(box) {
    var d = box.dataset, f = compile(d.f), xr = nums(d.x, [-4, 4]), yr = nums(d.y, null) || autoY(f, xr);
    var u = shell(box, d.title || "เลื่อนจุดไปตามกราฟ ดูความชันและเส้นสัมผัส");
    var P = new Plot(u.cv, xr, yr), crit = critPoints(f, xr);
    var x0 = d.x0 !== undefined ? parseFloat(d.x0) : (xr[0] + xr[1]) / 2;
    var r = slider(u.ctl, "x", xr[0], xr[1], (xr[1] - xr[0]) / 400, x0);
    var dragging = false;
    function draw() {
      var x = parseFloat(r.value), y = f(x), m = deriv(f, x), state = Math.abs(m) < 0.02 ? 0 : m > 0 ? 1 : -1;
      var col = state === 1 ? C.mint : state === -1 ? C.rose : C.mango;
      P.clear();
      if (d.bands !== "0") {   // แถบสีบอกช่วงเพิ่ม/ลด
        var pts = [xr[0]].concat(crit, [xr[1]]);
        for (var i = 0; i < pts.length - 1; i++) {
          var mid = (pts[i] + pts[i + 1]) / 2, s = deriv(f, mid) > 0;
          P.ctx.fillStyle = s ? "rgba(18,181,160,.07)" : "rgba(224,74,110,.07)";
          P.ctx.fillRect(P.X(pts[i]), P.pt, P.X(pts[i + 1]) - P.X(pts[i]), P.h - P.pt - P.pb);
        }
      }
      P.curve(f, C.grape, 2.8);
      P.curve(function (t) { return y + m * (t - x); }, col, 2.2);
      crit.forEach(function (c) { P.dot(c, f(c), C.mango, false, 5); });
      P.dot(x, y, col, false, 7);
      P.done();
      u.out.innerHTML = "<span>x = " + fmt(x, 3) + "</span><span>f(x) = " + fmt(y, 3) + "</span>" +
        '<span class="' + (state === 1 ? "pos" : state === -1 ? "neg" : "hot") + '">ความชัน f′(x) = ' + fmt(m, 3) + " → " +
        (state === 1 ? "ฟังก์ชันเพิ่ม ↗" : state === -1 ? "ฟังก์ชันลด ↘" : "จุดวิกฤต (ความชัน ≈ 0)") + "</span>" +
        (crit.length ? "<span>จุดวิกฤตบนกราฟนี้: x ≈ " + crit.map(function (c) { return fmt(c, 3); }).join(", ") + "</span>" : "");
    }
    function fromEvent(e) {
      var rect = u.cv.getBoundingClientRect(), px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      r.value = Math.max(xr[0], Math.min(xr[1], P.invX(px))); draw();
    }
    u.cv.addEventListener("pointerdown", function (e) { dragging = true; fromEvent(e); });
    window.addEventListener("pointermove", function (e) { if (dragging) fromEvent(e); });
    window.addEventListener("pointerup", function () { dragging = false; });
    u.ctl.appendChild(el("span", { "class": "wnote" }, "ลากบนกราฟได้เลย · จุดสีเหลือง = จุดวิกฤต · พื้นเขียว = ช่วงเพิ่ม, พื้นชมพู = ช่วงลด"));
    r.addEventListener("input", draw); onResize(draw); draw();
  }

  // ---------- 4) ผลรวมรีมันน์ → พื้นที่ใต้กราฟ ----------
  function riemann(box) {
    var d = box.dataset, f = compile(d.f), a = parseFloat(d.a), b = parseFloat(d.b);
    var xr = nums(d.x, [a - (b - a) * 0.15, b + (b - a) * 0.15]), yr = nums(d.y, null) || autoY(f, xr);
    var u = shell(box, d.title || "แบ่งพื้นที่เป็นสี่เหลี่ยมผืนผ้า ยิ่งแบ่งมาก ยิ่งใกล้ค่าจริง");
    var P = new Plot(u.cv, xr, yr);
    var r = slider(u.ctl, "จำนวนสี่เหลี่ยม n", 1, 80, 1, d.n || 4);
    var sel = el("select", {}, '<option value="l">ใช้ขอบซ้าย</option><option value="m" selected>ใช้จุดกึ่งกลาง</option><option value="r">ใช้ขอบขวา</option>');
    var lab = el("label", {}, "ความสูงจาก "); lab.appendChild(sel); u.ctl.appendChild(lab);
    var exact = simpson(f, a, b);
    function draw() {
      var n = parseInt(r.value, 10), dx = (b - a) / n, s = 0, mode = sel.value;
      P.clear();
      for (var i = 0; i < n; i++) {
        var xl = a + i * dx, xs = mode === "l" ? xl : mode === "r" ? xl + dx : xl + dx / 2, h = f(xs);
        s += h * dx; P.rect(xl, xl + dx, h, h >= 0 ? C.grape : C.rose, 0.25);
      }
      P.curve(f, C.coral, 2.8); P.line(a, yr[0], a, yr[1], C.mute, 1, [3, 4]); P.line(b, yr[0], b, yr[1], C.mute, 1, [3, 4]);
      P.done();
      u.out.innerHTML = "<span>n = " + n + "</span><span>Δx = " + fmt(dx, 4) + "</span>" +
        '<span class="hot">ผลรวมพื้นที่สี่เหลี่ยม ≈ ' + fmt(s, 4) + '</span><span class="pos">∫ จาก ' + fmt(a) + " ถึง " + fmt(b) + " = " + fmt(exact, 4) + "</span>" +
        "<span>คลาดเคลื่อน " + fmt(Math.abs(s - exact), 4) + "</span>";
    }
    r.addEventListener("input", draw); sel.addEventListener("change", draw); onResize(draw); draw();
  }

  // ---------- 5) ห้องทดลองกราฟ ----------
  function playground(box) {
    var d = box.dataset;
    var u = shell(box, "พิมพ์ฟังก์ชันอะไรก็ได้ แล้วดูกราฟ ความชัน และพื้นที่", "ห้องทดลอง");
    u.cv.style.height = "420px";
    var row1 = el("div", { "class": "wctl" }), row2 = el("div", { "class": "wctl" });
    u.body.insertBefore(row1, u.ctl); u.body.insertBefore(row2, u.ctl);
    function inp(row, label, val, cls) { var l = el("label", {}, label), i = el("input", { type: "text", value: val }); if (cls) i.className = cls; l.appendChild(i); row.appendChild(l); return i; }
    var fi = inp(row1, "f(x) =", d.f || "x^3 - 3x", "wide"), xa = inp(row1, "x จาก", "-3"), xb = inp(row1, "ถึง", "3");
    var cbD = el("label", {}, '<input type="checkbox" checked> กราฟ f′(x)'), cbT = el("label", {}, '<input type="checkbox" checked> เส้นสัมผัส'),
        cbA = el("label", {}, '<input type="checkbox"> พื้นที่ใต้กราฟ');
    row2.appendChild(cbD); row2.appendChild(cbT); row2.appendChild(cbA);
    var ia = inp(row2, "a =", "0"), ib = inp(row2, "b =", "2");
    var r = slider(u.ctl, "จุดสัมผัส x₀", -3, 3, 0.01, 1);
    var pre = el("div", { "class": "presets" });
    ["x^2", "x^3 - 3x", "-x^2 + 6x + 10", "x^4/4 - x^3 + x^2 + 4", "(x^2-1)/(x-1)", "1/x", "sqrt(x)", "|x|", "sin(x)", "2x^3 - 3x^2 - 12x + 5"].forEach(function (s) {
      var b = el("button", { type: "button" }, s); b.addEventListener("click", function () { fi.value = s; draw(true); }); pre.appendChild(b);
    });
    u.body.appendChild(pre);
    var f = null, xr = [-3, 3], yr = [-5, 5];
    function draw(rescale) {
      try { f = compile(fi.value); } catch (e) { u.out.innerHTML = '<span class="neg">⚠ ' + e.message + "</span>"; return; }
      var A = parseFloat(xa.value), B = parseFloat(xb.value);
      if (!(B > A)) { u.out.innerHTML = '<span class="neg">⚠ ช่วง x ไม่ถูกต้อง</span>'; return; }
      if (rescale || xr[0] !== A || xr[1] !== B) { xr = [A, B]; yr = autoY(f, xr); r.min = A; r.max = B; r.step = (B - A) / 600; }
      var P = new Plot(u.cv, xr, yr), x0 = parseFloat(r.value), y0 = f(x0), m = deriv(f, x0);
      var showA = cbA.querySelector("input").checked, a = parseFloat(ia.value), b = parseFloat(ib.value);
      P.clear();
      if (showA && b > a) { P.fillBetween(function (x) { var y = f(x); return y > 0 ? y : 0; }, a, b, C.grape, 0.25); P.fillBetween(function (x) { var y = f(x); return y < 0 ? y : 0; }, a, b, C.rose, 0.25); }
      if (cbD.querySelector("input").checked) P.curve(function (x) { return deriv(f, x); }, C.mango, 2, [7, 5]);
      P.curve(f, C.grape, 2.8);
      if (cbT.querySelector("input").checked && isFinite(y0)) { P.curve(function (x) { return y0 + m * (x - x0); }, C.coral, 2); P.dot(x0, y0, C.coral, false, 6.5); }
      P.done();
      var html = "<span>f(" + fmt(x0, 3) + ") = " + fmt(y0, 4) + "</span>" + '<span class="' + (m > 0 ? "pos" : m < 0 ? "neg" : "hot") + '">f′(' + fmt(x0, 3) + ") ≈ " + fmt(m, 4) + "</span>";
      if (showA && b > a) {
        var net = simpson(f, a, b), abs = simpson(function (x) { return Math.abs(f(x)); }, a, b);
        html += '<span class="hot">∫ₐᵇ f(x)dx ≈ ' + fmt(net, 4) + '</span><span class="pos">พื้นที่จริง ∫|f(x)|dx ≈ ' + fmt(abs, 4) + "</span>";
      }
      u.out.innerHTML = html + '<span>เส้นทึบม่วง = f(x) · เส้นประเหลือง = f′(x)</span>';
    }
    [fi, xa, xb, ia, ib].forEach(function (i) { i.addEventListener("change", function () { draw(i === fi); }); });
    [cbD, cbT, cbA].forEach(function (c) { c.querySelector("input").addEventListener("change", function () { draw(); }); });
    r.addEventListener("input", function () { draw(); }); onResize(function () { draw(); }); draw(true);
  }

  var W = { approach: approach, secant: secant, tangent: tangent, riemann: riemann, playground: playground };
  function init() {
    document.querySelectorAll(".widget[data-w]").forEach(function (box) {
      try { W[box.dataset.w](box); } catch (e) { box.innerHTML = '<div class="widget-body">⚠ widget error: ' + e.message + "</div>"; }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
