# -*- coding: utf-8 -*-
"""
สร้างเว็บไซต์ Calculus (1204105) จากไฟล์ใน build/src  →  docs/*.html

  python build/build.py

แท็กพิเศษที่ใช้ในไฟล์ src:
  <h2 id="s1">ชื่อหัวข้อ</h2>         → ใส่เลขหัวข้อ (เช่น 2.1) + สร้างเมนูย่อย/สารบัญอัตโนมัติ
  <ex t="ชื่อ" lv="1">โจทย์<ans>เฉลย</ans></ex>   → กล่องตัวอย่าง + ปุ่มดูเฉลย (lv 1–3)
  <plot>{dict}</plot>                 → กราฟ SVG (ดู plot_svg)
  <sign>{dict}</sign>                 → ตารางเครื่องหมาย f'(x) บนเส้นจำนวน
  <py t="ชื่อ">code</py>               → การ์ดโค้ด Python ที่รันจริงตอน build แล้วแสดงผลลัพธ์
  <review><part>หัวข้อ</part><q h="คำใบ้">คำถาม<sol>เฉลย</sol></q></review>
"""
import ast, contextlib, html, io, math, os, re, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT = os.path.join(os.path.dirname(HERE), "docs")

PAGES = [
    dict(file="index.html", title="หน้าแรก / ภาพรวม", group=0, icon="🏠"),
    dict(file="01-function.html", no=1, group=1, sym="f(x)", title="ฟังก์ชัน กราฟ และความชัน",
         kicker="CHAPTER 01 · ปูพื้นฐาน", sub="ฟังก์ชันคืออะไร โดเมนและเรนจ์ การหาค่าฟังก์ชัน ฟังก์ชันประกอบ ความชันและสมการเส้นตรง",
         img="icon/thinking.png"),
    dict(file="02-limit.html", no=2, group=1, sym="lim", title="ลิมิตของฟังก์ชัน",
         kicker="CHAPTER 02 · Exam 1", sub="แนวคิดของลิมิต การแทนค่า ทฤษฎีบทลิมิต รูปแบบ 0/0 การแยกตัวประกอบ คอนจูเกต ลิมิตซ้าย–ขวา และลิมิตที่อนันต์",
         img="icon/nap.png"),
    dict(file="03-continuity.html", no=3, group=1, sym="⌒", title="ความต่อเนื่องของฟังก์ชัน",
         kicker="CHAPTER 03 · Exam 1", sub="เงื่อนไข 3 ข้อของความต่อเนื่อง ชนิดของจุดไม่ต่อเนื่อง ฟังก์ชันหลายช่วง และการหาค่า k ให้ฟังก์ชันต่อเนื่อง",
         img="icon/drink.png"),
    dict(file="04-derivative.html", no=4, group=2, sym="d/dx", title="อนุพันธ์และสูตรการดิฟ",
         kicker="CHAPTER 04 · Midterm", sub="อัตราการเปลี่ยนแปลงเฉลี่ยและขณะใด ๆ นิยามอนุพันธ์ สูตรการดิฟ ผลคูณ ผลหาร กฎลูกโซ่ ฟังก์ชันประกอบ และอนุพันธ์อันดับสูง",
         img="icon/electricity.png"),
    dict(file="05-derivative-app.html", no=5, group=2, sym="f′", title="ความชัน เส้นสัมผัส และค่าสูงสุด–ต่ำสุด",
         kicker="CHAPTER 05 · Midterm", sub="ความชันเส้นโค้ง สมการเส้นสัมผัส ฟังก์ชันเพิ่ม–ลด จุดวิกฤต ค่าสูงสุด–ต่ำสุดสัมพัทธ์และสัมบูรณ์",
         img="icon/worker.png"),
    dict(file="06-optimization.html", no=6, group=2, sym="max", title="โจทย์ปัญหาค่าเหมาะที่สุด",
         kicker="CHAPTER 06 · Midterm", sub="ใช้อนุพันธ์แก้ปัญหาจริง: พื้นที่มากที่สุด รายได้สูงสุด กำไรสูงสุด ปริมาตรกล่อง และการเคลื่อนที่",
         img="icon/worker5.png"),
    dict(file="07-indefinite.html", no=7, group=3, sym="∫", title="อินทิกรัลไม่จำกัดเขต",
         kicker="CHAPTER 07 · Final", sub="ปฏิยานุพันธ์ สูตรอินทิกรัล การจัดรูปก่อนอินทิเกรต การหาค่าคงที่ C และการแทนค่า (เสริม)",
         img="icon/drink2.png"),
    dict(file="08-definite-area.html", no=8, group=3, sym="∫ₐᵇ", title="อินทิกรัลจำกัดเขตและพื้นที่",
         kicker="CHAPTER 08 · Final", sub="ทฤษฎีบทหลักมูล พื้นที่ใต้เส้นโค้ง พื้นที่ใต้แกน x กราฟตัดแกน x และพื้นที่ระหว่างเส้นโค้ง",
         img="icon/well-done2.png"),
    dict(file="appendix-a-formulas.html", group=4, letter="ก", sym="Σ", title="สรุปสูตร (Cheat Sheet)",
         kicker="APPENDIX A", sub="รวมสูตรสำคัญทั้งเล่มไว้ในหน้าเดียว — เปิดทวนก่อนสอบ", img="icon/awesome.png"),
    dict(file="appendix-b-playground.html", group=4, letter="ข", sym="y=?", title="ห้องทดลองกราฟ",
         kicker="APPENDIX B", sub="พิมพ์ฟังก์ชันเอง ดูกราฟ อนุพันธ์ เส้นสัมผัส และพื้นที่ใต้กราฟแบบโต้ตอบ", img="icon/you-did-it.png"),
]
GROUPS = {0: "เริ่มต้นที่นี่", 1: "ส่วนที่ 1 · ลิมิต (Exam 1)", 2: "ส่วนที่ 2 · อนุพันธ์ (Midterm)",
          3: "ส่วนที่ 3 · อินทิกรัล (Final)", 4: "ภาคผนวก"}
LEVEL = {"1": "⭐ ง่าย", "2": "⭐⭐ ปานกลาง", "3": "⭐⭐⭐ ท้าทาย"}


# ============================================================ SVG plot
def nice_step(r, target=8):
    raw = r / target
    mag = 10 ** math.floor(math.log10(raw))
    n = raw / mag
    return (1 if n < 1.5 else 2 if n < 3.5 else 5 if n < 7.5 else 10) * mag


def num(v):
    if abs(v - round(v)) < 1e-9:
        return str(int(round(v))).replace("-", "−")
    return ("%g" % v).replace("-", "−")


def esc(s):
    return html.escape(str(s), quote=True)


SAFE = {"np": np, "sqrt": np.sqrt, "abs": np.abs, "sin": np.sin, "cos": np.cos, "exp": np.exp, "log": np.log,
        "pi": np.pi, "where": np.where, "cbrt": np.cbrt}

_plot_id = [0]


def evalf(expr, xs):
    with np.errstate(all="ignore"):
        y = eval(expr, dict(SAFE), {"x": xs})
    y = np.asarray(y, dtype=float)
    if y.shape == ():
        y = np.full_like(xs, float(y))
    return y


def plot_svg(spec):
    """spec keys:
      x:[min,max]  y:[min,max]  w,h  xs,ys (grid step)  noticks
      f:[{e:'x**2', c:1..6, d:[a,b], lab:'y = x²', at:[x,y], dash:1, w:2.8}]
      shade:[{f:0, g:None|1, a:, b:, c:1}]          (g=None → ถึงแกน x)
      lines:[[x1,y1,x2,y2,c, dash(0/1)]]            เส้นนำสายตา
      pts:[[x,y,'o'|'c', 'label', c, 'pos' ]]         pos: ne nw se sw n s e w
      text:[[x,y,'ข้อความ',c,'anchor']]
    """
    _plot_id[0] += 1
    pid = "pl%d" % _plot_id[0]
    x0, x1 = spec["x"]
    y0, y1 = spec["y"]
    W = spec.get("w", 560)
    H = spec.get("h", 360)
    L, R, T, B = 40, 14, 14, 28
    pw, ph = W - L - R, H - T - B
    sx = lambda x: L + (x - x0) / (x1 - x0) * pw
    sy = lambda y: T + (y1 - y) / (y1 - y0) * ph
    o = ['<svg viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" role="img">' % (W, H)]
    o.append('<defs><clipPath id="%s"><rect x="%g" y="%g" width="%g" height="%g"/></clipPath></defs>' % (pid, L, T, pw, ph))
    small = W < 400
    xs_ = spec.get("xs") if spec.get("xs") and not small else nice_step(x1 - x0, 5 if small else 8)
    ys_ = spec.get("ys") if spec.get("ys") and not small else nice_step(y1 - y0, 5 if small else 7)
    axy = min(max(0, y0), y1)   # ตำแหน่งแกน x
    axx = min(max(0, x0), x1)   # ตำแหน่งแกน y
    g = []
    k = math.ceil(x0 / xs_ - 1e-9)
    while k * xs_ <= x1 + 1e-9:
        gx = k * xs_
        g.append('<line class="grid" x1="%.1f" y1="%d" x2="%.1f" y2="%d"/>' % (sx(gx), T, sx(gx), T + ph))
        if abs(gx) > 1e-9 and not spec.get("noticks"):
            g.append('<text class="tick" x="%.1f" y="%.1f" text-anchor="middle">%s</text>' % (sx(gx), min(sy(axy) + 15, H - 8), num(gx)))
        k += 1
    k = math.ceil(y0 / ys_ - 1e-9)
    while k * ys_ <= y1 + 1e-9:
        gy = k * ys_
        g.append('<line class="grid" x1="%d" y1="%.1f" x2="%d" y2="%.1f"/>' % (L, sy(gy), L + pw, sy(gy)))
        if abs(gy) > 1e-9 and not spec.get("noticks"):
            g.append('<text class="tick" x="%.1f" y="%.1f" text-anchor="end">%s</text>' % (max(sx(axx) - 6, 34), sy(gy) + 4, num(gy)))
        k += 1
    o += g
    o.append('<line class="axis" x1="%d" y1="%.1f" x2="%d" y2="%.1f"/>' % (L, sy(axy), L + pw, sy(axy)))
    o.append('<line class="axis" x1="%.1f" y1="%d" x2="%.1f" y2="%d"/>' % (sx(axx), T, sx(axx), T + ph))
    o.append('<text class="tick" x="%.1f" y="%.1f" text-anchor="end">0</text>' % (sx(axx) - 5, sy(axy) + 14))
    o.append('<text class="tick" x="%d" y="%.1f" text-anchor="end" style="font-style:italic">x</text>' % (L + pw - 2, sy(axy) - 6))
    o.append('<text class="tick" x="%.1f" y="%d" style="font-style:italic">y</text>' % (sx(axx) + 6, T + 11))
    o.append('<g clip-path="url(#%s)">' % pid)
    fns = spec.get("f", [])
    # --- พื้นที่แรเงา
    for sh in spec.get("shade", []):
        a, b = sh["a"], sh["b"]
        xs = np.linspace(a, b, 300)
        ya = evalf(fns[sh["f"]]["e"], xs) if sh.get("f") is not None else np.zeros_like(xs)
        yb = evalf(fns[sh["g"]]["e"], xs) if sh.get("g") is not None else np.zeros_like(xs)
        clip = lambda v: np.clip(v, y0 - (y1 - y0), y1 + (y1 - y0))
        pts = ["%.1f,%.1f" % (sx(x), sy(y)) for x, y in zip(xs, clip(ya))]
        pts += ["%.1f,%.1f" % (sx(x), sy(y)) for x, y in zip(xs[::-1], clip(yb)[::-1])]
        o.append('<polygon class="shade p%d" points="%s"/>' % (sh.get("c", 1), " ".join(pts)))
    # --- เส้นนำสายตา
    for ln in spec.get("lines", []):
        xa, ya_, xb, yb_ = ln[:4]
        c = ln[4] if len(ln) > 4 else 6
        dash = ln[5] if len(ln) > 5 else 1
        o.append('<line class="%s p%d" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"%s/>' % (
            "guide" if dash else "curve", c, sx(xa), sy(ya_), sx(xb), sy(yb_), "" if dash else ' style="stroke-width:2.2"'))
    # --- เส้นกราฟ
    span = y1 - y0
    for fn in fns:
        a, b = fn.get("d", [x0, x1])
        xs = np.linspace(a, b, 900)
        ys = evalf(fn["e"], xs)
        segs, cur, prev = [], [], None
        for x, y in zip(xs, ys):
            bad = not np.isfinite(y) or abs(y) > 1e6
            if bad or (prev is not None and abs(y - prev) > span * 1.2):
                if len(cur) > 1:
                    segs.append(cur)
                cur = [] if bad else [(x, y)]
                prev = None if bad else y
                continue
            cur.append((x, y))
            prev = y
        if len(cur) > 1:
            segs.append(cur)
        for sg in segs:
            d = "M" + " L".join("%.1f %.1f" % (sx(x), sy(max(min(y, y1 + 2 * span), y0 - 2 * span))) for x, y in sg)
            o.append('<path class="curve p%d" d="%s"%s%s/>' % (fn.get("c", 1), d,
                     ' stroke-dasharray="7 5"' if fn.get("dash") else "",
                     ' style="stroke-width:%s"' % fn["w"] if fn.get("w") else ""))
    o.append("</g>")
    # --- ป้ายชื่อกราฟ
    for fn in fns:
        if fn.get("lab") and fn.get("at"):
            lx, ly = fn["at"]
            o.append('<text class="lbl p%d" x="%.1f" y="%.1f" text-anchor="%s" style="stroke:#fff">%s</text>' % (
                fn.get("c", 1), sx(lx), sy(ly), fn.get("anchor", "start"), esc(fn["lab"])))
    for t in spec.get("text", []):
        tx, ty, s = t[:3]
        c = t[3] if len(t) > 3 else 6
        anc = t[4] if len(t) > 4 else "middle"
        o.append('<text class="lbl p%d" x="%.1f" y="%.1f" text-anchor="%s" style="stroke:#fff">%s</text>' % (c, sx(tx), sy(ty), anc, esc(s)))
    # --- จุด
    off = {"ne": (8, -9, "start"), "nw": (-8, -9, "end"), "se": (8, 18, "start"), "sw": (-8, 18, "end"),
           "n": (0, -12, "middle"), "s": (0, 22, "middle"), "e": (10, 5, "start"), "w": (-10, 5, "end")}
    for p in spec.get("pts", []):
        px, py = p[0], p[1]
        kind = p[2] if len(p) > 2 else "c"
        lab = p[3] if len(p) > 3 else ""
        c = p[4] if len(p) > 4 else 1
        pos = p[5] if len(p) > 5 else "ne"
        if kind == "o":
            o.append('<circle class="pt-open p%d" cx="%.1f" cy="%.1f" r="5.5" style="fill:#fff"/>' % (c, sx(px), sy(py)))
        else:
            o.append('<circle class="pt-closed p%d" cx="%.1f" cy="%.1f" r="5.5"/>' % (c, sx(px), sy(py)))
        if lab:
            dx, dy, anc = off[pos]
            o.append('<text class="ptlbl" x="%.1f" y="%.1f" text-anchor="%s">%s</text>' % (sx(px) + dx, sy(py) + dy, anc, esc(lab)))
    o.append("</svg>")
    return "".join(o)


def sign_svg(spec):
    """spec: pts:['-1','2'], sg:['+','-','+'], name:"f′(x)", beh:['เพิ่ม ↗','ลด ↘','เพิ่ม ↗'] (ไม่ใส่ = อัตโนมัติ)"""
    pts, sg = spec["pts"], spec["sg"]
    name = spec.get("name", "f′(x)")
    n = len(sg)
    W, H = 560, 118
    L, R = 92, 18
    seg = (W - L - R) / n
    o = ['<svg viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" role="img">' % (W, H)]
    o.append('<text class="nm" x="8" y="40">เครื่องหมาย</text><text class="nm" x="8" y="57">%s</text>' % esc(name))
    o.append('<text class="nm" x="8" y="96">พฤติกรรม f</text>')
    o.append('<line class="sl" x1="%d" y1="68" x2="%d" y2="68"/>' % (L - 4, W - R))
    o.append('<path d="M%d 63 L%d 68 L%d 73" fill="none" stroke="#5F5A7A" stroke-width="2"/>' % (W - R - 6, W - R, W - R - 6))
    beh = spec.get("beh")
    for i, s in enumerate(sg):
        cx = L + seg * (i + 0.5)
        cls = "plus" if s == "+" else "minus" if s in "-−" else "zero"
        o.append('<text class="sp %s" x="%.1f" y="50" text-anchor="middle">%s</text>' % (cls, cx, "+" if s == "+" else "−" if s in "-−" else s))
        b = beh[i] if beh else ("เพิ่ม ↗" if s == "+" else "ลด ↘")
        col = "var(--mint2)" if s == "+" else "var(--rose)"
        o.append('<text class="beh" x="%.1f" y="98" text-anchor="middle" fill="%s">%s</text>' % (cx, col, esc(b)))
    for j, p in enumerate(pts):
        px = L + seg * (j + 1)
        o.append('<line x1="%.1f" y1="60" x2="%.1f" y2="76" stroke="#5F5A7A" stroke-width="2"/>' % (px, px))
        o.append('<circle cx="%.1f" cy="68" r="4.5" fill="var(--mango)"/>' % px)
        o.append('<text class="ptx" x="%.1f" y="22" text-anchor="middle">x = %s</text>' % (px, esc(p)))
    o.append("</svg>")
    return '<div class="signchart">%s</div>' % "".join(o)


# ============================================================ Python (SymPy) runner
def run_py(code):
    buf = io.StringIO()
    ns = {"__name__": "__snippet__"}
    try:
        with contextlib.redirect_stdout(buf):
            exec(code, ns)
    except Exception as e:
        print("!! snippet error:", e, "\n", code, file=sys.stderr)
        raise
    return buf.getvalue().rstrip()


# ============================================================ page transforms
def transform(src, chap):
    counters = {"ex": 0, "fig": 0}
    prefix = str(chap) + "." if chap else ""

    def py_block(m):
        title = m.group(1) or "ตรวจคำตอบด้วย Python (SymPy)"
        code = m.group(2).strip("\n")
        out = run_py(code)
        res = '<div class="code"><div class="code-head"><span><span class="dots"><i></i><i></i><i></i></span>%s</span></div><pre class="py">%s</pre>' % (esc(title), esc(code))
        if out:
            res += '<div class="out"><div class="out-t">▸ ผลลัพธ์เมื่อรัน</div><pre>%s</pre></div>' % esc(out)
        return res + "</div>"
    src = re.sub(r'<py(?: t="([^"]*)")?>(.*?)</py>', py_block, src, flags=re.S)

    def plot_block(m):
        spec = ast.literal_eval(m.group(2).strip())
        cls = m.group(1) or ""
        svg = plot_svg(spec)
        cap = spec.get("cap")
        fc = ""
        if cap:
            counters["fig"] += 1
            fc = "<figcaption><b>ภาพที่ %s%d</b> %s</figcaption>" % (prefix, counters["fig"], cap)
        elif spec.get("sub"):
            fc = "<figcaption>%s</figcaption>" % spec["sub"]
        return '<figure class="svgplot%s">%s%s</figure>' % ((" " + cls) if cls else "", svg, fc)
    src = re.sub(r'<plot(?: class="([^"]*)")?>(.*?)</plot>', plot_block, src, flags=re.S)
    src = re.sub(r"<sign>(.*?)</sign>", lambda m: sign_svg(ast.literal_eval(m.group(1).strip())), src, flags=re.S)

    def ex_block(m):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        body = m.group(2)
        counters["ex"] += 1
        no = "%s%d" % (prefix, counters["ex"])
        if "<ans>" in body:
            q, a = body.split("<ans>", 1)
            a = a.replace("</ans>", "")
            ans = '<button type="button" class="ans-btn">👀 ดูเฉลย</button><div class="answer"><div class="answer-t">✅ เฉลย</div>%s</div>' % a
        else:
            q, ans = body, ""
        lv = LEVEL.get(attrs.get("lv", ""), "")
        return ('<div class="ex" id="ex%s"><div class="ex-head"><span class="ex-badge">ตัวอย่าง %s</span>'
                '<span class="ex-title">%s</span><span class="ex-level">%s</span></div><div class="ex-body">%s%s</div></div>') % (
            no, no, attrs.get("t", ""), lv, q, ans)
    src = re.sub(r"<ex((?:\s+\w+=\"[^\"]*\")*)>(.*?)</ex>", ex_block, src, flags=re.S)

    def review_block(m):
        body = m.group(1)
        body = re.sub(r"<part>(.*?)</part>", r'<li class="part">\1</li>', body, flags=re.S)

        def q(mm):
            hint = mm.group(1)
            inner = mm.group(2).replace("<sol>", '<div class="rv-ans">').replace("</sol>", "</div>")
            if hint:
                # แทรกคำใบ้ก่อนเฉลย
                if '<div class="rv-ans">' in inner:
                    a, b = inner.split('<div class="rv-ans">', 1)
                    inner = a.rstrip() + ' <span class="hint">(%s)</span><div class="rv-ans">' % hint + b
                else:
                    inner += ' <span class="hint">(%s)</span>' % hint
            return "<li>%s</li>" % inner
        body = re.sub(r'<q(?: h="([^"]*)")?>(.*?)</q>', q, body, flags=re.S)
        return ('<div class="review" id="review"><div class="review-head"><img src="icon/thinking.png" alt=""><h2>คำถามท้ายบท</h2>'
                '<button type="button" class="review-copy">📋 คัดลอกคำถามทั้งหมด</button><button type="button" class="review-key">🔑 ดูเฉลย</button></div>'
                '<form class="review-lock" hidden><label>รหัสผ่านสำหรับดูเฉลย</label><input type="password" autocomplete="off" placeholder="รหัสผ่าน">'
                '<button type="submit">ตกลง</button><span class="review-msg"></span></form>'
                '<p style="font-size:14px;color:var(--mute)">ลองทำเองก่อนทุกข้อ แล้วค่อยกด 🔑 ดูเฉลย (ต้องใช้รหัสผ่านจากผู้สอน)</p><ol>%s</ol></div>') % body
    src = re.sub(r"<review>(.*?)</review>", review_block, src, flags=re.S)

    # --- หัวข้อ h2: ใส่เลข + เก็บรายการ
    heads = []

    def h2(m):
        hid, text = m.group(1), m.group(2)
        k = len(heads) + 1
        sec = "%s%d" % (prefix, k) if chap else ""
        heads.append((hid, sec, re.sub(r"<[^>]+>", "", text)))
        badge = '<span class="sec">%s</span> ' % sec if sec else ""
        return '<h2 id="%s">%s%s</h2>' % (hid, badge, text)
    src = re.sub(r'<h2 id="([^"]+)">(.*?)</h2>', h2, src)
    return src, heads


# ============================================================ page template
def sidebar(cur, heads, has_review):
    o = []
    for gk, gname in GROUPS.items():
        o.append('<div class="navgroup"><div class="navgroup-t">%s</div>' % gname)
        for p in PAGES:
            if p["group"] != gk:
                continue
            tag = p.get("icon") or ("%02d" % p["no"] if p.get("no") else p.get("letter"))
            act = ' class="active"' if p is cur else ""
            o.append('<a href="%s"%s><span class="no">%s</span>%s</a>' % (p["file"], act, tag, p["title"]))
            if p is cur and heads:
                sub = "".join('<a href="#%s"><span class="sno">%s</span>%s</a>' % (h, s or "•", t) for h, s, t in heads)
                if has_review:
                    sub += '<a href="#review"><span class="sno">✎</span>คำถามท้ายบท</a>'
                o.append('<div class="subnav">%s</div>' % sub)
        o.append("</div>")
    return "\n".join(o)


TEMPLATE = """<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Calculus Lecture Note</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;800&display=swap">
<link rel="stylesheet" href="assets/katex/katex.min.css">
<link rel="stylesheet" href="assets/style.css">
<script defer src="assets/katex/katex.min.js"></script>
<script defer src="assets/katex/contrib/auto-render.min.js"></script>
</head>
<body>
<button id="menuBtn" aria-label="menu">☰ เมนู</button>
<aside class="sidebar" id="sidebar">
  <div class="brand"><a href="index.html"><span class="logo">∫</span><span class="t1">Mathematics for<br>Computer Science 2</span><span class="t2">1204105 · Calculus · Lecture Note</span></a></div>
  <nav>
{nav}
  </nav>
  <img src="{img}" alt="" class="sidebar-img">
</aside>
<main class="content">
{head}
{body}
{pager}
<footer>1204105 Mathematics for Computer Science 2 (Calculus) · Calculus by Prymania · วิทยาการคอมพิวเตอร์ ม.มหาสารคาม</footer>
</main>
<script src="assets/password.js"></script>
<script defer src="assets/nav.js"></script>
<script defer src="assets/widgets.js"></script>
</body>
</html>
"""


def build():
    for i, p in enumerate(PAGES):
        path = os.path.join(SRC, p["file"])
        if not os.path.exists(path):
            print("skip (no source):", p["file"])
            continue
        with open(path, encoding="utf-8") as fh:
            raw = fh.read()
        _plot_id[0] = 0
        body, heads = transform(raw, p.get("no"))
        has_review = 'id="review"' in body
        if p.get("no") or p.get("letter"):
            head = ('<div class="page-head" data-sym="%s"><span class="kicker">%s</span><h1>%s</h1><p class="sub">%s</p></div>' % (
                esc(p.get("sym", "")), p["kicker"], ("บทที่ %d · " % p["no"] if p.get("no") else "ภาคผนวก %s · " % p["letter"]) + p["title"], p["sub"]))
            if heads and len(heads) > 2:
                toc = "".join('<li><a href="#%s"><span class="sno">%s</span>%s</a></li>' % (h, s, t) for h, s, t in heads)
                if has_review:
                    toc += '<li><a href="#review"><span class="sno">✎</span>คำถามท้ายบท</a></li>'
                body = body.replace("<!--TOC-->", '<div class="pagetoc"><div class="pagetoc-t">📑 ในบทนี้</div><ul>%s</ul></div>' % toc, 1)
        else:
            head = ""
        prev_p = PAGES[i - 1] if i > 0 else None
        next_p = PAGES[i + 1] if i + 1 < len(PAGES) else None
        pager = '<div class="pager">%s%s</div>' % (
            '<a class="pg" href="%s">← %s</a>' % (prev_p["file"], prev_p["title"]) if prev_p else "",
            '<a class="pg next" href="%s">%s →</a>' % (next_p["file"], next_p["title"]) if next_p else "")
        title = ("บทที่ %d · %s" % (p["no"], p["title"])) if p.get("no") else p["title"]
        out = TEMPLATE.format(title=title, nav=sidebar(p, heads, has_review), img=p.get("img", "icon/me_cat.png"),
                              head=head, body=body, pager=pager)
        with open(os.path.join(OUT, p["file"]), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(out)
        n_ex = body.count('class="ex"')
        n_q = len(re.findall(r'class="rv-ans"', body))
        print("✓ %-28s  sections=%-2d examples=%-3d review=%d" % (p["file"], len(heads), n_ex, n_q))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    build()
