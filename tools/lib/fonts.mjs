// Шрифты диаграмм: Inter (текст) и JetBrains Mono (имена колонок, типы, код).
// Файлы в tools/fonts — подмножество латиницы, кириллицы, пунктуации и стрелок (OFL 1.1).
// Ширину текста считает HarfBuzz по тем же файлам, что встраиваются в SVG, поэтому размеры
// узлов совпадают с отрисовкой в браузере. В каждый SVG встраивается только набор символов,
// который в нём встречается.
import * as hb from 'harfbuzzjs'
import decompress from 'wawoff2/decompress.js'
import subsetFont from 'subset-font'
import fs from 'node:fs/promises'
import path from 'node:path'

const dir = path.join(import.meta.dirname, '..', 'fonts')

export const SANS = 'Inter'
export const MONO = 'JetBrains Mono'
const FILES = {
  [`${SANS}:400`]: 'Inter-400.woff2',
  [`${SANS}:500`]: 'Inter-500.woff2',
  [`${SANS}:600`]: 'Inter-600.woff2',
  [`${SANS}:700`]: 'Inter-700.woff2',
  [`${MONO}:400`]: 'JetBrainsMono-400.woff2',
  [`${MONO}:700`]: 'JetBrainsMono-700.woff2',
}

const faces = {}
for (const [key, file] of Object.entries(FILES)) {
  const woff2 = await fs.readFile(path.join(dir, file))
  const ttf = await decompress(woff2)
  const face = new hb.Face(new hb.Blob(ttf))
  const font = new hb.Font(face)
  faces[key] = { woff2, font, upem: face.upem, cache: new Map() }
}

function faceFor(family, weight) {
  const f = faces[`${family}:${weight}`]
  if (!f) throw new Error(`нет шрифта ${family} ${weight}`)
  return f
}

/** Ширина строки в пикселях для кегля size (с учётом кернинга и разрядки). */
export function textWidth(text, { family = SANS, weight = 400, size = 14, spacing = 0 } = {}) {
  const f = faceFor(family, weight)
  let units = f.cache.get(text)
  if (units === undefined) {
    const buf = new hb.Buffer()
    buf.addText(text)
    buf.guessSegmentProperties()
    hb.shape(f.font, buf)
    units = buf.getGlyphPositions().reduce((s, p) => s + p.xAdvance, 0)
    f.cache.set(text, units)
  }
  return (units / f.upem) * size + spacing * [...text].length
}

/** Высота прописной буквы в долях кегля (для расчёта читаемости при печати). */
export const CAP_HEIGHT = { [SANS]: 0.727, [MONO]: 0.73 }

/** @font-face с подмножеством символов, которые реально встречаются в SVG. */
export async function embeddedFontCss(used) {
  const rules = []
  for (const [key, chars] of used) {
    if (!chars.size) continue
    const [family, weight] = key.split(':')
    const text = [...chars].join('') + ' '
    const sub = await subsetFont(faceFor(family, weight).woff2, text, { targetFormat: 'woff2' })
    rules.push(`@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;` +
      `src:url(data:font/woff2;base64,${Buffer.from(sub).toString('base64')}) format('woff2')}`)
  }
  return rules.join('\n')
}
