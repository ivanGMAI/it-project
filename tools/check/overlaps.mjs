// Проверка наложений по реальной геометрии отрисовки (Chromium: getBoundingClientRect,
// getPointAtLength), а не по оценке ширины текста.
//   node check/overlaps.mjs            — все diagrams/svg/*.svg
//   node check/overlaps.mjs 03-er      — одну
// Ищет: узел на узле; текст, вылезающий за рамку своего узла; линию сквозь чужой узел;
// линию поверх текста (в том числе внутри таблицы, от которой она идёт); подпись связи на узле,
// на другой подписи или перечёркнутую чужой линией; слипшиеся концы линий у одного узла;
// для BPMN — ещё подписи пулов и дорожек. Код выхода 1, если что-то найдено.
import { launchBrowser as launch } from '../lib/browser.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..', '..', 'diagrams', 'svg')
const args = process.argv.slice(2)
const names = args.length
  ? args.map((a) => path.basename(a).replace(/\.(svg|png|dot|bpmn)$/, ''))
  : (await fs.readdir(root)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort()

// ---------- извлечение геометрии в браузере ----------
function extract(kind) {
  const R = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] }
  const U = (bs) => [Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])),
    Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))]
  const sample = (el, step = 2) => {
    const L = el.getTotalLength(); const m = el.getScreenCTM(); const pts = []
    for (let l = 0; l <= L; l += step) {
      const p = el.getPointAtLength(l)
      pts.push([p.x * m.a + p.y * m.c + m.e, p.x * m.b + p.y * m.d + m.f])
    }
    return pts
  }
  const txt = (t) => ({ box: R(t), s: t.textContent.trim() })
  const nodes = []; const edges = []; const frames = []
  if (kind === 'own') {
    for (const g of document.querySelectorAll('g.node')) {
      const name = g.querySelector('title').textContent
      const shapes = [...g.querySelectorAll('polygon, ellipse, path, polyline, rect, circle')].filter((s) => {
        const st = s.getAttribute('stroke'); const fi = s.getAttribute('fill')
        return !(st === 'transparent' && (fi === 'none' || fi === 'transparent' || !fi)) && !(st === 'none' && fi === 'none')
      })
      const texts = [...g.querySelectorAll('text')].filter((t) => t.textContent.trim()).map(txt)
      if (!shapes.length && !texts.length) continue
      // Обрамлённый узел — если его фигура занимает основную площадь (а не цветные квадратики легенды).
      const area = (b) => (b[2] - b[0]) * (b[3] - b[1])
      const all = U([...shapes.map(R), ...texts.map((t) => t.box)])
      const framed = shapes.length > 0 && Math.max(...shapes.map((sh) => area(R(sh)))) >= 0.5 * area(all)
      nodes.push({ name, box: shapes.length ? U(shapes.map(R)) : U(texts.map((t) => t.box)), framed, texts, label: texts[0]?.s ?? name })
    }
    for (const g of document.querySelectorAll('g.edge')) {
      const title = g.querySelector('title').textContent
      const ends = title.split(/->|--/).map((e) => e.split(':')[0])
      const lines = [...g.querySelectorAll('path')].map((p) => sample(p))
      const labels = [...g.querySelectorAll('text')].filter((t) => t.textContent.trim()).map(txt)
      edges.push({ name: title, ends, lines, labels })
    }
  } else {
    const shapes = [...document.querySelectorAll('g.djs-shape')]
    const owners = {}
    for (const g of shapes) {
      const id = g.dataset.elementId
      const vis = g.querySelector(':scope > .djs-visual')
      if (!vis) continue
      const texts = [...vis.querySelectorAll('text')].filter((t) => t.textContent.trim()).map(txt)
      if (id.startsWith('Participant_') || id.startsWith('Lane_')) {
        for (const t of texts) frames.push({ name: id, ...t })
        continue
      }
      if (id.endsWith('_label')) {
        owners[id] = texts
        continue
      }
      const geo = [...vis.children].filter((c) => c.tagName !== 'text' && c.tagName !== 'g' && c.tagName !== 'path')
      nodes.push({ name: id, box: U((geo.length ? geo : [vis]).map(R)), framed: true, texts, label: texts[0]?.s ?? id })
    }
    for (const g of document.querySelectorAll('g.djs-connection')) {
      const id = g.dataset.elementId
      const lines = [...g.querySelectorAll(':scope > .djs-visual > path, :scope > .djs-visual > polyline')].map((p) => sample(p))
      edges.push({ name: id, ends: [], lines, labels: [] })
    }
    for (const [id, texts] of Object.entries(owners)) {
      const owner = id.slice(0, -6)
      const edge = edges.find((e) => e.name === owner)
      if (edge) edge.labels.push(...texts)
      else if (texts.length) nodes.push({ name: id, owner, box: U(texts.map((t) => t.box)), framed: false, texts: [], label: texts.map((t) => t.s).join(' ') })
    }
  }
  return { nodes, edges, frames }
}

// ---------- проверки ----------
const hit = (a, b, tol = 1) => a[0] < b[2] - tol && b[0] < a[2] - tol && a[1] < b[3] - tol && b[1] < a[3] - tol
const inBox = (p, b, tol) => p[0] > b[0] + tol && p[0] < b[2] - tol && p[1] > b[1] + tol && p[1] < b[3] - tol
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function check({ nodes, edges, frames }) {
  const out = new Set()
  const q = (s) => `«${s.length > 28 ? s.slice(0, 27) + '…' : s}»`
  // узел на узле
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]; const b = nodes[j]
      if (a.owner === b.name || b.owner === a.name) continue
      if (hit(a.box, b.box, 1)) out.add(`узел на узле: ${q(a.label)} и ${q(b.label)}`)
    }
  }
  // текст вылезает за рамку
  for (const n of nodes) {
    if (!n.framed) continue
    for (const t of n.texts) {
      if (t.box[0] < n.box[0] - 0.5 || t.box[2] > n.box[2] + 0.5) out.add(`текст за рамкой: ${q(t.s)} в ${q(n.label)}`)
    }
  }
  for (const e of edges) {
    const pts = e.lines.flat()
    const inner = e.lines.flatMap((l) => l.slice(5, -5)) // без концов у портов
    for (const n of nodes) {
      const own = e.ends.includes(n.name) || e.ends.includes(n.owner)
      if (!own && pts.filter((p) => inBox(p, n.box, 3)).length >= 2) out.add(`линия сквозь узел: ${e.name} через ${q(n.label)}`)
      for (const t of n.texts) {
        if (inner.filter((p) => inBox(p, t.box, 0.5)).length >= 2) out.add(`линия по тексту: ${e.name} по ${q(t.s)}`)
      }
      if (!own && n.texts.length === 0 && pts.filter((p) => inBox(p, n.box, 0.5)).length >= 2) out.add(`линия по подписи: ${e.name} через ${q(n.label)}`)
    }
    for (const t of e.labels) {
      for (const n of nodes) if (hit(t.box, n.box, 0.5)) out.add(`подпись на узле: ${q(t.s)} (${e.name}) на ${q(n.label)}`)
      for (const f of edges) {
        if (f === e) continue
        if (f.lines.flat().filter((p) => inBox(p, t.box, 0.5)).length >= 2) out.add(`подпись перечёркнута: ${q(t.s)} (${e.name}) линией ${f.name}`)
        for (const u of f.labels) if (e.name < f.name && hit(t.box, u.box, 0.5)) out.add(`подпись на подписи: ${q(t.s)} и ${q(u.s)}`)
      }
    }
  }
  // слипшиеся концы у одного узла
  for (const n of nodes) {
    const tips = []
    for (const e of edges) {
      if (!e.ends.includes(n.name)) continue
      for (const l of e.lines) {
        for (const p of [l[0], l[l.length - 1]]) {
          const d = Math.max(n.box[0] - p[0], p[0] - n.box[2], n.box[1] - p[1], p[1] - n.box[3])
          if (d < 14) tips.push({ e: e.name, p })
        }
      }
    }
    for (let i = 0; i < tips.length; i++) {
      for (let j = i + 1; j < tips.length; j++) {
        if (tips[i].e !== tips[j].e && dist(tips[i].p, tips[j].p) < 7) out.add(`концы слиплись у ${q(n.label)}: ${tips[i].e} и ${tips[j].e}`)
      }
    }
  }
  // подписи пулов и дорожек
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) if (hit(frames[i].box, frames[j].box, 0.5)) out.add(`подпись пула на подписи: ${q(frames[i].s)} и ${q(frames[j].s)}`)
  }
  return [...out].sort()
}

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
let total = 0
for (const name of names) {
  const svg = await fs.readFile(path.join(root, `${name}.svg`), 'utf8')
  const kind = svg.includes('djs-element') ? 'bpmn' : 'own'
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg.slice(svg.indexOf('<svg'))}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  const found = check(await page.evaluate(extract, kind))
  total += found.length
  console.log(`${name}: ${found.length ? `${found.length} наложений` : 'чисто'}`)
  for (const f of found) console.log(`   ${f}`)
}
await browser.close()
process.exit(total ? 1 : 0)
