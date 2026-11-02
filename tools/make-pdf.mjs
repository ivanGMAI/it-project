// Сборка всех диаграмм в один PDF: diagrams/schemix-diagrams.pdf.
//   node make-pdf.mjs        (сначала node render.mjs — PDF собирается из diagrams/*.svg)
// Каждая диаграмма — векторная (SVG) на своём листе: A4 или A3 альбомный, чтобы прописные буквы
// были не мельче 1,8 мм (ГОСТ 2.304-81). Подпись — по ГОСТ 7.32-2017, п. 6.5.7: по центру
// под рисунком, «Рисунок N — Наименование», без точки. Первая страница — титул с перечнем рисунков.
import { chromium } from 'playwright'
import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dir = path.join(root, 'diagrams')
const out = path.join(dir, 'schemix-diagrams.pdf')

const SHEETS = { A4P: [210, 297, 'A4'], A4L: [297, 210, 'A4 альбомный'], A3L: [420, 297, 'A3 альбомный'] }
const MARGIN = { top: 15, right: 10, bottom: 15, left: 25 } // мм
const CAPTION = 14 // мм под подпись

const FIGURES = [
  ['01-context', 'Контекстная диаграмма schemix (DFD уровня 0, нотация Гейна–Сарсона)', 'A4L'],
  ['02-er-chen', 'ER-диаграмма schemix в нотации Чена', 'A3L'],
  ['03-er', 'ER-диаграмма schemix: логическая модель базы данных PostgreSQL', 'A3L'],
  ['04-dfd', 'Диаграмма потоков данных schemix (DFD уровня 1, нотация Гейна–Сарсона)', 'A3L'],
  ['05-bpmn-1-build-from-text', 'Процесс «Построение схемы по описанию процесса» (BPMN 2.0)', 'A3L'],
  ['05-bpmn-2-manual-edit', 'Процесс «Ручная правка схемы и сохранение ревизии» (BPMN 2.0)', 'A3L'],
  ['05-bpmn-3-import-export', 'Процесс «Импорт и выгрузка BPMN-файла» (BPMN 2.0)', 'A3L'],
  ['06-c4-1-context', 'Архитектура schemix: контекст системы (C4, уровень 1)', 'A4L'],
  ['06-c4-2-containers', 'Архитектура schemix: контейнеры (C4, уровень 2)', 'A4L'],
  ['06-c4-3-components', 'Архитектура schemix: компоненты бэкенда (C4, уровень 3)', 'A3L'],
]

const PT_MM = 25.4 / 72
const PX_MM = 25.4 / 96
const CAP = 0.716 // высота прописной Arial / Liberation Sans в долях кегля

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// Высота прописной буквы самого мелкого текста после вписывания в поле листа, мм.
function smallestCap(svg, [w, h]) {
  const root = svg.match(/<svg[^>]*>/)[0]
  const width = root.match(/\bwidth="([\d.]+)(pt)?"/)
  const height = root.match(/\bheight="([\d.]+)(pt)?"/)
  const unit = width[2] === 'pt' ? PT_MM : PX_MM
  const sizes = [
    ...[...svg.matchAll(/<text[^>]*\bfont-size="([\d.]+)"/g)].map((m) => +m[1]),
    ...[...svg.matchAll(/<text[^>]*font-size:\s*([\d.]+)px/g)].map((m) => +m[1]),
  ]
  const areaW = w - MARGIN.left - MARGIN.right
  const areaH = h - MARGIN.top - MARGIN.bottom - CAPTION
  const scale = Math.min(areaW / (+width[1] * unit), areaH / (+height[1] * unit))
  return Math.min(...sizes) * unit * scale * CAP
}

function figurePage(svg, caption, number, page, [w, h]) {
  // Без width/height SVG растягивается по полю листа с сохранением пропорций (viewBox).
  const body = svg
    .slice(svg.indexOf('<svg'))
    .replace(/<svg([^>]*?)\s(width|height)="[^"]*"/, '<svg$1')
    .replace(/<svg([^>]*?)\s(width|height)="[^"]*"/, '<svg$1')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page { size: ${w}mm ${h}mm; margin: 0 }
    html, body { margin: 0 }
    .page { position: relative; width: ${w}mm; height: ${h}mm; box-sizing: border-box;
            padding: ${MARGIN.top}mm ${MARGIN.right}mm ${MARGIN.bottom}mm ${MARGIN.left}mm;
            display: flex; flex-direction: column }
    .fig { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center }
    .fig svg { width: 100%; height: 100% }
    .cap { height: ${CAPTION}mm; display: flex; align-items: flex-end; justify-content: center;
           font: 14pt 'Times New Roman', 'Liberation Serif', serif; text-align: center }
    .num { position: absolute; right: ${MARGIN.right}mm; bottom: 6mm;
           font: 12pt 'Times New Roman', 'Liberation Serif', serif }
  </style></head><body><div class="page">
    <div class="fig">${body}</div>
    <div class="cap">Рисунок ${number} — ${esc(caption)}</div>
    <div class="num">${page}</div>
  </div></body></html>`
}

function titlePage(rows) {
  const [w, h] = SHEETS.A4P
  const list = rows
    .map(([n, caption, sheet, page]) => `<tr><td class="n">Рисунок ${n}</td><td>${esc(caption)}</td>` +
      `<td class="s">${SHEETS[sheet][2]}</td><td class="p">${page}</td></tr>`)
    .join('')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page { size: ${w}mm ${h}mm; margin: 0 }
    html, body { margin: 0 }
    .page { width: ${w}mm; height: ${h}mm; box-sizing: border-box; padding: 20mm 15mm 20mm 30mm;
            font: 14pt 'Times New Roman', 'Liberation Serif', serif; line-height: 1.35 }
    h1 { font-size: 20pt; text-align: center; margin: 10mm 0 3mm }
    .sub { text-align: center; margin-bottom: 12mm }
    h2 { font-size: 14pt; margin: 8mm 0 3mm }
    table { border-collapse: collapse; width: 100%; font-size: 12pt }
    td { padding: 1.6mm 1.5mm; vertical-align: top; border-bottom: 0.2mm solid #bbb }
    td.n { white-space: nowrap } td.s { white-space: nowrap; color: #333 } td.p { text-align: right }
    p { font-size: 12pt; margin: 2mm 0 }
  </style></head><body><div class="page">
    <h1>schemix: диаграммы ИТ-проекта</h1>
    <div class="sub">ИИ-ассистент построения BPMN-схем по описанию процесса<br>
      хакатон Интер РАО «ИИ-ассистенты для энергетики», 2026</div>
    <h2>Перечень рисунков</h2>
    <table><tr><td class="n"><b>№</b></td><td><b>Наименование</b></td><td class="s"><b>Лист</b></td>
      <td class="p"><b>Стр.</b></td></tr>${list}</table>
    <h2>Печать</h2>
    <p>Страницы A3 печатать на листе A3 без масштабирования: тогда прописные буквы на всех
      рисунках не мельче 1,8 мм (ряд размеров ГОСТ 2.304-81), на листах A4 — не мельче 2 мм.
      Графика векторная: на экране рисунки можно увеличивать без потери чёткости.</p>
    <h2>Нотации</h2>
    <p>Контекстная диаграмма и DFD — Гейн–Сарсон; ER — Чен и «воронья лапка»;
      процессы — BPMN 2.0 (OMG, ISO/IEC 19510); архитектура — C4. ГОСТа на сами нотации нет,
      подписи рисунков оформлены по ГОСТ 7.32-2017.</p>
  </div></body></html>`
}

const browser = await (async () => {
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH })
  try {
    return await chromium.launch()
  } catch (error) {
    const cache = path.join(process.env.HOME ?? '', '.cache', 'ms-playwright')
    const shells = (await fs.readdir(cache).catch(() => [])).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()
    for (const d of shells) {
      const exe = path.join(cache, d, 'chrome-headless-shell-linux64', 'chrome-headless-shell')
      if (await fs.access(exe).then(() => true, () => false)) return chromium.launch({ executablePath: exe })
    }
    throw error
  }
})()
const page = await browser.newPage()

async function toPdf(html, [w, h]) {
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  return page.pdf({ width: `${w}mm`, height: `${h}mm`, printBackground: true, preferCSSPageSize: true })
}

const rows = FIGURES.map(([, caption, sheet], i) => [i + 1, caption, sheet, i + 2])
const parts = [await toPdf(titlePage(rows), SHEETS.A4P)]
for (const [i, [name, caption, sheet]] of FIGURES.entries()) {
  const svg = await fs.readFile(path.join(dir, `${name}.svg`), 'utf8')
  const size = SHEETS[sheet]
  const cap = smallestCap(svg, size)
  console.log(`стр. ${i + 2}  ${SHEETS[sheet][2].padEnd(13)} мин. прописная ${cap.toFixed(2)} мм  ${name}`)
  parts.push(await toPdf(figurePage(svg, caption, i + 1, i + 2, size), size))
}
await browser.close()

const doc = await PDFDocument.create()
doc.setTitle('schemix: диаграммы ИТ-проекта')
doc.setSubject('Контекстная диаграмма, ER (Чен и IE), DFD, BPMN 2.0, C4')
doc.setLanguage('ru-RU')
doc.setCreator('it-project/tools/make-pdf.mjs')
for (const bytes of parts) {
  const src = await PDFDocument.load(bytes)
  for (const p of await doc.copyPages(src, src.getPageIndices())) doc.addPage(p)
}
await fs.writeFile(out, await doc.save())
console.log(`→ ${path.relative(root, out)}, страниц: ${doc.getPageCount()}`)
