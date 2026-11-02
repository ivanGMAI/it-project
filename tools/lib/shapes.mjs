// Фигуры нотаций: Гейн–Сарсон (процесс, хранилище, внешняя сущность), C4 (человек, система,
// контейнер, компонент, база данных, граница) и легенда.
import { block, r, esc, lineHeight } from './kit.mjs'
import { FONT, C, HUE, C4, STROKE, F } from './theme.mjs'

const asLines = (xs, f, color) => xs.map((s) => (typeof s === 'string' ? { s, f, color } : s))

// ---------- Гейн–Сарсон ----------

/** Процесс: скруглённый прямоугольник, сверху полоса с номером. */
export function process({ num, lines, hue = HUE.blue, minW = 190, title }) {
  const body = block([
    title && { s: title, f: FONT.nodeTitleL, color: C.ink },
    ...asLines(lines, title ? FONT.body : FONT.bodyM, C.text),
  ])
  const band = 30
  const w = Math.max(minW, body.w + 36)
  const h = band + body.h + 26
  return {
    w, h,
    draw(d, { x, y, w, h }) {
      return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="14" fill="#ffffff" stroke="${hue.stroke}" stroke-width="${STROKE.node}"/>` +
        `<path d="M${r(x)},${r(y + band)} V${r(y + 14)} a14,14 0 0 1 14,-14 H${r(x + w - 14)} a14,14 0 0 1 14,14 V${r(y + band)} Z" fill="${hue.soft}"/>` +
        `<line x1="${r(x)}" y1="${r(y + band)}" x2="${r(x + w)}" y2="${r(y + band)}" stroke="${hue.stroke}" stroke-width="1.2"/>` +
        `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="14" fill="none" stroke="${hue.stroke}" stroke-width="${STROKE.node}"/>` +
        d.text(x + w / 2, y + band / 2 + 5.5, String(num), FONT.num, { anchor: 'middle', fill: hue.strong }) +
        body.draw(d, x + w / 2, y + band + (h - band - body.h) / 2)
    },
  }
}

/** Хранилище данных: открытый справа прямоугольник с ячейкой номера D1…D5. */
export function store({ id, lines, hue = HUE.teal, minW = 200 }) {
  const body = block(asLines(lines, FONT.bodyM, C.text))
  const idW = 46
  const w = Math.max(minW, idW + body.w + 30)
  const h = Math.max(48, body.h + 20)
  return {
    w, h,
    draw(d, { x, y, w, h }) {
      const s = hue.strong
      return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${hue.fill}"/>` +
        `<rect x="${r(x)}" y="${r(y)}" width="${idW}" height="${r(h)}" fill="${hue.soft}"/>` +
        `<path d="M${r(x + w)},${r(y)} H${r(x)} V${r(y + h)} H${r(x + w)}" fill="none" stroke="${s}" stroke-width="${STROKE.node}"/>` +
        `<line x1="${r(x + idW)}" y1="${r(y)}" x2="${r(x + idW)}" y2="${r(y + h)}" stroke="${s}" stroke-width="1.2"/>` +
        d.text(x + idW / 2, y + h / 2 + 5, id, FONT.num, { anchor: 'middle', fill: s }) +
        body.draw(d, x + idW + (w - idW) / 2, y + (h - body.h) / 2)
    },
  }
}

/** Внешняя сущность: прямоугольник с «тенью» сверху и слева (нотация Гейна–Сарсона). */
export function external({ title, lines = [], hue = HUE.orange, minW = 170, dup = false }) {
  const body = block([
    ...asLines([].concat(title), FONT.nodeTitle, C.ink),
    ...asLines(lines, FONT.small, C.muted),
  ])
  const w = Math.max(minW, body.w + 40)
  const h = body.h + 30
  const o = 6
  return {
    w, h,
    bounds: ({ x, y, w, h }) => ({ x: x - o, y: y - o, w: w + o, h: h + o }),
    draw(d, { x, y, w, h }) {
      return `<path d="M${r(x - o)},${r(y + h - o)} V${r(y - o)} H${r(x + w - o)} L${r(x + w)},${r(y)} H${r(x)} V${r(y + h)} Z" fill="${hue.shade}" stroke="${hue.strong}" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${hue.fill}" stroke="${hue.strong}" stroke-width="${STROKE.node}"/>` +
        body.draw(d, x + w / 2, y + (h - body.h) / 2) +
        // копия внешней сущности (Гейн–Сарсон): косая черта в правом нижнем углу
        (dup ? `<line x1="${r(x + w - 18)}" y1="${r(y + h)}" x2="${r(x + w)}" y2="${r(y + h - 18)}" stroke="${hue.strong}" stroke-width="1.6"/>` : '')
    },
  }
}

// ---------- C4 ----------

function c4text(name, type, desc, pal) {
  return block([
    ...asLines([].concat(name), F(17, 700), pal.text),
    type && { s: type, f: FONT.tag, color: pal.sub },
    desc && { s: '', f: F(5), space: 8 },
    ...asLines([].concat(desc ?? []), FONT.body, pal.text),
  ])
}

/** Прямоугольник C4: система, контейнер, компонент или внешняя система. */
export function c4box({ name, type, desc, kind = 'container', minW = 230 }) {
  const pal = C4[kind]
  const t = c4text(name, type, desc, pal)
  const w = Math.max(minW, t.w + 44)
  const h = t.h + 34
  return {
    w, h,
    draw(d, { x, y, w, h }) {
      return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="12" fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="1.4"/>` +
        t.draw(d, x + w / 2, y + (h - t.h) / 2)
    },
  }
}

/** Человек C4: голова-круг над скруглённым корпусом. */
export function c4person({ name, type = '[Person]', desc, minW = 230 }) {
  const pal = C4.person
  const t = c4text(name, type, desc, pal)
  const head = 26
  const w = Math.max(minW, t.w + 44)
  const bodyH = t.h + 34 + 10
  const h = bodyH + head * 1.4
  return {
    w, h,
    draw(d, { x, y, w, h }) {
      const by = y + head * 1.4
      return `<rect x="${r(x)}" y="${r(by)}" width="${r(w)}" height="${r(bodyH)}" rx="30" fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="1.4"/>` +
        `<circle cx="${r(x + w / 2)}" cy="${r(y + head)}" r="${head}" fill="${pal.fill}" stroke="#ffffff" stroke-width="3"/>` +
        t.draw(d, x + w / 2, by + (bodyH - t.h) / 2 + 4)
    },
  }
}

/** База данных C4: цилиндр. */
export function c4db({ name, type, desc, kind = 'container', minW = 230 }) {
  const pal = C4[kind]
  const t = c4text(name, type, desc, pal)
  const w = Math.max(minW, t.w + 44)
  const ry = 13
  const h = t.h + 34 + ry * 2
  return {
    w, h,
    draw(d, { x, y, w, h }) {
      const rx = w / 2
      return `<path d="M${r(x)},${r(y + ry)} A${r(rx)},${ry} 0 0 1 ${r(x + w)},${r(y + ry)} V${r(y + h - ry)} A${r(rx)},${ry} 0 0 1 ${r(x)},${r(y + h - ry)} Z" fill="${pal.fill}" stroke="${pal.stroke}" stroke-width="1.4"/>` +
        `<path d="M${r(x)},${r(y + ry)} A${r(rx)},${ry} 0 0 0 ${r(x + w)},${r(y + ry)}" fill="none" stroke="${pal.sub}" stroke-opacity="0.75" stroke-width="1.4"/>` +
        t.draw(d, x + w / 2, y + ry * 2 + (h - ry * 2 - t.h) / 2 - 2)
    },
  }
}

/** Граница C4 вокруг узлов ids: пунктирная рамка с подписью снизу слева. Рисуется под узлами. */
export function c4boundary(d, ids, { name, type, pad = 30, padBottom = 54, color = '#64748b', extra = [] }) {
  const boxes = [...ids.map((id) => d.box(id)), ...extra]
  const x = Math.min(...boxes.map((b) => b.x)) - pad
  const y = Math.min(...boxes.map((b) => b.y)) - pad
  const w = Math.max(...boxes.map((b) => b.x + b.w)) + pad - x
  const h = Math.max(...boxes.map((b) => b.y + b.h)) + padBottom - y
  const t = block([{ s: name, f: F(17, 700), color: C.ink }, type && { s: type, f: FONT.tag, color: C.muted }], { align: 'start' })
  const lx = x + 18; const ly = y + h - t.h - 14
  d.under(`<g class="boundary"><rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="18" fill="#f8fafc" stroke="${color}" stroke-width="1.4" stroke-dasharray="8 6"/>` +
    t.draw(d, lx, ly) + '</g>')
  d.obstacle({ x: lx - 4, y: ly - 4, w: t.w + 8, h: t.h + 8 })
  d.extents = [...(d.extents ?? []), { x, y, w, h }]
  return { x, y, w, h }
}

// ---------- легенда ----------

/**
 * Легенда: заголовок и строки «образец — пояснение». sample(d, x, y, w, h) рисует образец
 * в ячейке sw×sh. Ставится как узел без точек подключения, линии её обходят.
 */
export function legend({ title = 'Обозначения', items, sw = 54, sh = 26, cols = 1, colGap = 28 }) {
  const rows = items.map((it) => ({ ...it, t: block(asLines([].concat(it.text), FONT.legend, C.text), { align: 'start' }) }))
  const rowH = rows.map((x) => Math.max(sh, x.t.h) + 8)
  const perCol = Math.ceil(rows.length / cols)
  const colsArr = Array.from({ length: cols }, (_, c) => rows.slice(c * perCol, (c + 1) * perCol))
  const colW = colsArr.map((cs) => sw + 12 + Math.max(0, ...cs.map((x) => x.t.w)))
  const colH = colsArr.map((cs, c) => cs.reduce((s, _, i) => s + rowH[c * perCol + i], 0))
  const head = block([{ s: title, f: FONT.legendTitle, color: C.ink }], { align: 'start' })
  const w = Math.max(head.w, colW.reduce((a, b) => a + b, 0) + colGap * (cols - 1)) + 32
  const h = head.h + 10 + Math.max(...colH) + 20
  return {
    w, h,
    draw(d, { x, y, w, h }) {
      let out = `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="12" fill="#ffffff" stroke="${C.hair}" stroke-width="1.2"/>` +
        head.draw(d, x + 16, y + 12)
      let cx = x + 16
      colsArr.forEach((cs, c) => {
        let cy = y + 12 + head.h + 10
        cs.forEach((it, i) => {
          const rh = rowH[c * perCol + i]
          out += it.sample(d, cx, cy + (rh - 8 - sh) / 2, sw, sh)
          out += it.t.draw(d, cx + sw + 12, cy + (rh - 8 - it.t.h) / 2)
          cy += rh
        })
        cx += colW[c] + colGap
      })
      return out
    },
  }
}

export { esc, lineHeight }
