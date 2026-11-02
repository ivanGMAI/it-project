// Ядро отрисовки: узлы с измеренным текстом, ортогональная разводка линий (libavoid),
// подписи связей на линиях без наложений, заголовок, встроенные шрифты.
// Структура SVG совместима с check/overlaps.mjs: g.node / g.edge с <title>.
import { AvoidLib } from 'libavoid-js'
import { createRequire } from 'node:module'
import path from 'node:path'
import { textWidth, embeddedFontCss, SANS, CAP_HEIGHT } from './fonts.mjs'
import { FONT, C, STROKE } from './theme.mjs'

const require = createRequire(import.meta.url)
let Avoid
export async function avoidLib() {
  if (!Avoid) {
    await AvoidLib.load(path.join(path.dirname(require.resolve('libavoid-js')), 'libavoid.wasm'))
    Avoid = AvoidLib.getInstance()
  }
  return Avoid
}

export const r = (v) => Math.round(v * 100) / 100
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const FAMILY = { Inter: "Inter, 'Segoe UI', Arial, sans-serif", 'JetBrains Mono': "'JetBrains Mono', Consolas, monospace" }

export const lineHeight = (f) => Math.round(f.size * 1.34)
export const width = (s, f) => textWidth(s, f)

// ---------- текстовые блоки ----------
// lines: [{ s, f, color }] — строки разными шрифтами. Возвращает размер и функцию отрисовки.
export function block(lines, { align = 'center', gap = 0 } = {}) {
  const rows = lines.filter(Boolean).map((l) => (typeof l === 'string' ? { s: l, f: FONT.body } : l))
  const ws = rows.map((l) => (l.s ? width(l.s, l.f) + (l.indent ?? 0) : 0))
  const hs = rows.map((l) => (l.space ?? lineHeight(l.f)))
  const w = Math.max(0, ...ws)
  const h = hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, rows.length - 1)
  return {
    w, h,
    // x — левый край (align=start), центр (center) или правый край (end) блока; y — верх.
    draw(d, x, y) {
      let out = ''
      let top = y
      rows.forEach((l, i) => {
        if (l.s) {
          const base = top + hs[i] / 2 + (CAP_HEIGHT[l.f.family] * l.f.size) / 2
          const anchor = align === 'center' ? 'middle' : align
          out += d.text(x + (l.indent ?? 0), base, l.s, l.f, { anchor, fill: l.color ?? C.text, deco: l.deco })
        }
        top += hs[i] + gap
      })
      return out
    },
  }
}

// ---------- геометрия ----------
const SIDE_DIR = { N: 1, S: 2, W: 4, E: 8 }
const boxHit = (a, b, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m

function segHitsBox(p, q, b, m = 0) {
  const x0 = Math.min(p[0], q[0]); const x1 = Math.max(p[0], q[0])
  const y0 = Math.min(p[1], q[1]); const y1 = Math.max(p[1], q[1])
  return x1 > b.x - m && x0 < b.x + b.w + m && y1 > b.y - m && y0 < b.y + b.h + m
}

function simplify(pts) {
  const out = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && Math.abs(last[0] - p[0]) < 0.01 && Math.abs(last[1] - p[1]) < 0.01) continue
    out.push(p)
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3)
      const col = (Math.abs(a[0] - b[0]) < 0.01 && Math.abs(b[0] - c[0]) < 0.01) ||
        (Math.abs(a[1] - b[1]) < 0.01 && Math.abs(b[1] - c[1]) < 0.01)
      if (!col) break
      out.splice(out.length - 2, 1)
    }
  }
  return out
}

/** Полилиния со скруглёнными углами. */
export function roundedPath(pts, radius = 10) {
  if (pts.length < 2) return ''
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]]
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]); const l2 = Math.hypot(c[0] - b[0], c[1] - b[1])
    const rr = Math.min(radius, l1 / 2, l2 / 2)
    const p1 = [b[0] - ((b[0] - a[0]) / l1) * rr, b[1] - ((b[1] - a[1]) / l1) * rr]
    const p2 = [b[0] + ((c[0] - b[0]) / l2) * rr, b[1] + ((c[1] - b[1]) / l2) * rr]
    d += ` L${r(p1[0])},${r(p1[1])} Q${r(b[0])},${r(b[1])} ${r(p2[0])},${r(p2[1])}`
  }
  const z = pts[pts.length - 1]
  return d + ` L${r(z[0])},${r(z[1])}`
}

/** Наконечник стрелки в точке tip, направленный по вектору dir. */
export function arrowHead(tip, dir, { len = 11, half = 5, color = C.line } = {}) {
  const [ux, uy] = dir; const [px, py] = [-uy, ux]
  const b = [tip[0] - ux * len, tip[1] - uy * len]
  const m = [tip[0] - ux * len * 0.78, tip[1] - uy * len * 0.78]
  return `<path d="M${r(tip[0])},${r(tip[1])} L${r(b[0] + px * half)},${r(b[1] + py * half)} ` +
    `L${r(m[0])},${r(m[1])} L${r(b[0] - px * half)},${r(b[1] - py * half)} Z" fill="${color}" stroke="${color}" ` +
    `stroke-width="1" stroke-linejoin="round"/>`
}

const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l] }

// ---------- диаграмма ----------
export class Diagram {
  constructor({ title, subtitle, pad = 36 } = {}) {
    this.title = title; this.subtitle = subtitle; this.pad = pad
    this.nodes = new Map(); this.edges = []; this.used = new Map()
    this.back = []; this.front = []; this.obstacles = []
  }

  use(f, s) {
    const k = `${f.family}:${f.weight}`
    if (!this.used.has(k)) this.used.set(k, new Set())
    for (const ch of s) this.used.get(k).add(ch)
  }

  text(x, y, s, f, { anchor = 'start', fill = C.text, deco, extra = '' } = {}) {
    this.use(f, s)
    return `<text x="${r(x)}" y="${r(y)}" font-family="${FAMILY[f.family] ?? f.family}" font-size="${f.size}" ` +
      `font-weight="${f.weight}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}` +
      `${f.spacing ? ` letter-spacing="${f.spacing}"` : ''}${deco ? ` text-decoration="${deco}"` : ''} fill="${fill}"${extra}>${esc(s)}</text>`
  }

  /**
   * Узел. shape: { w, h, draw(d, box) → svg, outline? }. pos: { cx, cy } или { x, y }.
   * opts.sides — стороны для линий по умолчанию ('NESW'), opts.pins=false — только препятствие.
   */
  node(id, shape, pos, opts = {}) {
    const w = opts.w ?? shape.w; const h = opts.h ?? shape.h
    const x = pos.x ?? pos.cx - w / 2; const y = pos.y ?? pos.cy - h / 2
    const n = { id, shape, box: { x, y, w, h }, opts }
    this.nodes.set(id, n)
    return n.box
  }

  box(id) { return this.nodes.get(id).box }

  /** Связь. opts: label, dashed, arrow ('end'|'start'|'both'|'none'), fromSide/toSide, fromAt/toAt, markers. */
  edge(from, to, opts = {}) {
    const e = { from, to, ...opts }
    this.edges.push(e)
    return e
  }

  /** Произвольная графика под узлами (back) или над ними (front). */
  under(svg) { this.back.push(svg) }
  over(svg) { this.front.push(svg) }
  /** Прямоугольник, который линии обходят (подписи рамок, легенда). */
  obstacle(b) { this.obstacles.push(b) }

  // ---------- разводка ----------
  async route({ buffer = 14, nudge = 12, segmentPenalty = 60, crossingPenalty = 0, pinStep = 26, centerCost = 40 } = {}) {
    const A = await avoidLib()
    const router = new A.Router(A.RouterFlag.OrthogonalRouting.value)
    router.setRoutingParameter(A.RoutingParameter.shapeBufferDistance, buffer)
    router.setRoutingParameter(A.RoutingParameter.idealNudgingDistance, nudge)
    router.setRoutingParameter(A.RoutingParameter.segmentPenalty, segmentPenalty)
    if (crossingPenalty) router.setRoutingParameter(A.RoutingParameter.crossingPenalty, crossingPenalty)
    router.setRoutingOption(A.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes, true)
    router.setRoutingOption(A.RoutingOption.nudgeSharedPathsWithCommonEndPoint, true)
    router.setRoutingOption(A.RoutingOption.penaliseOrthogonalSharedPathsAtConnEnds, true)
    router.setRoutingOption(A.RoutingOption.nudgeOrthogonalTouchingColinearSegments, true)

    // Точки подключения. Совпадающие точки разных классов libavoid не переваривает (линия идёт
    // центр-в-центр), поэтому у каждого узла все точки разнесены: явные (сторона + доля) — свои
    // классы, остальные концы группируются по набору допустимых сторон, и позиции на стороне
    // раздаются группам по очереди.
    let cls = 1
    const refs = new Map()
    for (const n of this.nodes.values()) {
      const { x, y, w, h } = n.box
      refs.set(n.id, new A.ShapeRef(router, new A.Rectangle(new A.Point(x, y), new A.Point(x + w, y + h))))
    }
    for (const b of this.obstacles) new A.ShapeRef(router, new A.Rectangle(new A.Point(b.x, b.y), new A.Point(b.x + b.w, b.y + b.h)))
    const pin = (ref, c, side, at, cost = 0) => {
      const [xo, yo] = { N: [at, 0], S: [at, 1], W: [0, at], E: [1, at] }[side]
      const p = new A.ShapeConnectionPin(ref, c, xo, yo, true, 0, SIDE_DIR[side])
      p.setExclusive(true)
      if (cost) p.setConnectionCost(cost)
    }
    const sideLen = (n, side) => (side === 'N' || side === 'S' ? n.box.w : n.box.h)
    // концы связей по узлам
    // fromC/toC — координата точки на стороне (y для E/W, x для N/S) вместо доли стороны
    const atOf = (id, side, at, c) => {
      if (c == null) return at
      const b = this.nodes.get(id).box
      return side === 'N' || side === 'S' ? (c - b.x) / b.w : (c - b.y) / b.h
    }
    const ends = this.edges.map((e) => [
      { node: e.from, side: e.fromSide, at: atOf(e.from, e.fromSide, e.fromAt, e.fromC), pins: e.fromPins },
      { node: e.to, side: e.toSide, at: atOf(e.to, e.toSide, e.toAt, e.toC), pins: e.toPins },
    ])
    const byNode = new Map()
    for (const [i, pair] of ends.entries()) {
      if (this.edges[i].path) continue
      for (const end of pair) {
        const n = this.nodes.get(end.node)
        if (!n) throw new Error(`нет узла ${end.node}`)
        if (!byNode.has(end.node)) byNode.set(end.node, [])
        byNode.get(end.node).push(end)
      }
    }
    for (const [id, list] of byNode) {
      const n = this.nodes.get(id); const ref = refs.get(id)
      const fixed = [] // [side, px]
      for (const end of list) {
        const explicit = end.pins ?? (end.side && end.at != null ? [...end.side].map((sd) => ({ side: sd, at: end.at })) : null)
        if (!explicit) continue
        end.cls = cls++
        for (const p of explicit) { pin(ref, end.cls, p.side, p.at, p.cost ?? 0); fixed.push([p.side, p.at * sideLen(n, p.side)]) }
      }
      const groups = new Map() // стороны → класс
      for (const end of list) {
        if (end.cls) continue
        const sides = end.side ?? n.opts.sides ?? 'NESW'
        if (!groups.has(sides)) groups.set(sides, cls++)
        end.cls = groups.get(sides)
      }
      for (const side of 'NESW') {
        const users = [...groups].filter(([sides]) => sides.includes(side)).map(([, c]) => c)
        if (!users.length) continue
        const len = sideLen(n, side)
        const need = Math.max(...users.map((c) => list.filter((e) => e.cls === c).length))
        const k = Math.max(3, Math.floor(len / pinStep), need + 2) * users.length
        // opts.slots[side] — заданные позиции (например, середины строк таблицы)
        const free = (n.opts.slots?.[side] ?? Array.from({ length: k }, (_, i) => (i + 1) / (k + 1)))
          .filter((at) => !fixed.some(([sd, px]) => sd === side && Math.abs(px - at * len) < 8))
        free.forEach((at, i) => pin(ref, users[i % users.length], side, at, Math.abs(at - 0.5) * centerCost))
      }
    }
    // e.path(box) — маршрут, заданный вручную (петли на самой таблице и т. п.); libavoid его не трогает
    const conns = this.edges.map((e, i) => {
      if (e.path) return null
      const [a, b] = ends[i]
      const c = new A.ConnRef(router, new A.ConnEnd(refs.get(a.node), a.cls), new A.ConnEnd(refs.get(b.node), b.cls))
      if (e.via) {
        const v = new A.CheckpointVector()
        for (const [x, y] of e.via) v.push_back(new A.Checkpoint(new A.Point(x, y)))
        c.setRoutingCheckpoints(v)
      }
      return c
    })
    router.processTransaction()
    conns.forEach((c, i) => {
      if (!c) { this.edges[i].route = this.edges[i].path(this.nodes.get(this.edges[i].from).box); return }
      const route = c.displayRoute(); const pts = []
      for (let k = 0; k < route.size(); k++) { const p = route.at(k); pts.push([p.x, p.y]) }
      this.edges[i].route = simplify(pts)
      const rt = this.edges[i].route
      if (rt.length < 2) throw new Error(`не удалось развести ${this.edges[i].from}→${this.edges[i].to}: ${JSON.stringify(pts)}`)
      // косой отрезок — признак сорванной разводки (обычно узлы ближе, чем buffer)
      if (rt.some((p, k) => k && Math.abs(p[0] - rt[k - 1][0]) > 0.5 && Math.abs(p[1] - rt[k - 1][1]) > 0.5)) {
        console.warn(`  линия ${this.edges[i].from}→${this.edges[i].to} не разведена ортогонально — проверьте зазоры между узлами`)
      }
    })
  }

  // ---------- подписи связей ----------
  placeLabels({ padX = 7, padY = 4, margin = 22 } = {}) {
    const labeled = this.edges.filter((e) => e.label)
    for (const e of labeled) {
      const bullet = width('• ', FONT.label)
      const lines = (Array.isArray(e.label) ? e.label : [e.label]).map((l) => {
        if (typeof l !== 'string') return l
        if (l.startsWith('[')) return { s: l, f: FONT.labelTech, color: C.faint }
        if (l.startsWith('  ')) return { s: l.trim(), f: FONT.label, color: C.text, indent: bullet }
        return { s: l, f: FONT.label, color: C.text }
      })
      e.labelBlock = block(lines, { align: e.labelAlign ?? 'center' })
      e.labelSize = { w: e.labelBlock.w + (e.labelAlign === 'start' ? 16 : padX * 2), h: e.labelBlock.h + padY * 2 }
    }
    labeled.sort((a, b) => b.labelSize.w * b.labelSize.h - a.labelSize.w * a.labelSize.h)
    const placed = []
    const nodeBoxes = [...[...this.nodes.values()].map((n) => n.box), ...this.obstacles]
    for (const e of labeled) {
      const { w, h } = e.labelSize
      const pts = e.route
      const total = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)
      let best = null
      let run = 0
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]; const b = pts[i + 1]
        const len = Math.hypot(b[0] - a[0], b[1] - a[1])
        const horiz = Math.abs(a[1] - b[1]) < 0.5
        const along = horiz ? w : h
        const pref = e.labelAt ?? 0.5
        for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82, 0.1, 0.9]) {
          const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
          // на линии; запасные места — рядом с линией. labelPlace: 'N'|'S'|'E'|'W' — только сбоку.
          const side = { N: [0, -(h / 2 + 6)], S: [0, h / 2 + 6], E: [w / 2 + 7, 0], W: [-(w / 2 + 7), 0] }
          let offsets = [[0, 0, 0]]
          if (horiz) offsets.push([...side.N, 35], [...side.S, 35])
          else offsets.push([...side.E, 35], [...side.W, 35])
          if (e.labelPlace) offsets = [[...side[e.labelPlace], 1]]
          for (const [dx, dy, penalty] of offsets) {
            const box = { x: p[0] + dx - w / 2, y: p[1] + dy - h / 2, w, h }
            let cost = penalty
            const fitA = len * t - along / 2; const fitB = len * (1 - t) - along / 2
            if (penalty === 0 && (fitA < margin || fitB < margin)) cost += 60 + Math.max(0, margin - Math.min(fitA, fitB))
            for (const nb of nodeBoxes) if (boxHit(box, nb, 4)) cost += 1000
            for (const pb of placed) if (boxHit(box, pb, 4)) cost += 1000
            for (const f of this.edges) {
              if (f === e) {
                if (penalty) for (let k = 0; k < pts.length - 1; k++) if (segHitsBox(pts[k], pts[k + 1], box, 2)) cost += 200
                continue
              }
              for (let k = 0; k < f.route.length - 1; k++) if (segHitsBox(f.route[k], f.route[k + 1], box, 3)) cost += 400
            }
            const pos = (run + len * t) / total
            cost += Math.abs(pos - pref) * 40 + Math.abs(t - 0.5) * 6 - Math.min(len, 400) / 40
            if (!best || cost < best.cost) best = { cost, box }
          }
        }
        run += len
      }
      e.labelBox = best.box
      if (best.cost >= 400) console.warn(`  подпись «${lineText(e)}» (${e.from}→${e.to}) не нашла свободного места`)
      placed.push(best.box)
    }
  }

  // ---------- вывод ----------
  drawEdge(e) {
    const color = e.color ?? C.line
    const pts = e.route.map((p) => [...p])
    let heads = ''
    const shorten = (end, by) => {
      const [i, j] = end === 'end' ? [pts.length - 1, pts.length - 2] : [0, 1]
      const u = unit(pts[j], pts[i])
      heads += arrowHead([...pts[i]], u, { color })
      pts[i] = [pts[i][0] - u[0] * by, pts[i][1] - u[1] * by]
    }
    const arrow = e.arrow ?? 'end'
    if (arrow === 'end' || arrow === 'both') shorten('end', 9)
    if (arrow === 'start' || arrow === 'both') shorten('start', 9)
    for (const [end, fn] of Object.entries(e.markers ?? {})) {
      const [i, j] = end === 'end' ? [e.route.length - 1, e.route.length - 2] : [0, 1]
      heads += fn(e.route[i], unit(e.route[j], e.route[i]), color)
    }
    const dash = e.dashed ? ` stroke-dasharray="${e.dashed === true ? '7 5' : e.dashed}"` : ''
    let out = `<g class="edge"><title>${esc(e.from)}->${esc(e.to)}</title>` +
      `<path d="${roundedPath(pts, e.radius ?? 10)}" fill="none" stroke="${color}" stroke-width="${e.width ?? STROKE.line}"` +
      ` stroke-linecap="round" stroke-linejoin="round"${dash}/>${heads}`
    if (e.labelBox) {
      const b = e.labelBox
      out += `<rect x="${r(b.x)}" y="${r(b.y)}" width="${r(b.w)}" height="${r(b.h)}" rx="6" fill="${e.labelBg ?? '#ffffff'}"` +
        `${e.labelBorder ? ` stroke="${e.labelBorder}" stroke-width="1"` : ''}/>` +
        e.labelBlock.draw(this, e.labelAlign === 'start' ? b.x + 8 : b.x + b.w / 2, b.y + (b.h - e.labelBlock.h) / 2)
    }
    return out + '</g>'
  }

  async render({ route = {}, labels = {}, skipRoute = false } = {}) {
    if (!skipRoute) await this.route(route)
    this.placeLabels(labels)
    // содержимое
    const nodesSvg = [...this.nodes.values()].map((n) =>
      `<g class="node"><title>${esc(n.id)}</title>${n.shape.draw(this, n.box)}</g>`).join('\n')
    const edgesSvg = this.edges.map((e) => this.drawEdge(e)).join('\n')
    // габариты
    const xs = []; const ys = []
    const addBox = (b) => { xs.push(b.x, b.x + b.w); ys.push(b.y, b.y + b.h) }
    for (const n of this.nodes.values()) addBox(n.shape.bounds ? n.shape.bounds(n.box) : n.box)
    for (const e of this.edges) { for (const p of e.route) { xs.push(p[0]); ys.push(p[1]) } if (e.labelBox) addBox(e.labelBox) }
    for (const b of this.extents ?? []) addBox(b)
    const minX = Math.min(...xs); const minY = Math.min(...ys)
    const cw = Math.max(...xs) - minX; const ch = Math.max(...ys) - minY
    // заголовок
    const pad = this.pad
    let header = ''
    let hh = 0
    if (this.title) {
      const t = block([
        { s: this.title, f: FONT.title, color: C.ink },
        this.subtitle && { s: this.subtitle, f: FONT.subtitle, color: C.muted },
      ], { align: 'start', gap: 2 })
      header = `<g id="header">${t.draw(this, pad, pad)}` +
        `<rect x="${pad}" y="${r(pad + t.h + 12)}" width="56" height="4" rx="2" fill="#2563eb"/></g>`
      hh = pad + t.h + 16 + 22
      this.headerW = t.w
    }
    // headerRight — фигура (например, легенда цветов) справа в шапке
    let hr = ''
    if (this.headerRight) {
      const s = this.headerRight
      this.headerW = (this.headerW ?? 0) + 60 + s.w
      hh = Math.max(hh, pad + s.h + 22)
    }
    const W = Math.ceil(Math.max(cw, this.headerW ?? 0) + pad * 2)
    if (this.headerRight) {
      const s = this.headerRight
      hr = `<g id="header-right">${s.draw(this, { x: W - pad - s.w, y: pad, w: s.w, h: s.h })}</g>`
    }
    const H = Math.ceil(ch + hh + pad * (this.title ? 1 : 2))
    const dx = pad - minX + Math.max(0, ((this.headerW ?? 0) - cw) / 2)
    const dy = (this.title ? hh : pad) - minY
    const body = `<g id="content" transform="translate(${r(dx)},${r(dy)})">\n${this.back.join('\n')}\n${edgesSvg}\n${nodesSvg}\n${this.front.join('\n')}\n</g>`
    const css = await embeddedFontCss(this.used)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-header="${r(hh)}">\n` +
      `<style>\n${css}\n</style>\n<rect width="${W}" height="${H}" fill="${C.bg}"/>\n${header}${hr}\n${body}\n</svg>\n`
  }
}

function lineText(e) { return (Array.isArray(e.label) ? e.label : [e.label]).map((l) => (typeof l === 'string' ? l : l.s)).join(' ') }

export { STROKE, C, FONT, SANS }
