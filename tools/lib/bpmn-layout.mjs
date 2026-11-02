// Раскладка BPMN: по описанию «узел → дорожка и колонка» строит раздел BPMNDiagram (DI):
// размеры и координаты пула, дорожек, задач, событий и шлюзов, маршруты потоков (libavoid,
// ортогонально, в обход фигур и подписей) и места подписей. Семантика процесса не меняется.
import { avoidLib as avoid } from './kit.mjs'
import { textWidth } from './fonts.mjs'
import { F } from './theme.mjs'

export const SIZE = { task: [176, 96], event: [38, 38], gateway: [52, 52] }
export const LABEL_FONT = F(14, 400)
const LINE = 18

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const kindOf = (type) => (/Task$|^task$/.test(type) ? 'task' : /Event$/.test(type) ? 'event' : /Gateway$/.test(type) ? 'gateway' : null)

// перенос подписи по словам в ширину maxW
function wrap(text, maxW) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && textWidth(next, LABEL_FONT) > maxW) { lines.push(cur); cur = w } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

/** Разбор нужного из XML процесса: элементы, их типы и имена, потоки. */
export function parseModel(xml) {
  const els = new Map()
  for (const m of xml.matchAll(/<bpmn:(\w+) id="([^"]+)"(?: name="([^"]*)")?/g)) {
    els.set(m[2], { type: m[1], id: m[2], name: (m[3] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&') })
  }
  const flows = []
  for (const m of xml.matchAll(/<bpmn:(sequenceFlow|messageFlow) id="([^"]+)"(?: name="([^"]*)")? sourceRef="([^"]+)" targetRef="([^"]+)"/g)) {
    flows.push({ type: m[1], id: m[2], name: m[3] ?? '', from: m[4], to: m[5] })
  }
  return { els, flows }
}

/**
 * spec: { pool, lanes: [[id, высота]], collapsed: [[id, высота]], x0, pitch,
 *         nodes: { id: [дорожка, колонка, { dy, label: 'N'|'S'|'E'|'W' }] },
 *         flows: { id: { fromSide, toSide, labelAt: 'start'|'end' } } }
 */
export async function layoutBpmn(xml, spec) {
  const Av = await avoid()
  const { els, flows } = parseModel(xml)
  const pitch = spec.pitch ?? 200
  const x0 = spec.x0 ?? 0
  const poolX = -140
  const laneX = poolX + 30
  // дорожки
  const lanes = []
  let y = 0
  for (const [id, h] of spec.lanes) { lanes.push({ id, y, h }); y += h }
  const poolH = y
  const laneOf = Object.fromEntries(lanes.map((l) => [l.id, l]))
  // узлы
  const nodes = new Map()
  for (const [id, [lane, col, o = {}]] of Object.entries(spec.nodes)) {
    const el = els.get(id)
    if (!el) throw new Error(`нет элемента ${id}`)
    const kind = kindOf(el.type)
    const [w, h] = SIZE[kind]
    const L = laneOf[lane]
    const cx = x0 + col * pitch; const cy = L.y + L.h / 2 + (o.dy ?? 0)
    const n = { id, el, kind, x: cx - w / 2, y: cy - h / 2, w, h, cx, cy, o }
    // внешняя подпись события или шлюза
    if (kind !== 'task' && el.name) {
      const lines = wrap(el.name, o.labelW ?? 90)
      const lw = Math.max(...lines.map((s) => textWidth(s, LABEL_FONT))) + 6
      const lh = lines.length * LINE + 2
      const side = o.label ?? 'S'
      const gap = 7
      n.label = side === 'S' ? { x: cx - lw / 2, y: n.y + h + gap, w: lw, h: lh }
        : side === 'N' ? { x: cx - lw / 2, y: n.y - gap - lh, w: lw, h: lh }
          : side === 'E' ? { x: n.x + w + gap, y: cy - lh / 2, w: lw, h: lh }
            : side === 'NE' ? { x: n.x + w - 4, y: n.y - lh + 2, w: lw, h: lh }
              : side === 'NW' ? { x: n.x - lw + 4, y: n.y - lh + 2, w: lw, h: lh }
                : { x: n.x - gap - lw, y: cy - lh / 2, w: lw, h: lh }
    }
    nodes.set(id, n)
  }
  for (const id of els.keys()) {
    const k = kindOf(els.get(id).type)
    if (k && !nodes.has(id)) throw new Error(`узел ${id} не размещён`)
  }
  const maxX = Math.max(...[...nodes.values()].map((n) => n.x + n.w), ...[...nodes.values()].filter((n) => n.label).map((n) => n.label.x + n.label.w))
  const poolW = maxX + (spec.padRight ?? 60) - poolX
  // свёрнутые пулы под основным
  const collapsed = []
  let cy = poolH + (spec.collapsedGap ?? 90)
  for (const [id, h] of spec.collapsed ?? []) { collapsed.push({ id, x: poolX, y: cy, w: poolW, h }); cy += h + 40 }

  // ---------- разводка потоков ----------
  const router = new Av.Router(Av.RouterFlag.OrthogonalRouting.value)
  router.setRoutingParameter(Av.RoutingParameter.shapeBufferDistance, spec.buffer ?? 14)
  router.setRoutingParameter(Av.RoutingParameter.idealNudgingDistance, 12)
  router.setRoutingParameter(Av.RoutingParameter.segmentPenalty, 80)
  router.setRoutingOption(Av.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes, true)
  router.setRoutingOption(Av.RoutingOption.nudgeSharedPathsWithCommonEndPoint, true)
  const refs = new Map()
  const rect = (x, yy, w, h) => new Av.Rectangle(new Av.Point(x, yy), new Av.Point(x + w, yy + h))
  for (const n of nodes.values()) {
    refs.set(n.id, new Av.ShapeRef(router, rect(n.x, n.y, n.w, n.h)))
    if (n.label) new Av.ShapeRef(router, rect(n.label.x - 3, n.label.y - 3, n.label.w + 6, n.label.h + 6))
  }
  const DIR = { N: 1, S: 2, W: 4, E: 8 }
  const FR = [0.5, 0.3, 0.7, 0.15, 0.85]
  let cls = 1
  const pin = (n, c, side, at) => {
    const [xo, yo] = { N: [at, 0], S: [at, 1], W: [0, at], E: [1, at] }[side]
    const p = new Av.ShapeConnectionPin(refs.get(n.id), c, xo, yo, true, 0, DIR[side])
    p.setExclusive(true)
    if (at !== 0.5) p.setConnectionCost(Math.abs(at - 0.5) * 30)
  }
  // Концы потоков. Совпадающие точки разных классов libavoid не переваривает, поэтому:
  // явные концы (сторона задана) — по одной точке, у задач на стороне доли раздаются по очереди;
  // остальные концы узла делят один класс на свободных местах.
  const seq = flows.filter((f) => f.type === 'sequenceFlow')
  const routed = seq.map((f) => {
    const o = spec.flows?.[f.id] ?? {}
    return { f, o, a: { id: f.from, side: o.fromSide, at: o.fromAt }, b: { id: f.to, side: o.toSide, at: o.toAt } }
  })
  const ends = routed.flatMap((x) => [x.a, x.b])
  for (const n of nodes.values()) {
    const mine = ends.filter((e) => e.id === n.id)
    const taken = new Set()
    for (const e of mine.filter((x) => x.side)) {
      const at = e.at ?? (n.kind === 'task' ? FR.find((f) => !taken.has(`${e.side}${f}`)) : 0.5)
      taken.add(`${e.side}${at}`)
      e.c = cls++
      pin(n, e.c, e.side, at)
    }
    const rest = mine.filter((x) => !x.side)
    if (!rest.length) continue
    const c = cls++
    for (const e of rest) e.c = c
    for (const side of 'NESW') {
      for (const at of n.kind === 'task' ? FR : [0.5]) if (!taken.has(`${side}${at}`)) pin(n, c, side, at)
    }
  }
  const conns = routed.map(({ a, b }) => new Av.ConnRef(router, new Av.ConnEnd(refs.get(a.id), a.c), new Av.ConnEnd(refs.get(b.id), b.c)))
  router.processTransaction()
  const edges = []
  routed.forEach(({ f, o }, i) => {
    const r = conns[i].displayRoute(); const pts = []
    for (let k = 0; k < r.size(); k++) { const p = r.at(k); pts.push([Math.round(p.x), Math.round(p.y)]) }
    const wp = pts.filter((p, k) => k === 0 || p[0] !== pts[k - 1][0] || p[1] !== pts[k - 1][1])
    let label
    if (f.name) {
      const lw = textWidth(f.name, LABEL_FONT) + 6; const lh = LINE
      const [p, q] = o.labelAt === 'end' ? [wp[wp.length - 1], wp[wp.length - 2]] : [wp[0], wp[1]]
      const dx = Math.sign(q[0] - p[0]); const dy = Math.sign(q[1] - p[1])
      label = dx ? { x: dx > 0 ? p[0] + 8 : p[0] - 8 - lw, y: p[1] - lh - 3, w: lw, h: lh }
        : { x: p[0] + 7, y: dy > 0 ? p[1] + 6 : p[1] - 6 - lh, w: lw, h: lh }
      if (o.label) label = { ...label, ...o.label }
    }
    edges.push({ id: f.id, wp, label })
  })
  // потоки сообщений: вертикально между задачей и свёрнутым пулом
  for (const f of flows.filter((x) => x.type === 'messageFlow')) {
    const o = spec.flows?.[f.id] ?? {}
    const task = nodes.get(nodes.has(f.from) ? f.from : f.to)
    const pool = collapsed.find((p) => p.id === f.from || p.id === f.to)
    const x = task.cx + (o.dx ?? 0)
    const down = nodes.has(f.from)
    const wp = down ? [[x, task.y + task.h], [x, pool.y]] : [[x, pool.y], [x, task.y + task.h]]
    const lw = textWidth(f.name, LABEL_FONT) + 6
    const ly = (task.y + task.h + pool.y) / 2 - LINE / 2
    const label = f.name ? { x: o.labelSide === 'W' ? x - 10 - lw : x + 10, y: ly, w: lw, h: LINE } : undefined
    edges.push({ id: f.id, wp, label })
  }

  // ---------- DI ----------
  const B = (x, yy, w, h) => `<dc:Bounds x="${Math.round(x)}" y="${Math.round(yy)}" width="${Math.round(w)}" height="${Math.round(h)}" />`
  const out = []
  out.push(`      <bpmndi:BPMNShape id="${spec.pool}_di" bpmnElement="${spec.pool}" isHorizontal="true">${B(poolX, 0, poolW, poolH)}</bpmndi:BPMNShape>`)
  for (const l of lanes) out.push(`      <bpmndi:BPMNShape id="${l.id}_di" bpmnElement="${l.id}" isHorizontal="true">${B(laneX, l.y, poolX + poolW - laneX, l.h)}</bpmndi:BPMNShape>`)
  for (const p of collapsed) out.push(`      <bpmndi:BPMNShape id="${p.id}_di" bpmnElement="${p.id}" isHorizontal="true">${B(p.x, p.y, p.w, p.h)}</bpmndi:BPMNShape>`)
  for (const n of nodes.values()) {
    const lab = n.label ? `<bpmndi:BPMNLabel>${B(n.label.x, n.label.y, n.label.w, n.label.h)}</bpmndi:BPMNLabel>` : ''
    const marker = n.kind === 'gateway' ? ' isMarkerVisible="true"' : ''
    out.push(`      <bpmndi:BPMNShape id="${n.id}_di" bpmnElement="${n.id}"${marker}>${B(n.x, n.y, n.w, n.h)}${lab}</bpmndi:BPMNShape>`)
  }
  for (const e of edges) {
    const lab = e.label ? `<bpmndi:BPMNLabel>${B(e.label.x, e.label.y, e.label.w, e.label.h)}</bpmndi:BPMNLabel>` : ''
    out.push(`      <bpmndi:BPMNEdge id="${e.id}_di" bpmnElement="${e.id}">${e.wp.map(([x, yy]) => `<di:waypoint x="${x}" y="${yy}" />`).join('')}${lab}</bpmndi:BPMNEdge>`)
  }
  const plane = xml.match(/<bpmndi:BPMNPlane [^>]*>/)[0]
  const di = `${plane}\n${out.join('\n')}\n    </bpmndi:BPMNPlane>`
  return xml.replace(/<bpmndi:BPMNPlane [^>]*>[\s\S]*<\/bpmndi:BPMNPlane>/, di)
}

export { esc }
