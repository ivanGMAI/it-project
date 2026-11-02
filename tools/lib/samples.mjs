// Образцы для легенд: маленькие копии фигур и линий.
import { r, arrowHead } from './kit.mjs'
import { C, HUE, C4 } from './theme.mjs'

const line = (x, y, w, h, { dashed, color = C.line } = {}) =>
  `<line x1="${r(x + 2)}" y1="${r(y + h / 2)}" x2="${r(x + w - 10)}" y2="${r(y + h / 2)}" stroke="${color}" stroke-width="1.6"${dashed ? ' stroke-dasharray="6 4"' : ''}/>` +
  arrowHead([x + w - 1, y + h / 2], [1, 0], { color })

export const samples = {
  process: {
    text: 'процесс',
    sample: (d, x, y, w, h) => `<rect x="${r(x + 4)}" y="${r(y)}" width="${w - 8}" height="${h}" rx="7" fill="#fff" stroke="${HUE.blue.stroke}" stroke-width="1.4"/>` +
      `<path d="M${r(x + 4)},${r(y + 9)} V${r(y + 7)} a7,7 0 0 1 7,-7 H${r(x + w - 11)} a7,7 0 0 1 7,7 V${r(y + 9)} Z" fill="${HUE.blue.soft}" stroke="${HUE.blue.stroke}" stroke-width="1"/>`,
  },
  store: {
    text: 'хранилище данных',
    sample: (d, x, y, w, h) => `<rect x="${r(x)}" y="${r(y + 3)}" width="${w}" height="${h - 6}" fill="${HUE.teal.fill}"/>` +
      `<rect x="${r(x)}" y="${r(y + 3)}" width="14" height="${h - 6}" fill="${HUE.teal.soft}"/>` +
      `<path d="M${r(x + w)},${r(y + 3)} H${r(x)} V${r(y + h - 3)} H${r(x + w)}" fill="none" stroke="${HUE.teal.strong}" stroke-width="1.4"/>` +
      `<line x1="${r(x + 14)}" y1="${r(y + 3)}" x2="${r(x + 14)}" y2="${r(y + h - 3)}" stroke="${HUE.teal.strong}" stroke-width="1"/>`,
  },
  external: {
    text: 'внешняя сущность',
    sample: (d, x, y, w, h) => `<path d="M${r(x + 6)},${r(y + h - 4)} V${r(y)} H${r(x + w - 8)} L${r(x + w - 4)},${r(y + 4)} H${r(x + 10)} V${r(y + h)} Z" fill="${HUE.orange.shade}" stroke="${HUE.orange.strong}" stroke-width="1"/>` +
      `<rect x="${r(x + 10)}" y="${r(y + 4)}" width="${w - 14}" height="${h - 4}" fill="${HUE.orange.fill}" stroke="${HUE.orange.strong}" stroke-width="1.4"/>`,
  },
  externalDup: {
    text: ['копия внешней сущности', '(та же сущность ещё раз)'],
    sample: (d, x, y, w, h) => `<path d="M${r(x + 6)},${r(y + h - 4)} V${r(y)} H${r(x + w - 8)} L${r(x + w - 4)},${r(y + 4)} H${r(x + 10)} V${r(y + h)} Z" fill="${HUE.violet.shade}" stroke="${HUE.violet.strong}" stroke-width="1"/>` +
      `<rect x="${r(x + 10)}" y="${r(y + 4)}" width="${w - 14}" height="${h - 4}" fill="${HUE.violet.fill}" stroke="${HUE.violet.strong}" stroke-width="1.4"/>` +
      `<line x1="${r(x + w - 14)}" y1="${r(y + h)}" x2="${r(x + w - 4)}" y2="${r(y + h - 10)}" stroke="${HUE.violet.strong}" stroke-width="1.4"/>`,
  },
  flow: { text: 'поток данных', sample: (d, x, y, w, h) => line(x, y, w, h) },
  rel: { text: 'связь, направление вызова', sample: (d, x, y, w, h) => line(x, y, w, h, { dashed: true }) },
  c4: (kind, text) => ({
    text,
    sample: (d, x, y, w, h) => kind === 'person'
      ? `<rect x="${r(x + 6)}" y="${r(y + 9)}" width="${w - 12}" height="${h - 9}" rx="8" fill="${C4.person.fill}"/><circle cx="${r(x + w / 2)}" cy="${r(y + 7)}" r="7" fill="${C4.person.fill}" stroke="#fff" stroke-width="1.5"/>`
      : `<rect x="${r(x + 2)}" y="${r(y + 2)}" width="${w - 4}" height="${h - 4}" rx="6" fill="${C4[kind].fill}" stroke="${C4[kind].stroke}" stroke-width="1.2"/>`,
  }),
  boundary: {
    text: 'граница системы',
    sample: (d, x, y, w, h) => `<rect x="${r(x + 2)}" y="${r(y + 2)}" width="${w - 4}" height="${h - 4}" rx="7" fill="#f8fafc" stroke="#64748b" stroke-width="1.2" stroke-dasharray="5 4"/>`,
  },
}
