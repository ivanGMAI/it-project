// ER-диаграмма в нотации «воронья лапка» (Information Engineering): таблица с цветной шапкой,
// строки с ключами и типами, точки подключения на уровне строк, маркеры кардинальности.
import { block, r, width } from './kit.mjs'
import { C, F, HUE } from './theme.mjs'
import { MONO } from './fonts.mjs'

const NAME = F(13.5, 500)
const NAME_PK = F(13.5, 700)
const TYPE = F(13, 400, MONO)
const BADGE = F(12.8, 700)
const HEAD = F(14.5, 700, MONO)
const HEAD_RU = F(13, 500)
const ROW = 21
const HEAD_H = 46
const BADGE_COLORS = { PK: ['#fef3c7', '#92400e'], FK: ['#dbeafe', '#1e40af'], UQ: ['#ede9fe', '#5b21b6'] }

/**
 * Таблица. cols: [[ключи, имя, тип]], ключи — 'PK', 'FK', 'PK,FK', 'UQ', 'FK,UQ' или ''.
 * Возвращает фигуру и функцию rowAt(имя) → доля высоты для точки подключения строки.
 */
export function table({ name, ru, cols, hue }) {
  const badgeW = (k) => width(k, BADGE) + 10
  const keysW = Math.max(0, ...cols.map(([k]) => (k ? k.split(',').reduce((s, x) => s + badgeW(x.trim()) + 4, 0) : 0)))
  const nameW = Math.max(...cols.map(([k, n]) => width(n, k.includes('PK') ? NAME_PK : NAME)))
  const typeW = Math.max(...cols.map(([, , t]) => width(t, TYPE)))
  const headW = Math.max(width(name, HEAD), width(ru, HEAD_RU))
  const w = Math.ceil(Math.max(headW + 28, 12 + keysW + 6 + nameW + 18 + typeW + 12))
  const h = HEAD_H + cols.length * ROW + 6
  const rowY = (i) => HEAD_H + 3 + i * ROW + ROW / 2
  const shape = {
    w, h,
    draw(d, { x, y, w, h }) {
      let out = `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="8" fill="#ffffff"/>`
      cols.forEach(([k, n, t], i) => {
        const cy = y + rowY(i)
        if (i % 2 === 1) out += `<rect x="${r(x + 1)}" y="${r(cy - ROW / 2)}" width="${r(w - 2)}" height="${ROW}" fill="${hue.fill}"/>`
        let bx = x + 12
        for (const key of k ? k.split(',').map((s) => s.trim()) : []) {
          const [bg, fg] = BADGE_COLORS[key]
          const bw = badgeW(key)
          out += `<rect x="${r(bx)}" y="${r(cy - 9)}" width="${r(bw)}" height="18" rx="4" fill="${bg}"/>` +
            d.text(bx + bw / 2, cy + 4.5, key, BADGE, { anchor: 'middle', fill: fg })
          bx += bw + 4
        }
        out += d.text(x + 12 + keysW + 6, cy + 4.9, n, k.includes('PK') ? NAME_PK : NAME, { fill: C.ink })
        out += d.text(x + w - 12, cy + 4.5, t, TYPE, { anchor: 'end', fill: C.muted })
      })
      // шапка
      out += `<path d="M${r(x)},${r(y + HEAD_H)} V${r(y + 8)} a8,8 0 0 1 8,-8 H${r(x + w - 8)} a8,8 0 0 1 8,8 V${r(y + HEAD_H)} Z" fill="${hue.strong}"/>` +
        d.text(x + 14, y + 20, name, HEAD, { fill: '#ffffff' }) +
        d.text(x + 14, y + 38, ru, HEAD_RU, { fill: hue.soft })
      out += `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="8" fill="none" stroke="${hue.strong}" stroke-width="1.3"/>`
      return out
    },
  }
  return {
    shape,
    // доля высоты таблицы, на которой середина строки col
    rowAt(col) {
      const i = cols.findIndex(([, n]) => n === col)
      if (i < 0) throw new Error(`нет колонки ${name}.${col}`)
      return rowY(i) / h
    },
    rows: cols.map((_, i) => rowY(i) / h),
    headAt: HEAD_H / 2 / h,
  }
}

// ---------- маркеры кардинальности ----------
// p — точка на рамке таблицы, u — единичный вектор внутрь таблицы.
const pt = (p, u, along, side = 0) => [p[0] - u[0] * along - u[1] * side, p[1] - u[1] * along + u[0] * side]
const seg = (a, b, color) => `<line x1="${r(a[0])}" y1="${r(a[1])}" x2="${r(b[0])}" y2="${r(b[1])}" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/>`
const bar = (p, u, at, color) => seg(pt(p, u, at, -7), pt(p, u, at, 7), color)
const ring = (p, u, at, color) => { const c = pt(p, u, at); return `<circle cx="${r(c[0])}" cy="${r(c[1])}" r="5" fill="#ffffff" stroke="${color}" stroke-width="1.6"/>` }
const crow = (p, u, color) => seg(pt(p, u, 15), pt(p, u, 0, -8), color) + seg(pt(p, u, 15), pt(p, u, 0, 8), color)

export const card = {
  one: (p, u, c) => bar(p, u, 8, c) + bar(p, u, 14, c), // ровно один
  zeroOne: (p, u, c) => bar(p, u, 8, c) + ring(p, u, 20, c), // ноль или один
  many: (p, u, c) => crow(p, u, c) + ring(p, u, 21, c), // ноль или много
  oneMany: (p, u, c) => crow(p, u, c) + bar(p, u, 19, c), // один или много
}

export const cardSample = (kind, text) => ({
  text,
  sample: (d, x, y, w, h) => {
    const p = [x + w, y + h / 2]
    return `<line x1="${r(x)}" y1="${r(y + h / 2)}" x2="${r(x + w)}" y2="${r(y + h / 2)}" stroke="${C.line}" stroke-width="1.6"/>` +
      card[kind](p, [1, 0], C.line) + `<line x1="${r(x + w)}" y1="${r(y + 3)}" x2="${r(x + w)}" y2="${r(y + h - 3)}" stroke="${C.muted}" stroke-width="2"/>`
  },
})

export const GROUPS = {
  doc: { hue: { ...HUE.blue, strong: '#1d4ed8' }, text: 'Документ и история' },
  chat: { hue: { ...HUE.green, strong: '#15803d' }, text: 'Переписка' },
  agent: { hue: { ...HUE.orange, strong: '#c2410c' }, text: 'Агент' },
  dict: { hue: { ...HUE.violet, strong: '#6d28d9' }, text: 'Диктовка' },
  svc: { hue: { ...HUE.slate, strong: '#475569' }, text: 'Служебные' },
}

export { block }
