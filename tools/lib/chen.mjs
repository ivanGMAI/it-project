// ER-диаграмма в нотации Чена: сущности (прямоугольник, двойной — слабая), связи (ромб, двойной —
// идентифицирующая), атрибуты (эллипс: подчёркнут — ключ, пунктир снизу — частичный ключ,
// двойной — многозначный, пунктирный — производный, с ветками — составной).
// Сущности и связи ставятся вручную, атрибуты — автоматически: каждый ищет свободное место
// вокруг владельца, не задевая чужие фигуры, линии и уже поставленные атрибуты.
import { Diagram, block, r } from './kit.mjs'
import { C, F, HUE } from './theme.mjs'

const ENT = F(15.5, 700)
const REL = F(14, 600)
const ATTR = F(14.5, 400)
const CARD = F(15, 700)
const ENT_H = HUE.blue
const REL_H = HUE.amber
const ATTR_STROKE = '#64748b'
const LINK = '#334155'
const ATTR_LINK = '#94a3b8'

// ---------- геометрия ----------
function clip(shape, from) {
  // точка на границе фигуры по лучу из её центра к точке from
  const { cx, cy, w, h, kind } = shape
  const dx = from[0] - cx; const dy = from[1] - cy
  if (!dx && !dy) return [cx, cy]
  if (kind === 'ellipse') {
    const a = w / 2; const b = h / 2
    const t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b))
    return [cx + dx * t, cy + dy * t]
  }
  if (kind === 'diamond') {
    const t = 1 / (Math.abs(dx) / (w / 2) + Math.abs(dy) / (h / 2))
    return [cx + dx * t, cy + dy * t]
  }
  const t = Math.min(Math.abs((w / 2) / (dx || 1e-9)), Math.abs((h / 2) / (dy || 1e-9)))
  return [cx + dx * t, cy + dy * t]
}
const bbox = (s, m = 0) => ({ x: s.cx - s.w / 2 - m, y: s.cy - s.h / 2 - m, w: s.w + 2 * m, h: s.h + 2 * m })
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
function segBox(p, q, b) {
  // пересечение отрезка с прямоугольником (Лян — Барски)
  let t0 = 0; let t1 = 1
  const dx = q[0] - p[0]; const dy = q[1] - p[1]
  for (const [pp, qq] of [[-dx, p[0] - b.x], [dx, b.x + b.w - p[0]], [-dy, p[1] - b.y], [dy, b.y + b.h - p[1]]]) {
    if (pp === 0) { if (qq < 0) return false; continue }
    const t = qq / pp
    if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t } else { if (t < t0) return false; if (t < t1) t1 = t }
  }
  return true
}
function segSeg(a, b, c, d) {
  const o = (p, q, r2) => Math.sign((q[0] - p[0]) * (r2[1] - p[1]) - (q[1] - p[1]) * (r2[0] - p[0]))
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b)
}

export class Chen {
  constructor(opts) {
    this.d = new Diagram(opts)
    this.shapes = new Map()
    this.links = [] // { a, b, kind: 'rel'|'attr', total, card }
  }

  entity(id, name, { x, y, weak = false }) {
    const t = block([{ s: name, f: ENT, color: C.ink }])
    this.shapes.set(id, { id, kind: 'rect', cx: x, cy: y, w: Math.max(150, t.w + 44), h: 50, weak, t })
  }

  relation(id, name, { x, y, ident = false }) {
    const lines = [].concat(name).map((s) => ({ s, f: REL, color: REL_H.ink }))
    const t = block(lines)
    // ромб, описанный вокруг текста: полуоси = полуразмер текста × 2 (+ поля)
    this.shapes.set(id, { id, kind: 'diamond', cx: x, cy: y, w: t.w * 1.55 + 40, h: Math.max(64, t.h * 2 + 26), ident, t })
  }

  link(a, b, { card, total = false } = {}) { this.links.push({ a, b, kind: 'rel', card, total }) }

  /**
   * Атрибуты владельца owner: [{ name, key, partial, multi, derived, prefer, parts }].
   * prefer — желаемое направление в градусах (0 — вправо, 90 — вниз).
   */
  attrs(owner, list) { this.shapes.get(owner).attrs = list }

  attrShape(id, a) {
    const lines = [].concat(a.name).map((s) => ({ s, f: ATTR, color: C.text }))
    const t = block(lines)
    return { id, kind: 'ellipse', cx: 0, cy: 0, w: t.w + 34, h: Math.max(36, t.h + 16), t, a }
  }

  /** Расставить атрибуты: перебор направлений и расстояний, штрафы за наложения и пересечения. */
  place() {
    const fixed = [...this.shapes.values()]
    const obstacles = fixed.map((s) => ({ box: bbox(s, 10), id: s.id }))
    // метки кардинальности тоже препятствия: атрибут не должен на них садиться
    for (const l of this.links) {
      if (!l.card) continue
      const [cx, cy] = this.cardPos(l)
      obstacles.push({ box: { x: cx - 14, y: cy - 15, w: 28, h: 30 }, id: `card:${l.a}:${l.b}` })
    }
    const lines = this.links.map((l) => {
      const A = this.shapes.get(l.a); const B = this.shapes.get(l.b)
      return { p: [A.cx, A.cy], q: [B.cx, B.cy], ids: [l.a, l.b] }
    })
    const placeAround = (owner, a, id) => {
      const s = this.attrShape(id, a)
      let best = null
      const relDirs = this.links.filter((l) => l.a === owner.id || l.b === owner.id).map((l) => {
        const o = this.shapes.get(l.a === owner.id ? l.b : l.a)
        return Math.atan2(o.cy - owner.cy, o.cx - owner.cx)
      })
      for (let deg = 0; deg < 360; deg += 5) {
        const th = (deg * Math.PI) / 180
        const ux = Math.cos(th); const uy = Math.sin(th)
        for (const gap of [26, 44, 64, 88, 116]) {
          // отступаем по направлению, пока зазор между рамкой владельца и эллипсом не станет gap
          let t = 0
          const ob = bbox(owner)
          for (; t < 600; t += 3) {
            const c = { ...s, cx: owner.cx + ux * t, cy: owner.cy + uy * t }
            const b = bbox(c)
            const gx = Math.max(ob.x - (b.x + b.w), b.x - (ob.x + ob.w), 0)
            const gy = Math.max(ob.y - (b.y + b.h), b.y - (ob.y + ob.h), 0)
            if (Math.hypot(gx, gy) >= gap) break
          }
          const c = { ...s, cx: owner.cx + ux * t, cy: owner.cy + uy * t }
          const box = bbox(c, 8)
          let cost = gap * 1.2
          for (const o of obstacles) if (o.id !== owner.id && hit(box, o.box)) cost += 5000
          const p = clip(owner, [c.cx, c.cy]); const q = clip(c, [owner.cx, owner.cy])
          for (const o of obstacles) if (o.id !== owner.id && o.id !== id && segBox(p, q, o.box)) cost += 3000
          for (const l of lines) {
            if (segBox(l.p, l.q, bbox(c, 6)) && !l.ids.includes(id)) cost += 4000
            if (!l.ids.includes(owner.id) && segSeg(p, q, l.p, l.q)) cost += 1500
          }
          // подальше от линий связей самого владельца
          for (const rd of relDirs) {
            let diff = Math.abs(((th - rd + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
            diff = Math.PI - diff
            if (diff < 0.6) cost += (0.6 - diff) * 260
          }
          if (a.prefer != null) {
            const pd = Math.abs((((deg - a.prefer) % 360) + 540) % 360 - 180)
            cost += pd * 0.9
          }
          if (!best || cost < best.cost) best = { cost, c }
        }
      }
      if (best.cost >= 5000) console.warn(`  атрибут «${[].concat(a.name).join(' ')}» у ${owner.id}: тесно (${Math.round(best.cost)})`)
      const c = best.c
      this.shapes.set(id, c)
      obstacles.push({ box: bbox(c, 10), id })
      lines.push({ p: [owner.cx, owner.cy], q: [c.cx, c.cy], ids: [owner.id, id] })
      this.links.push({ a: owner.id, b: id, kind: 'attr' })
      return c
    }
    for (const owner of fixed) {
      if (!owner.attrs) continue
      owner.attrs.forEach((a, i) => {
        const c = placeAround(owner, a, `${owner.id}_a${i}`)
        if (a.parts) a.parts.forEach((p, j) => placeAround(c, p, `${owner.id}_a${i}_${j}`))
      })
    }
  }

  async render() {
    this.place()
    const d = this.d
    for (const s of this.shapes.values()) d.node(s.id, { w: s.w, h: s.h, draw: (dd, box) => this.drawShape(dd, s, box) }, { cx: s.cx, cy: s.cy })
    for (const l of this.links) {
      const A = this.shapes.get(l.a); const B = this.shapes.get(l.b)
      const p = clip(A, [B.cx, B.cy]); const q = clip(B, [A.cx, A.cy])
      d.edge(l.a, l.b, { route: [p, q], arrow: 'none', kind: l.kind, total: l.total, card: l.card })
    }
    d.drawEdge = (e) => this.drawLink(d, e)
    return d.render({ skipRoute: true })
  }

  drawShape(d, s, { x, y, w, h }) {
    let out = ''
    if (s.kind === 'rect') {
      out += `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="4" fill="${ENT_H.fill}" stroke="${ENT_H.strong}" stroke-width="1.7"/>`
      if (s.weak) out += `<rect x="${r(x + 5)}" y="${r(y + 5)}" width="${r(w - 10)}" height="${r(h - 10)}" rx="2" fill="none" stroke="${ENT_H.strong}" stroke-width="1.3"/>`
      out += s.t.draw(d, x + w / 2, y + (h - s.t.h) / 2)
    } else if (s.kind === 'diamond') {
      const cx = x + w / 2; const cy = y + h / 2
      const poly = (k) => `${r(cx)},${r(y + k)} ${r(x + w - k * (w / h))},${r(cy)} ${r(cx)},${r(y + h - k)} ${r(x + k * (w / h))},${r(cy)}`
      out += `<polygon points="${poly(0)}" fill="${REL_H.fill}" stroke="${REL_H.strong}" stroke-width="1.6" stroke-linejoin="round"/>`
      if (s.ident) out += `<polygon points="${poly(6)}" fill="none" stroke="${REL_H.strong}" stroke-width="1.2" stroke-linejoin="round"/>`
      out += s.t.draw(d, cx, cy - s.t.h / 2)
    } else {
      const a = s.a
      const cx = x + w / 2; const cy = y + h / 2
      out += `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${r(w / 2)}" ry="${r(h / 2)}" fill="#ffffff" stroke="${ATTR_STROKE}" stroke-width="1.3"${a.derived ? ' stroke-dasharray="5 4"' : ''}/>`
      if (a.multi) out += `<ellipse cx="${r(cx)}" cy="${r(cy)}" rx="${r(w / 2 - 4)}" ry="${r(h / 2 - 4)}" fill="none" stroke="${ATTR_STROKE}" stroke-width="1.1"/>`
      out += s.t.draw(d, cx, cy - s.t.h / 2)
      if (a.key || a.partial) {
        const tw = s.t.w; const uy = cy + s.t.h / 2 - 1
        out += `<line x1="${r(cx - tw / 2)}" y1="${r(uy)}" x2="${r(cx + tw / 2)}" y2="${r(uy)}" stroke="${C.text}" stroke-width="1.2"${a.partial ? ' stroke-dasharray="4 3"' : ''}/>`
      }
    }
    return out
  }

  // центр метки кардинальности у сущности: на линии в 24 px от рамки, сбоку на 14 px
  cardPos(l) {
    const A = this.shapes.get(l.a); const B = this.shapes.get(l.b)
    const p = clip(A, [B.cx, B.cy]); const q = clip(B, [A.cx, A.cy])
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]); const ux = (q[0] - p[0]) / len; const uy = (q[1] - p[1]) / len
    // из двух сторон линии — та, что дальше от сущности (иначе метка уходит под прямоугольник)
    const cands = [1, -1].map((k) => [p[0] + ux * 24 - uy * 14 * k, p[1] + uy * 24 + ux * 14 * k])
    const b = bbox(A)
    const out = (c) => Math.max(b.x - c[0], c[0] - (b.x + b.w), b.y - c[1], c[1] - (b.y + b.h))
    return out(cands[0]) >= out(cands[1]) ? cands[0] : cands[1]
  }

  drawLink(d, e) {
    const [p, q] = e.route
    let out = `<g class="edge"><title>${e.from}--${e.to}</title>`
    if (e.kind === 'attr') {
      out += `<path d="M${r(p[0])},${r(p[1])} L${r(q[0])},${r(q[1])}" stroke="${ATTR_LINK}" stroke-width="1.3" fill="none"/>`
    } else if (e.total) {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]); const nx = -(q[1] - p[1]) / l * 2.6; const ny = (q[0] - p[0]) / l * 2.6
      for (const k of [1, -1]) out += `<path d="M${r(p[0] + nx * k)},${r(p[1] + ny * k)} L${r(q[0] + nx * k)},${r(q[1] + ny * k)}" stroke="${LINK}" stroke-width="1.4" fill="none"/>`
    } else {
      out += `<path d="M${r(p[0])},${r(p[1])} L${r(q[0])},${r(q[1])}" stroke="${LINK}" stroke-width="1.6" fill="none"/>`
    }
    if (e.card) {
      const [cx, cy] = this.cardPos({ a: e.from, b: e.to })
      out += d.text(cx, cy + 5.4, e.card, CARD, { anchor: 'middle', fill: REL_H.strong, extra: ' stroke="#ffffff" stroke-width="4" paint-order="stroke" stroke-linejoin="round"' })
    }
    return out + '</g>'
  }
}
