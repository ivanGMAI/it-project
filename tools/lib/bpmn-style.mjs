// Отрисовка BPMN 2.0 в общем стиле набора: bpmn-js в Chromium, цвета через стандартные
// атрибуты раскраски DI (bioc:*, color:* — только в памяти, исходный .bpmn не меняется),
// шрифт Inter, заголовок и легенда как у остальных диаграмм.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { Diagram, r } from './kit.mjs'
import { legend } from './shapes.mjs'
import { F, HUE, C } from './theme.mjs'

const require = createRequire(import.meta.url)
const viewerJs = require.resolve('bpmn-js/dist/bpmn-viewer.production.min.js')
const fontsDir = path.join(import.meta.dirname, '..', 'fonts')

export const BPMN_COLORS = {
  start: { fill: '#dcfce7', stroke: '#15803d' },
  end: { fill: '#fee2e2', stroke: '#b91c1c' },
  gateway: { fill: '#fef3c7', stroke: '#b45309' },
  pool: { fill: '#ffffff', stroke: '#475569' },
  collapsed: { fill: '#f1f5f9', stroke: '#475569' },
  flow: '#334155',
  message: '#64748b',
}
const mix = (hex, k) => {
  const n = parseInt(hex.slice(1), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Раскрасить DI в памяти: задачи — по цвету дорожки, события и шлюзы — по типу. */
function colorize(xml, laneHue) {
  const type = new Map([...xml.matchAll(/<bpmn:(\w+) id="([^"]+)"/g)].map((m) => [m[2], m[1]]))
  const laneOf = new Map()
  for (const m of xml.matchAll(/<bpmn:lane id="([^"]+)"[^>]*>([\s\S]*?)<\/bpmn:lane>/g)) {
    for (const ref of m[2].matchAll(/<bpmn:flowNodeRef>([^<]+)<\/bpmn:flowNodeRef>/g)) laneOf.set(ref[1], m[1])
  }
  const collapsed = new Set([...xml.matchAll(/<bpmn:participant id="([^"]+)" name="[^"]*" \/>/g)].map((m) => m[1]))
  const paint = (id) => {
    const t = type.get(id) ?? ''
    if (t === 'startEvent') return BPMN_COLORS.start
    if (t === 'endEvent') return BPMN_COLORS.end
    if (/Gateway$/.test(t)) return BPMN_COLORS.gateway
    if (t === 'participant') return collapsed.has(id) ? BPMN_COLORS.collapsed : BPMN_COLORS.pool
    if (t === 'lane') { const h = HUE[laneHue[id] ?? 'slate']; return { fill: mix(h.fill, 0.45), stroke: '#94a3b8' } }
    if (/Task$|^task$/.test(t)) { const h = HUE[laneHue[laneOf.get(id)] ?? 'slate']; return { fill: h.fill, stroke: h.strong } }
    if (t === 'sequenceFlow') return { stroke: BPMN_COLORS.flow }
    if (t === 'messageFlow') return { stroke: BPMN_COLORS.message }
    return null
  }
  let out = xml.replace(/<(bpmndi:BPMN(?:Shape|Edge)) id="([^"]+)" bpmnElement="([^"]+)"/g, (m, tag, id, el) => {
    const c = paint(el)
    if (!c) return m
    const fill = c.fill ? ` bioc:fill="${c.fill}" color:background-color="${c.fill}"` : ''
    return `${m} bioc:stroke="${c.stroke}" color:border-color="${c.stroke}"${fill}`
  })
  out = out.replace(/<bpmn:definitions /, '<bpmn:definitions xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:color="http://www.omg.org/spec/BPMN/non-normative/color/1.0" ')
  return out
}

// ---------- легенда BPMN ----------
const S = BPMN_COLORS
const ev = (end) => (d, x, y, w, h) => `<circle cx="${r(x + w / 2)}" cy="${r(y + h / 2)}" r="${end ? 10 : 10.5}" fill="${end ? S.end.fill : S.start.fill}" stroke="${end ? S.end.stroke : S.start.stroke}" stroke-width="${end ? 3 : 1.6}"/>`
const task = (hue) => (d, x, y, w, h) => `<rect x="${r(x + 3)}" y="${r(y + 1)}" width="${w - 6}" height="${h - 2}" rx="6" fill="${HUE[hue].fill}" stroke="${HUE[hue].strong}" stroke-width="1.6"/>`
const gw = (d, x, y, w, h) => {
  const cx = x + w / 2; const cy = y + h / 2; const k = 12
  return `<polygon points="${r(cx)},${r(cy - k)} ${r(cx + k)},${r(cy)} ${r(cx)},${r(cy + k)} ${r(cx - k)},${r(cy)}" fill="${S.gateway.fill}" stroke="${S.gateway.stroke}" stroke-width="1.6"/>` +
    `<path d="M${r(cx - 4)},${r(cy - 4)} L${r(cx + 4)},${r(cy + 4)} M${r(cx + 4)},${r(cy - 4)} L${r(cx - 4)},${r(cy + 4)}" stroke="${S.gateway.stroke}" stroke-width="2.2"/>`
}
const flowS = (d, x, y, w, h) => `<line x1="${x + 2}" y1="${r(y + h / 2)}" x2="${x + w - 9}" y2="${r(y + h / 2)}" stroke="${S.flow}" stroke-width="1.6"/>` +
  `<path d="M${x + w - 1},${r(y + h / 2)} l-10,-5 v10 z" fill="${S.flow}"/>`
const flowM = (d, x, y, w, h) => `<circle cx="${x + 5}" cy="${r(y + h / 2)}" r="3.5" fill="#fff" stroke="${S.message}" stroke-width="1.4"/>` +
  `<line x1="${x + 9}" y1="${r(y + h / 2)}" x2="${x + w - 9}" y2="${r(y + h / 2)}" stroke="${S.message}" stroke-width="1.6" stroke-dasharray="6 4"/>` +
  `<path d="M${x + w - 1},${r(y + h / 2)} l-10,-5 v10 z" fill="#fff" stroke="${S.message}" stroke-width="1.3"/>`

export function bpmnLegend(lanesUsed, { message = false } = {}) {
  const names = { blue: 'задача аналитика', teal: 'задача сервера', violet: 'задача агента', slate: 'задача браузера' }
  const items = [
    { text: 'начальное событие', sample: ev(false) },
    { text: 'конечное событие', sample: ev(true) },
    ...lanesUsed.map((h) => ({ text: names[h], sample: task(h) })),
    { text: 'исключающий шлюз', sample: gw },
    { text: 'поток управления', sample: flowS },
    message && { text: 'поток сообщений', sample: flowM },
  ].filter(Boolean)
  return legend({ title: 'Обозначения', cols: Math.ceil(items.length / 2), sw: 40, sh: 24, items })
}

// ---------- отрисовка ----------
export async function renderBpmn(page, xml, meta = {}) {
  const fontCss = await Promise.all([400, 600].map(async (wgt) =>
    `@font-face{font-family:'Inter';font-weight:${wgt};src:url(data:font/woff2;base64,${(await fs.readFile(path.join(fontsDir, `Inter-${wgt}.woff2`))).toString('base64')}) format('woff2')}`))
  await page.setContent(`<!doctype html><html><head><style>${fontCss.join('')}</style></head><body style="margin:0"><div id="c" style="width:3200px;height:2200px"></div></body></html>`)
  await page.evaluate(async () => { await document.fonts.load('15px Inter'); await document.fonts.load('600 15px Inter') })
  await page.addScriptTag({ path: viewerJs })
  const colored = colorize(xml, meta.laneHue ?? {})
  const { svg, warnings, texts } = await page.evaluate(async (x) => {
    // eslint-disable-next-line no-undef
    const viewer = new BpmnJS({
      container: '#c',
      textRenderer: { defaultStyle: { fontFamily: 'Inter', fontSize: 14.5, lineHeight: 1.2 }, externalStyle: { fontSize: 14 } },
      bpmnRenderer: { defaultLabelColor: '#1e293b' },
    })
    const { warnings } = await viewer.importXML(x)
    // подписи пулов и дорожек — полужирные
    const reg = viewer.get('elementRegistry')
    for (const el of reg.getAll()) {
      if (el.type === 'bpmn:Participant' || el.type === 'bpmn:Lane') {
        for (const t of reg.getGraphics(el).querySelectorAll(':scope > .djs-visual > text')) t.style.fontWeight = '600'
      }
    }
    const { svg } = await viewer.saveSVG()
    const texts = [...document.querySelectorAll('#c text')].map((t) => [t.textContent, t.style.fontWeight === '600'])
    return { svg, warnings: warnings.map((w) => w.message), texts }
  }, colored)
  for (const w of warnings) console.warn(`  bpmn-js: ${w}`)

  // встроить в общий каркас: заголовок, легенда, шрифты
  const vb = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number)
  const inner = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'))
    .replace(/font-family: Inter;/g, "font-family: Inter, 'Segoe UI', Arial, sans-serif;")
  const d = new Diagram({ title: meta.title, subtitle: meta.subtitle })
  for (const [s, bold] of texts) d.use(F(14.5, bold ? 600 : 400), s)
  d.node('bpmn', { w: vb[2], h: vb[3], draw: (dd, { x, y }) => `<g transform="translate(${r(x - vb[0])},${r(y - vb[1])})">${inner}</g>` }, { x: 0, y: 0 }, { pins: false })
  if (meta.legend) d.headerRight = meta.legend
  return d.render({ skipRoute: true })
}

export { C }
