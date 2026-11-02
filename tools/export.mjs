import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const src = path.join(root, 'diagrams', 'src')
const svgDir = path.join(root, 'diagrams', 'svg')
const pngDir = path.join(root, 'diagrams', 'png')
fs.mkdirSync(svgDir, { recursive: true })
fs.mkdirSync(pngDir, { recursive: true })

const drawio = process.env.DRAWIO
  ?? (process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA, 'Programs', 'draw.io', 'draw.io.exe') : 'drawio')
const only = process.argv.slice(2)
const files = fs.readdirSync(src).filter((f) => /\.(drawio|bpmn)$/.test(f)).filter((f) => !only.length || only.some((o) => f.includes(o))).sort()

for (const f of files.filter((x) => x.endsWith('.drawio'))) {
  const base = f.replace(/\.drawio$/, '')
  const input = path.join(src, f)
  execFileSync(drawio, ['-x', '-f', 'svg', '-b', '24', '-o', path.join(svgDir, `${base}.svg`), input], { stdio: 'pipe' })
  execFileSync(drawio, ['-x', '-f', 'png', '-s', '2', '-b', '24', '-o', path.join(pngDir, `${base}.png`), input], { stdio: 'pipe' })
  console.log(`${f} → svg, png`)
}

const bpmnFiles = files.filter((x) => x.endsWith('.bpmn'))
if (bpmnFiles.length) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent('<html><body style="margin:0"><div id="c" style="width:4000px;height:3000px"></div></body></html>')
  await page.addScriptTag({ path: require.resolve('bpmn-js/dist/bpmn-viewer.production.min.js') })
  for (const f of bpmnFiles) {
    const base = f.replace(/\.bpmn$/, '')
    const xml = fs.readFileSync(path.join(src, f), 'utf8')
    const { svg, warnings } = await page.evaluate(async (x) => {
      document.getElementById('c').innerHTML = ''
      const viewer = new BpmnJS({
        container: '#c',
        textRenderer: {
          defaultStyle: { fontFamily: 'Arial, sans-serif', fontSize: 14, lineHeight: 1.2 },
          externalStyle: { fontFamily: 'Arial, sans-serif', fontSize: 13, lineHeight: 1.2 },
        },
      })
      const result = await viewer.importXML(x)
      const out = await viewer.saveSVG()
      viewer.destroy()
      return { svg: out.svg, warnings: result.warnings.map((w) => w.message) }
    }, xml)
    if (warnings.length) console.warn(`${f}: ${warnings.join('; ')}`)
    fs.writeFileSync(path.join(svgDir, `${base}.svg`), svg)
    const shot = await browser.newPage({ deviceScaleFactor: 2 })
    await shot.setContent(`<html><body style="margin:0;background:#fff"><div id="s" style="display:inline-block;padding:24px;background:#fff">${svg}</div></body></html>`)
    await shot.locator('#s').screenshot({ path: path.join(pngDir, `${base}.png`) })
    await shot.close()
    console.log(`${f} → svg, png`)
  }
  await browser.close()
}
