// Рендер диаграмм проекта.
//   node render.mjs                     — все исходники из diagrams/src
//   node render.mjs 03-er 04-dfd ...    — только указанные
// .mjs — описание диаграммы на JS (tools/lib): узлы с измеренным текстом, разводка линий libavoid.
// .bpmn — BPMN 2.0, рисует bpmn-js в Chromium в общем стиле (tools/lib/bpmn-style.mjs).
// Результат: diagrams/svg/<имя>.svg (векторный, шрифты встроены) и diagrams/png/<имя>.png (2×).
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchBrowser } from './lib/browser.mjs'
import { renderBpmn, bpmnLegend } from './lib/bpmn-style.mjs'
import { layoutBpmn } from './lib/bpmn-layout.mjs'

const root = path.resolve(import.meta.dirname, '..')
const srcDir = path.join(root, 'diagrams', 'src')
const svgDir = path.join(root, 'diagrams', 'svg')
const pngDir = path.join(root, 'diagrams', 'png')
await fs.mkdir(svgDir, { recursive: true })
await fs.mkdir(pngDir, { recursive: true })

const all = (await fs.readdir(srcDir)).filter((f) => /\.(mjs|bpmn)$/.test(f) && !f.endsWith('.layout.mjs')).sort()
const args = process.argv.slice(2).map((a) => path.basename(a).replace(/\.(mjs|bpmn|svg|png)$/, ''))
const files = args.length ? all.filter((f) => args.includes(f.replace(/\.(mjs|bpmn)$/, ''))) : all

const browser = await launchBrowser()
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 1000 } })

async function toPng(svg, pngPath) {
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff;display:inline-block">${svg}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  const el = await page.$('svg')
  await el.screenshot({ path: pngPath, omitBackground: false })
}

for (const file of files) {
  const name = file.replace(/\.(mjs|bpmn)$/, '')
  const t0 = Date.now()
  let svg
  if (file.endsWith('.mjs')) {
    svg = await (await import(pathToFileURL(path.join(srcDir, file)).href)).default()
  } else {
    // BPMN: если рядом есть <имя>.layout.mjs — сначала пересобрать DI (раскладку) в самом .bpmn
    const src = path.join(srcDir, file)
    let xml = await fs.readFile(src, 'utf8')
    const layoutFile = path.join(srcDir, `${name}.layout.mjs`)
    const spec = await fs.access(layoutFile).then(() => import(pathToFileURL(layoutFile).href).then((m) => m.default), () => null)
    if (spec) {
      const laid = await layoutBpmn(xml, spec.layout)
      if (laid !== xml) { await fs.writeFile(src, laid); xml = laid; console.log(`  ${file}: раскладка DI обновлена`) }
    }
    const hues = [...new Set(Object.values(spec?.laneHue ?? {}))]
    svg = await renderBpmn(page, xml, { ...spec, legend: bpmnLegend(hues, { message: xml.includes('<bpmn:messageFlow') }) })
  }
  await fs.writeFile(path.join(svgDir, `${name}.svg`), svg)
  await toPng(svg, path.join(pngDir, `${name}.png`))
  console.log(`${file} → svg/${name}.svg, png/${name}.png  (${Date.now() - t0} мс)`)
}

await browser.close()
