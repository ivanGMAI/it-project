// Контраст текста и фона по WCAG 2.x (мелкий текст — не ниже 4,5:1), по настоящей отрисовке:
// SVG рисуется в Chromium без текста, под каждой надписью берутся 15 пикселей фона, фоном
// считается самый частый цвет (тонкие линии под текстом — подчёркивания — не в счёт).
//   node check/contrast.mjs            — все diagrams/svg/*.svg
//   node check/contrast.mjs 03-er      — одну
import fs from 'node:fs/promises'
import path from 'node:path'
import { launchBrowser } from '../lib/browser.mjs'

const root = path.resolve(import.meta.dirname, '..', '..', 'diagrams', 'svg')
const args = process.argv.slice(2)
const names = args.length
  ? args.map((a) => path.basename(a).replace(/\.(svg|png|mjs|bpmn)$/, ''))
  : (await fs.readdir(root)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort()

function measure() {
  const svg = document.querySelector('svg')
  const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim())
  const rgb = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
  const info = texts.map((t) => {
    const b = t.getBoundingClientRect()
    const cs = getComputedStyle(t)
    return { s: t.textContent.trim().slice(0, 32), fg: rgb(cs.fill), box: [b.left, b.top, b.width, b.height] }
  })
  for (const t of texts) t.style.visibility = 'hidden'
  return info
}

const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

const browser = await launchBrowser()
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })
let bad = 0
for (const name of names) {
  const svg = await fs.readFile(path.join(root, `${name}.svg`), 'utf8')
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  const info = await page.evaluate(measure)
  // фон без текста: снимок SVG и выборка пикселей под каждой надписью
  const el = await page.$('svg')
  const png = await el.screenshot()
  const pixels = await page.evaluate(async ({ b64, boxes }) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0)
    const svgBox = document.querySelector('svg').getBoundingClientRect()
    return boxes.map(([x, y, w, h]) => {
      const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map((k) => Math.round(x - svgBox.left + w * k))
      const ys = [0.25, 0.5, 0.75].map((k) => Math.round(y - svgBox.top + h * k))
      const out = []
      for (const px of xs) for (const py of ys) out.push([...ctx.getImageData(px, py, 1, 1).data].slice(0, 3))
      return out
    })
  }, { b64: png.toString('base64'), boxes: info.map((t) => t.box) })
  let worst = null
  info.forEach((t, i) => {
    const freq = new Map()
    for (const p of pixels[i]) { const key = p.join(','); freq.set(key, (freq.get(key) ?? 0) + 1) }
    const bg = [...freq].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number)
    const k = ratio(t.fg, bg)
    if (!worst || k < worst.k) worst = { k, t, bg }
  })
  const ok = worst.k >= 4.5
  if (!ok) bad++
  console.log(`${name.padEnd(30)} ${worst.k.toFixed(1).padStart(5)}:1 ${ok ? '✓' : '✗'}  худший: «${worst.t.s}» ${hex(worst.t.fg)} на ${hex(worst.bg)}`)
}
await browser.close()
process.exit(bad ? 1 : 0)
