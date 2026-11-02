// Рендер диаграмм проекта.
//   node render.mjs                 — все файлы из diagrams/src
//   node render.mjs 03-er.dot ...   — только указанные
// .dot рендерит Graphviz (WASM, @viz-js/viz); движок берётся из первой строки вида `// engine: neato`.
// .bpmn рендерит bpmn-js в Chromium. Результат: diagrams/<имя>.svg и diagrams/<имя>.png (2x).
import { instance } from '@viz-js/viz'
import { chromium } from 'playwright'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const srcDir = path.join(root, 'diagrams', 'src')
const outDir = path.join(root, 'diagrams')

const args = process.argv.slice(2)
const files = args.length
  ? args.map((f) => path.basename(f))
  : (await fs.readdir(srcDir)).filter((f) => /\.(dot|bpmn)$/.test(f)).sort()

// Браузер: CHROME_PATH, иначе свой браузер Playwright, иначе любой headless shell из кеша Playwright.
async function launchBrowser() {
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH })
  try {
    return await chromium.launch()
  } catch (error) {
    const cache = path.join(process.env.HOME ?? '', '.cache', 'ms-playwright')
    const shells = (await fs.readdir(cache).catch(() => []))
      .filter((d) => d.startsWith('chromium_headless_shell-'))
      .sort()
      .reverse()
    for (const dir of shells) {
      const exe = path.join(cache, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell')
      if (await fs.access(exe).then(() => true, () => false)) {
        return chromium.launch({ executablePath: exe })
      }
    }
    throw error
  }
}

const viz = await instance()
const browser = await launchBrowser()
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 1000 } })
const viewerJs = require.resolve('bpmn-js/dist/bpmn-viewer.production.min.js')

async function renderDot(source) {
  const engine = source.match(/^\/\/\s*engine:\s*(\w+)/m)?.[1] ?? 'dot'
  const result = viz.render(source, { format: 'svg', engine })
  if (result.status !== 'success') {
    throw new Error(result.errors.map((e) => e.message).join('\n'))
  }
  // Ширину кириллицы WASM-сборка Graphviz не знает и считает по ширине пробела на байт UTF-8:
  // это предупреждение ожидаемо, запас под текст задан полями узлов в исходниках.
  for (const e of result.errors) {
    if (!/non-ASCII character/.test(e.message)) console.warn(`  ${e.level}: ${e.message}`)
  }
  return result.output
}

async function renderBpmn(xml) {
  await page.setContent('<!doctype html><html><body style="margin:0"><div id="c" style="width:3000px;height:2000px"></div></body></html>')
  await page.addScriptTag({ path: viewerJs })
  const { svg, warnings } = await page.evaluate(async (xml) => {
    // eslint-disable-next-line no-undef
    // Шрифт крупнее стандартных 12 px, чтобы схема читалась при печати на A3.
    const viewer = new BpmnJS({
      container: '#c',
      textRenderer: { defaultStyle: { fontSize: 17 }, externalStyle: { fontSize: 16 } },
    })
    const { warnings } = await viewer.importXML(xml)
    const { svg } = await viewer.saveSVG()
    return { svg, warnings: warnings.map((w) => w.message) }
  }, xml)
  for (const w of warnings) console.warn(`  bpmn-js: ${w}`)
  return svg
}

async function toPng(svg, pngPath) {
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#fff;display:inline-block">${svg}</body></html>`,
  )
  const el = await page.$('svg')
  await el.screenshot({ path: pngPath, omitBackground: false })
}

for (const file of files) {
  const name = file.replace(/\.(dot|bpmn)$/, '')
  const source = await fs.readFile(path.join(srcDir, file), 'utf8')
  process.stdout.write(`${file} → ${name}.svg, ${name}.png\n`)
  const svg = file.endsWith('.dot') ? await renderDot(source) : await renderBpmn(source)
  await fs.writeFile(path.join(outDir, `${name}.svg`), svg)
  await toPng(svg, path.join(outDir, `${name}.png`))
}

await browser.close()
