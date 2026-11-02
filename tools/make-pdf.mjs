import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { marked } from 'marked'

const root = path.resolve(import.meta.dirname, '..')
const docs = path.join(root, 'docs')
const svgDir = path.join(root, 'diagrams', 'svg')
const outFull = path.join(root, 'schemix-full.pdf')
const outAlbum = path.join(root, 'schemix-diagrams.pdf')
const MM = 72 / 25.4

const SECTIONS = [
  { md: '01-predmetnaya-oblast.md' },
  { md: '02-er-kommentarii.md', figs: [['02-1-er-chen', 'ER-диаграмма schemix в нотации Чена (концептуальная модель данных)'], ['02-2-er', 'ER-диаграмма schemix в нотации «воронья лапка» (логическая модель базы данных PostgreSQL)']] },
  { md: '03-model-funkcionirovaniya.md', figs: [['03-1-context', 'Контекстная диаграмма schemix (DFD уровня 0, нотация Гейна–Сарсона)'], ['03-2-dfd', 'Диаграмма потоков данных schemix (DFD уровня 1, нотация Гейна–Сарсона)']] },
  { md: '04-processy.md', figs: [['04-1-bpmn-build-from-text', 'Процесс «Построение схемы по описанию процесса» (BPMN 2.0)'], ['04-2-bpmn-manual-edit', 'Процесс «Ручная правка схемы» (BPMN 2.0)'], ['04-3-bpmn-import-export', 'Процесс «Импорт и выгрузка BPMN-файла» (BPMN 2.0)']] },
  { md: '05-arhitektura.md', figs: [['05-1-c4-context', 'Архитектура schemix: контекст системы (C4, уровень 1)'], ['05-2-c4-containers', 'Архитектура schemix: контейнеры (C4, уровень 2)']] },
  { md: '06-tehproekt.md', figs: [['06-c4-components', 'Технический проект ПО: компоненты контейнера «API-приложение и worker агента» (C4, уровень 3)']] },
  { md: '07-trebovaniya-k-komponentu.md', figs: [['07-1-uml-use-cases', 'UML-диаграмма вариантов использования schemix'], ['07-2-uml-components', 'UML-диаграмма компонентов агента: предоставляемые и требуемые интерфейсы']] },
  { md: '08-ocenka-kachestva.md' },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const TEXT_CSS = `
  @page { size: 210mm 297mm; margin: 20mm 15mm 20mm 30mm }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact }
  body { margin: 0; font: 14pt/1.5 'Times New Roman', 'Liberation Serif', serif; color: #000; text-align: justify; hyphens: auto }
  h1 { font-size: 14pt; font-weight: 700; margin: 0 0 12pt; text-indent: 1.25cm; text-align: left }
  h2 { font-size: 14pt; font-weight: 700; margin: 12pt 0 6pt; text-indent: 1.25cm; text-align: left; break-after: avoid }
  p { margin: 0; text-indent: 1.25cm }
  ul, ol { margin: 0; padding-left: 0 }
  li { margin: 0; list-style: none; text-indent: 1.25cm; text-align: left }
  ul > li::before { content: '–'; display: inline-block; width: 0.6cm; text-indent: 0 }
  ol { counter-reset: n }
  ol > li { counter-increment: n }
  ol > li::before { content: counter(n) ')'; display: inline-block; width: 0.8cm; text-indent: 0 }
  li li { text-indent: 2cm }
  code { font-family: 'Courier New', monospace; font-size: 12pt }
  p.tcap { text-indent: 0; margin-top: 8pt; text-align: left; break-after: avoid }
  table { width: 100%; border-collapse: collapse; font-size: 11pt; line-height: 1.2; text-align: left; margin: 2pt 0 10pt; hyphens: manual }
  th, td { border: 0.5pt solid #000; padding: 2pt 4pt; vertical-align: top }
  th { font-weight: 700; text-align: center }
  td code { font-size: 9.5pt }
  tr { break-inside: avoid }
`

const FIG_CSS = `
  @page { size: 420mm 297mm; margin: 0 }
  html, body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact }
  .page { position: relative; width: 420mm; height: 297mm; overflow: hidden }
  .fig { position: absolute; left: 25mm; right: 12mm; top: 12mm; bottom: 32mm; display: flex; align-items: center; justify-content: center }
  .fig svg { max-width: 100%; max-height: 100%; width: 100%; height: 100% }
  .cap { position: absolute; left: 25mm; right: 12mm; bottom: 18mm; text-align: center; font: 14pt 'Times New Roman', 'Liberation Serif', serif }
`

function sectionHtml(file) {
  let body = marked.parse(fs.readFileSync(path.join(docs, file), 'utf8'))
  body = body.replace(/<code>([^<]*)<\/code>/g, (m, c) => `<code>${c.replaceAll('/', '/<wbr>')}</code>`)
  let n = 0
  body = body.replace(/<table>/g, () => `<p class="tcap">Таблица ${++tableNo} — ${tableTitle(file, ++n)}</p><table>`)
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${TEXT_CSS}</style></head><body>${body}</body></html>`
}

const TABLE_TITLES = {
  '07-trebovaniya-k-komponentu.md': ['Функциональные требования к компоненту «Агент»', 'Интерфейсы компонента «Агент»', 'Ограничения ресурсов компонента «Агент»'],
  '08-ocenka-kachestva.md': ['Оценка качества schemix по характеристикам ГОСТ Р ИСО/МЭК 25010-2015'],
}
const tableTitle = (file, i) => TABLE_TITLES[file]?.[i - 1] ?? 'Таблица'
let tableNo = 0

function figureHtml(base, n, caption) {
  const svg = fs.readFileSync(path.join(svgDir, `${base}.svg`), 'utf8')
  const inner = svg.slice(svg.indexOf('<svg'))
    .replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1')
    .replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${FIG_CSS}</style></head><body><div class="page"><div class="fig">${inner}</div><div class="cap">Рисунок ${n} — ${esc(caption)}</div></div></body></html>`
}

function titleHtml() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page { size: 210mm 297mm; margin: 20mm 15mm 20mm 30mm }
    body { margin: 0; font: 14pt/1.5 'Times New Roman', 'Liberation Serif', serif; color: #000; text-align: center }
    .wrap { height: 257mm; display: flex; flex-direction: column; justify-content: space-between }
    h1 { font-size: 16pt; margin: 0 0 12pt; text-transform: uppercase }
  </style></head><body><div class="wrap">
    <div>Команда GoatWhistle</div>
    <div><h1>ИИ-ассистент построения BPMN-схем schemix</h1>
      <div>Материалы ИТ-проекта</div>
      <div style="margin-top:18pt">Описание предметной области, модель данных, модель функционирования,<br>процессная модель, архитектура, технический проект ПО,<br>требования к программному компоненту, оценка качества</div></div>
    <div>2026</div>
  </div></body></html>`
}

function contentsHtml(entries) {
  const rows = entries.map(([t, p]) => `<div class="row"><span class="t">${esc(t)}</span><span class="dots"></span><span>${p}</span></div>`).join('')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page { size: 210mm 297mm; margin: 20mm 15mm 20mm 30mm }
    body { margin: 0; font: 14pt/1.5 'Times New Roman', 'Liberation Serif', serif; color: #000 }
    h1 { font-size: 14pt; text-align: center; margin: 0 0 12pt }
    .row { display: flex; align-items: baseline; gap: 4pt }
    .dots { flex: 1; border-bottom: 1pt dotted #000; transform: translateY(-4pt) }
  </style></head><body><h1>СОДЕРЖАНИЕ</h1>${rows}</body></html>`
}

function albumCoverHtml(entries) {
  const rows = entries.map(([t, p]) => `<div class="row"><span class="t">${esc(t)}</span><span class="dots"></span><span>${p}</span></div>`).join('')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
    @page { size: 420mm 297mm; margin: 20mm 20mm 20mm 25mm }
    body { margin: 0; font: 14pt/1.6 'Times New Roman', 'Liberation Serif', serif; color: #000 }
    .head { text-align: center; margin-bottom: 14mm }
    h1 { font-size: 18pt; margin: 6mm 0 4pt; text-transform: uppercase }
    .list { width: 300mm; margin: 0 auto }
    .row { display: flex; align-items: baseline; gap: 4pt }
    .dots { flex: 1; border-bottom: 1pt dotted #000; transform: translateY(-4pt); min-width: 10mm }
  </style></head><body>
    <div class="head"><div>Команда GoatWhistle</div><h1>schemix — альбом диаграмм</h1><div>ИИ-ассистент построения BPMN-схем · 2026</div></div>
    <div class="list"><div style="text-align:center;font-weight:700;margin-bottom:6pt">ПЕРЕЧЕНЬ РИСУНКОВ</div>${rows}</div>
  </body></html>`
}

const browser = await chromium.launch()
const page = await browser.newPage()
const render = async (html) => {
  await page.setContent(html, { waitUntil: 'load' })
  return PDFDocument.load(await page.pdf({ preferCSSPageSize: true, printBackground: true }))
}

const parts = []
const figures = []
for (const s of SECTIONS) {
  const title = fs.readFileSync(path.join(docs, s.md), 'utf8').match(/^# (.+)$/m)[1]
  parts.push({ title, doc: await render(sectionHtml(s.md)) })
  for (const [base, caption] of s.figs ?? []) {
    const doc = await render(figureHtml(base, figures.length + 1, caption))
    figures.push({ caption, doc })
    parts.push({ doc })
  }
}

const entries = []
let pageNo = 3
for (const p of parts) {
  if (p.title) entries.push([p.title, pageNo])
  pageNo += p.doc.getPageCount()
}
const fullFront = [await render(titleHtml()), await render(contentsHtml(entries))]
const albumFront = [await render(albumCoverHtml(figures.map((f, i) => [`Рисунок ${i + 1} — ${f.caption}`, i + 2])))]
await browser.close()

async function assemble(file, title, docsList) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(title)
  pdf.setLanguage('ru-RU')
  for (const d of docsList) {
    for (const pg of await pdf.copyPages(d, d.getPageIndices())) pdf.addPage(pg)
  }
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  pdf.getPages().forEach((pg, i) => {
    if (i === 0) return
    const text = String(i + 1)
    const w = font.widthOfTextAtSize(text, 12)
    pg.drawText(text, { x: pg.getWidth() / 2 - w / 2, y: 9 * MM, size: 12, font, color: rgb(0, 0, 0) })
  })
  fs.writeFileSync(file, await pdf.save())
  console.log(`${path.relative(root, file)}: ${pdf.getPageCount()} страниц`)
}

await assemble(outFull, 'schemix — материалы ИТ-проекта', [...fullFront, ...parts.map((p) => p.doc)])
await assemble(outAlbum, 'schemix — альбом диаграмм', [...albumFront, ...figures.map((f) => f.doc)])
console.log(`рисунков ${figures.length}, таблиц ${tableNo}`)
