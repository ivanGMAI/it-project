// Альбом диаграмм одним PDF: diagrams/schemix-diagrams.pdf.
//   node make-pdf.mjs        (сначала node render.mjs — PDF собирается из diagrams/svg/*.svg)
// Все листы — A3 альбомный: обложка с миниатюрами, предметная область и порядок показа,
// рисунки по одному на лист (графика векторная), после ER — комментарии к связям.
// Подписи по ГОСТ 7.32-2017, п. 6.5.7: по центру под рисунком, «Рисунок N — Наименование», без
// точки; номер страницы — внизу по центру (п. 6.3.1).
import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs/promises'
import path from 'node:path'
import { launchBrowser } from './lib/browser.mjs'

const root = path.resolve(import.meta.dirname, '..')
const svgDir = path.join(root, 'diagrams', 'svg')
const out = path.join(root, 'diagrams', 'schemix-diagrams.pdf')
const fontsDir = path.join(import.meta.dirname, 'fonts')

const W = 420; const H = 297 // A3 альбомный, мм
const M = { top: 13, right: 12, bottom: 12, left: 25 } // левое поле шире — под подшивку
const CAPTION = 15 // мм под подпись
const HEAD = 8 // мм под колонтитул
const PX_MM = 25.4 / 96
const CAP = 0.727 // высота прописной Inter в долях кегля

// [файл, подпись по ГОСТ, раздел (колонтитул), нотация, короткое название для обложки]
const FIGURES = [
  ['01-context', 'Контекстная диаграмма schemix (DFD уровня 0, нотация Гейна–Сарсона)', 'Контекст', 'DFD уровня 0 · Гейн–Сарсон', 'Контекстная диаграмма'],
  ['02-er-chen', 'ER-диаграмма schemix в нотации Чена', 'Модель данных', 'ER · нотация Чена', 'Концептуальная модель данных'],
  ['03-er', 'ER-диаграмма schemix: логическая модель базы данных PostgreSQL', 'Модель данных', 'ER · «воронья лапка» (IE)', 'Логическая модель PostgreSQL'],
  ['04-dfd', 'Диаграмма потоков данных schemix (DFD уровня 1, нотация Гейна–Сарсона)', 'Потоки данных', 'DFD уровня 1 · Гейн–Сарсон', 'Диаграмма потоков данных'],
  ['05-bpmn-1-build-from-text', 'Процесс «Построение схемы по описанию процесса» (BPMN 2.0)', 'Процессы', 'BPMN 2.0', 'Построение схемы по описанию'],
  ['05-bpmn-2-manual-edit', 'Процесс «Ручная правка схемы и сохранение ревизии» (BPMN 2.0)', 'Процессы', 'BPMN 2.0', 'Ручная правка и сохранение ревизии'],
  ['05-bpmn-3-import-export', 'Процесс «Импорт и выгрузка BPMN-файла» (BPMN 2.0)', 'Процессы', 'BPMN 2.0', 'Импорт и выгрузка BPMN-файла'],
  ['06-c4-1-context', 'Архитектура schemix: контекст системы (C4, уровень 1)', 'Архитектура', 'C4 · уровень 1', 'Контекст системы'],
  ['06-c4-2-containers', 'Архитектура schemix: контейнеры (C4, уровень 2)', 'Архитектура', 'C4 · уровень 2', 'Контейнеры'],
  ['06-c4-3-components', 'Архитектура schemix: компоненты бэкенда (C4, уровень 3)', 'Архитектура', 'C4 · уровень 3', 'Компоненты бэкенда'],
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const face = async (family, w, file) =>
  `@font-face{font-family:'${family}';font-weight:${w};src:url(data:font/woff2;base64,${(await fs.readFile(path.join(fontsDir, file))).toString('base64')}) format('woff2')}`
const fontFaces = (await Promise.all([
  ...[400, 500, 600, 700].map((w) => face('Inter', w, `Inter-${w}.woff2`)),
  face('JetBrains Mono', 400, 'JetBrainsMono-400.woff2'),
  face('JetBrains Mono', 700, 'JetBrainsMono-700.woff2'),
])).join('\n')

const BASE_CSS = `${fontFaces}
  @page { size: ${W}mm ${H}mm; margin: 0 }
  * { box-sizing: border-box }
  html, body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact }
  body { font-family: Inter, Arial, sans-serif; color: #0f172a }
  .page { position: relative; width: ${W}mm; height: ${H}mm; overflow: hidden }
  .num { position: absolute; left: 0; right: 0; bottom: 5mm; text-align: center;
         font: 12pt 'Times New Roman', 'Liberation Serif', serif; color: #0f172a }
  .run { position: absolute; left: ${M.left}mm; right: ${M.right}mm; top: ${M.top - 6}mm; display: flex;
         justify-content: space-between; font-size: 9.5pt; color: #64748b;
         border-bottom: .25mm solid #e2e8f0; padding-bottom: 1.6mm }
  .run b { color: #1d4ed8; font-weight: 600 }`

// Высота прописной буквы самого мелкого текста рисунка на листе, мм.
function smallestCap(svg, [aw, ah]) {
  const w = +svg.match(/<svg[^>]*\bwidth="([\d.]+)"/)[1]; const h = +svg.match(/<svg[^>]*\bheight="([\d.]+)"/)[1]
  const sizes = [...svg.matchAll(/font-size(?:="|:\s*)([\d.]+)/g)].map((m) => +m[1])
  const scale = Math.min(aw / (w * PX_MM), ah / (h * PX_MM))
  return Math.min(...sizes) * PX_MM * scale * CAP
}

function figurePage(svg, { n, caption, section, page }) {
  const body = svg.slice(svg.indexOf('<svg'))
    .replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1')
  return `<div class="page">
    <div class="run"><span><b>schemix</b> · альбом диаграмм ИТ-проекта</span><span>${esc(section)}</span></div>
    <div style="position:absolute;left:${M.left}mm;right:${M.right}mm;top:${M.top + HEAD - 6}mm;bottom:${M.bottom + CAPTION}mm;display:flex;align-items:center;justify-content:center">
      <div style="width:100%;height:100%">${body.replace('<svg', '<svg style="width:100%;height:100%"')}</div>
    </div>
    <div style="position:absolute;left:${M.left}mm;right:${M.right}mm;bottom:${M.bottom}mm;height:${CAPTION}mm;display:flex;align-items:center;justify-content:center;font:14pt 'Times New Roman','Liberation Serif',serif">Рисунок ${n} — ${esc(caption)}</div>
    <div class="num">${page}</div>
  </div>`
}

function cover(cards) {
  const thumbs = cards.map(([n, , short, tag, page, img, section]) => `
    <div class="card">
      <div class="th"><img src="${img}"></div>
      <div class="meta">
        <div class="row"><span class="n">${n}</span><span class="sec">${esc(section)}</span><span class="p">с. ${page}</span></div>
        <div class="t">${esc(short)}</div>
        <div class="tag">${esc(tag)}</div>
      </div>
    </div>`).join('')
  return `<div class="page cover">
    <style>
      .cover { display: grid; grid-template-columns: 122mm 1fr; grid-template-rows: ${H}mm }
      .cover .side { background: linear-gradient(165deg, #0b2447 0%, #12376b 60%, #1d4ed8 150%); color: #fff; padding: 26mm 14mm 18mm 25mm;
                     display: flex; flex-direction: column }
      .cover .kicker { font-size: 10.5pt; letter-spacing: .12em; text-transform: uppercase; color: #93c5fd; font-weight: 600 }
      .cover h1 { font-size: 60pt; line-height: 1; margin: 9mm 0 6mm; font-weight: 700; letter-spacing: -.02em }
      .cover .lead { font-size: 16pt; line-height: 1.34; hyphens: none; color: #dbeafe; font-weight: 500 }
      .cover .what { margin-top: 12mm; font-size: 12pt; line-height: 1.55; color: #bfdbfe }
      .cover .what b { color: #fff; font-weight: 600 }
      .cover .chips { margin-top: 10mm; display: flex; flex-wrap: wrap; gap: 2.4mm }
      .cover .chip { font-size: 9.5pt; padding: 1.4mm 3.2mm; border-radius: 10mm; background: rgba(255,255,255,.12); color: #e0ecff; border: .3mm solid rgba(255,255,255,.22) }
      .cover .foot { margin-top: auto; font-size: 10.5pt; color: #93c5fd; line-height: 1.6 }
      .cover .main { padding: 17mm 13mm 12mm 13mm; display: flex; flex-direction: column }
      .cover .main h2 { margin: 0 0 5mm; font-size: 15pt; font-weight: 700; color: #0f172a; display: flex; align-items: baseline; gap: 4mm }
      .cover .main h2 span { font-size: 10pt; font-weight: 500; color: #64748b }
      .cover .grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(5, minmax(0, 1fr)); grid-auto-flow: column; gap: 4mm 6mm; min-height: 0 }
      .cover .card { border: .3mm solid #e2e8f0; border-radius: 3mm; overflow: hidden; display: grid; grid-template-columns: 74mm 1fr; background: #fff; min-height: 0; height: 100% }
      .cover .th { background: #f8fafc; border-right: .3mm solid #e2e8f0; padding: 2.4mm; min-height: 0; overflow: hidden }
      .cover .th img { width: 100%; height: 100%; object-fit: contain; display: block }
      .cover .meta { padding: 3.2mm 4mm; display: flex; flex-direction: column; gap: 1.4mm; min-width: 0 }
      .cover .row { display: flex; align-items: center; gap: 2.4mm }
      .cover .n { width: 6.6mm; height: 6.6mm; border-radius: 50%; background: #1d4ed8; color: #fff; font-size: 9.5pt; font-weight: 700;
                  display: flex; align-items: center; justify-content: center; flex: none }
      .cover .sec { font-size: 8.6pt; letter-spacing: .08em; text-transform: uppercase; color: #1d4ed8; font-weight: 600 }
      .cover .p { margin-left: auto; font-size: 9pt; color: #64748b }
      .cover .t { font-size: 11pt; font-weight: 600; color: #0f172a; line-height: 1.28 }
      .cover .tag { font-size: 9pt; color: #64748b; margin-top: auto }
    </style>
    <div class="side">
      <div class="kicker">ИТ-проект · альбом диаграмм</div>
      <h1>schemix</h1>
      <div class="lead">ИИ-ассистент, который превращает текстовое описание бизнес-процесса в схему BPMN 2.0</div>
      <div class="what">
        <b>Команда GoatWhistle</b><br>
        Хакатон Интер РАО «ИИ-ассистенты для энергетики», 2026
      </div>
      <div class="chips">
        <span class="chip">DFD · Гейн–Сарсон</span><span class="chip">ER · Чен</span><span class="chip">ER · «воронья лапка»</span>
        <span class="chip">BPMN 2.0</span><span class="chip">C4</span>
      </div>
      <div class="foot">Десять рисунков от общего к частному:<br>контекст → данные → потоки → процессы → архитектура</div>
    </div>
    <div class="main">
      <h2>Перечень рисунков <span>все листы — A3 альбомный, графика векторная</span></h2>
      <div class="grid">${thumbs}</div>
    </div>
  </div>`
}

const TEXT_CSS = `
  .tp { padding: ${M.top + 6}mm ${M.right + 6}mm ${M.bottom + 14}mm ${M.left + 4}mm }
  .tp .kicker { font-size: 10pt; letter-spacing: .14em; text-transform: uppercase; color: #1d4ed8; font-weight: 600 }
  .tp h1 { font-size: 34pt; margin: 3mm 0 10mm; letter-spacing: -.01em; font-weight: 700 }
  .tp h2 { font-size: 15pt; margin: 0 0 4mm; font-weight: 700 }
  .tp p, .tp li { font-size: 14pt; line-height: 1.6; color: #1e293b }
  .tp p { margin: 0 0 4mm }
  .tp .lead { font-size: 19pt; line-height: 1.45; color: #0f172a; font-weight: 600; margin-bottom: 7mm }
  .tp .cols { display: grid; gap: 14mm }
  .tp code { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12pt; background: #f1f5f9; padding: .3mm 1.4mm; border-radius: 1mm; color: #0f172a }
  .tp ol.steps { list-style: none; padding: 0; margin: 0; counter-reset: s }
  .tp ol.steps li { counter-increment: s; position: relative; padding: 0 0 3.2mm 12mm }
  .tp ol.steps li::before { content: counter(s); position: absolute; left: 0; top: .8mm; width: 8mm; height: 8mm; border-radius: 50%;
                            background: #dbeafe; color: #1d4ed8; font-weight: 700; font-size: 10.5pt; display: flex; align-items: center; justify-content: center }
  .tp ol.steps li span { color: #64748b }
  .tp .card { border: .3mm solid #e2e8f0; border-radius: 3mm; padding: 5mm 6mm; background: #f8fafc }
  .tp ul.notes { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 14mm }
  .tp ul.notes li { break-inside: avoid; padding: 0 0 4.2mm 6mm; position: relative }
  .tp ul.notes li::before { content: ''; position: absolute; left: 0; top: 2.6mm; width: 2.2mm; height: 2.2mm; border-radius: 50%; background: #c2410c }
  .tp ul.notes b { color: #0f172a }
  .tp table.nt { width: 100%; border-collapse: collapse; margin-top: 2mm }
  .tp table.nt th { text-align: left; font-size: 10pt; letter-spacing: .08em; text-transform: uppercase; color: #64748b; font-weight: 600;
                    padding: 0 4mm 2.4mm 0; border-bottom: .4mm solid #cbd5e1 }
  .tp table.nt td { font-size: 12.5pt; padding: 2.6mm 4mm 2.6mm 0; border-bottom: .25mm solid #e2e8f0; vertical-align: top; color: #1e293b }
  .tp table.nt td:first-child { font-weight: 600; color: #0f172a; white-space: nowrap }
  .tp .dot { display: inline-block; width: 3mm; height: 3mm; border-radius: 1mm; margin-right: 2.4mm; vertical-align: -.2mm }`

function introPage(page) {
  return `<div class="page tp"><style>${TEXT_CSS}</style>
    <div class="run"><span><b>schemix</b> · альбом диаграмм ИТ-проекта</span><span>Предметная область</span></div>
    <div class="kicker">С чего начать</div>
    <h1>Предметная область</h1>
    <div class="cols" style="grid-template-columns: 1.25fr 1fr">
      <div>
        <p class="lead">Регламенты в энергокомпании пишут текстом, а BPMN-схемы рисуют вручную, и схема устаревает при первой правке регламента.</p>
        <p>schemix принимает описание процесса — текст, файл <code>.docx</code> или <code>.pdf</code>, голос. Агент из семи ролей языковой модели извлекает
          участников, шаги, условия и связи, а код собирает из этих фактов BPMN 2.0, проверяет по XSD OMG и записывает новой ревизией.</p>
        <p>Где факта не хватает, агент задаёт вопрос с вариантами ответа; рискованные изменения ждут подтверждения человека. Ручная правка главнее агента:
          результат агента применяется, только если схема не изменилась, пока модель работала.</p>
        <p>Готовую схему выгружают в BPMN, SVG, Markdown, Word или EPC для Sila Union.</p>
      </div>
      <div class="card">
        <h2>Порядок показа</h2>
        <ol class="steps">
          <li>Предметная область <span>— эта страница</span></li>
          <li>Контекстная диаграмма <span>— рис. 1</span></li>
          <li>ER-диаграмма в нотации Чена <span>— рис. 2</span></li>
          <li>ER-диаграмма базы данных <span>— рис. 3</span> и комментарии к связям</li>
          <li>Диаграмма потоков данных <span>— рис. 4</span></li>
          <li>Три процесса в BPMN 2.0 <span>— рис. 5–7</span></li>
          <li>Архитектура в C4, уровни 1–3 <span>— рис. 8–10</span></li>
        </ol>
        <p style="margin-top:3mm;font-size:12pt;color:#475569">От общего к частному. Контекстная диаграмма и C4 уровня 1 показывают одно и то же разными нотациями:
          если на защите мало времени, C4-1 можно пропустить.</p>
      </div>
    </div>
    <h2 style="margin-top:12mm">Нотации и первоисточники</h2>
    <table class="nt">
      <tr><th>Нотация</th><th>Первоисточник</th><th>Рисунки</th><th>Что показывает</th></tr>
      <tr><td><span class="dot" style="background:#c2410c"></span>DFD, Гейн–Сарсон</td><td>C. Gane, T. Sarson. Structured Systems Analysis, 1979</td><td>1, 4</td><td>какие данные текут между системой, внешним миром и хранилищами</td></tr>
      <tr><td><span class="dot" style="background:#b45309"></span>ER, нотация Чена</td><td>P. Chen. The Entity-Relationship Model, 1976</td><td>2</td><td>сущности предметной области, их атрибуты и связи</td></tr>
      <tr><td><span class="dot" style="background:#1d4ed8"></span>ER, «воронья лапка» (IE)</td><td>Information Engineering: G. Everest, J. Martin</td><td>3</td><td>таблицы PostgreSQL, ключи и кардинальность связей</td></tr>
      <tr><td><span class="dot" style="background:#15803d"></span>BPMN 2.0</td><td>OMG BPMN 2.0.2; ISO/IEC 19510:2013</td><td>5–7</td><td>кто и в каком порядке выполняет шаги процесса</td></tr>
      <tr><td><span class="dot" style="background:#11589e"></span>C4</td><td>S. Brown, c4model.com</td><td>8–10</td><td>архитектура: система, контейнеры, компоненты</td></tr>
    </table>
    <p style="margin-top:5mm;font-size:12pt;color:#475569">ГОСТа на сами нотации нет; ГОСТ 34.201-2020 задаёт состав документов на систему, ГОСТ 7.32-2017 — оформление рисунков.</p>
    <div class="num">${page}</div>
  </div>`
}

function commentsPage(page) {
  const items = [
    ['<code>runs</code> ↔ <code>messages</code> — циклическая ссылка.', 'Сообщение пользователя порождает запрос (<code>runs.user_message_id</code>), а ответы агента ссылаются на запрос (<code>messages.run_id</code>). Оба внешних ключа отложенные (<code>DEFERRABLE INITIALLY DEFERRED</code>): сообщение и запрос создаются одной транзакцией.'],
    ['Два номера ревизии у запроса.', '<code>runs.base_revision</code> — ревизия, от которой агент начал работу; <code>runs.result_revision</code> — ревизия, которую он записал. Если базовая перестала быть текущей, результат не применяется, а запрос получает статус «устарел».'],
    ['Один активный запрос на диаграмму.', 'Частичный уникальный индекс <code>uq_runs_one_active_per_diagram</code> по <code>diagram_id</code> для статусов <code>queued</code>, <code>running</code>, <code>awaiting_input</code>, <code>awaiting_confirmation</code>.'],
    ['Ревизия — слабая сущность.', 'Ключ <code>(diagram_id, revision)</code>; ревизия хранит полный XML с DI и не меняется, возврат к старой версии создаёт новую ревизию с <code>restored_from</code>.'],
    ['<code>revisions.source</code>', '— откуда ревизия: создание, импорт, ручная правка, агент, возврат, диктовка, структура.'],
    ['<code>proposals.preview_id</code>', '— логическая ссылка без ограничения FK в базе (на диаграмме — пунктир).'],
    ['<code>dictation_segments.audio</code>', 'хранится только до распознавания фразы, затем стирается.'],
    ['<code>run_artifacts</code>', '— ответы ролей модели по их JSON-схемам с версией промпта и модели: по ним можно воспроизвести, что именно вернула модель.'],
    ['<code>idempotency_keys</code>', 'не связана с другими таблицами: она защищает от повторной обработки одного и того же запроса по заголовку <code>Idempotency-Key</code>.'],
    ['<code>runs.retry_of</code> — рекурсивная связь.', 'Повторный запрос ссылается на исходный; в ER это петля у <code>runs</code>. На диаграмме Чена её нет, как и атрибута «текущий этап»: у ЗАПРОСА АГЕНТУ и так девять связей.'],
    ['Как читать линии на ER.', 'Связь выходит из шапки или верхней/нижней грани таблицы-родителя (ссылка на её первичный ключ) и входит в строку внешнего ключа таблицы-потомка.'],
  ]
  return `<div class="page tp"><style>${TEXT_CSS}</style>
    <div class="run"><span><b>schemix</b> · альбом диаграмм ИТ-проекта</span><span>Модель данных</span></div>
    <div class="kicker">К рисункам 2 и 3</div>
    <h1>Комментарии к связям и атрибутам</h1>
    <ul class="notes">${items.map(([a, b]) => `<li><p><b>${a}</b> ${b}</p></li>`).join('')}</ul>
    <div class="num">${page}</div>
  </div>`
}

// ---------- сборка ----------
const browser = await launchBrowser()
const page = await browser.newPage()
// PREVIEW=<папка> — ещё и PNG каждого листа (посмотреть вёрстку без просмотрщика PDF)
const preview = process.env.PREVIEW
let shot = 0
if (preview) await fs.mkdir(preview, { recursive: true })
async function toPdf(inner) {
  await page.setContent(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${inner}</body></html>`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  if (preview) {
    await page.setViewportSize({ width: Math.round(W / 25.4 * 96), height: Math.round(H / 25.4 * 96) })
    await page.screenshot({ path: path.join(preview, `page-${String(++shot).padStart(2, '0')}.png`) })
  }
  return page.pdf({ width: `${W}mm`, height: `${H}mm`, printBackground: true, preferCSSPageSize: true })
}

// нумерация: 1 — обложка, 2 — предметная область, затем рисунки; после рисунка 3 — комментарии
const order = []
let p = 3
for (const [i, f] of FIGURES.entries()) {
  order.push({ kind: 'fig', i, f, page: p++ })
  if (f[0] === '03-er') order.push({ kind: 'comments', page: p++ })
}
const svgs = Object.fromEntries(await Promise.all(FIGURES.map(async ([name]) => [name, await fs.readFile(path.join(svgDir, `${name}.svg`), 'utf8')])))
const cards = order.filter((o) => o.kind === 'fig').map((o) => [o.i + 1, o.f[0], o.f[4], o.f[3], o.page,
  `data:image/svg+xml;base64,${Buffer.from(svgs[o.f[0]]).toString('base64')}`, o.f[2]])
const parts = [await toPdf(cover(cards)), await toPdf(introPage(2))]
const area = [W - M.left - M.right, H - M.top - HEAD + 6 - M.bottom - CAPTION]
for (const o of order) {
  if (o.kind === 'comments') { parts.push(await toPdf(commentsPage(o.page))); continue }
  const [name, caption, section] = o.f
  const svg = svgs[name]
  console.log(`стр. ${String(o.page).padStart(2)}  мин. прописная ${smallestCap(svg, area).toFixed(2)} мм  ${name}`)
  parts.push(await toPdf(figurePage(svg, { n: o.i + 1, caption, section, page: o.page })))
}
await browser.close()

const doc = await PDFDocument.create()
doc.setTitle('schemix: альбом диаграмм ИТ-проекта')
doc.setSubject('Контекстная диаграмма, ER (Чен и IE), DFD, BPMN 2.0, C4')
doc.setLanguage('ru-RU')
doc.setCreator('it-project/tools/make-pdf.mjs')
for (const bytes of parts) {
  const src = await PDFDocument.load(bytes)
  for (const pg of await doc.copyPages(src, src.getPageIndices())) doc.addPage(pg)
}
await fs.writeFile(out, await doc.save())
console.log(`→ ${path.relative(root, out)}, страниц: ${doc.getPageCount()}, ${(await fs.stat(out)).size >> 10} КБ`)
