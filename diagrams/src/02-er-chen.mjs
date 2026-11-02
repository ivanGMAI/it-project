// ER-диаграмма schemix в нотации Чена (концептуальная модель данных, по схеме БД
// backend/migration/versions). Сущности и связи расставлены вручную, атрибуты — автоматически
// (tools/lib/chen.mjs). Двойная линия — полное участие сущности в связи. Лист A3 альбомный.
import { Chen } from '../../tools/lib/chen.mjs'
import { legend } from '../../tools/lib/shapes.mjs'
import { r } from '../../tools/lib/kit.mjs'
import { C, HUE } from '../../tools/lib/theme.mjs'

export default async function () {
  const g = new Chen({ title: 'ER-диаграмма schemix в нотации Чена', subtitle: 'Концептуальная модель данных' })

  // ---------- сущности ----------
  g.entity('diagram', 'ДИАГРАММА', { x: 0, y: -378 })
  g.entity('chat', 'ЧАТ', { x: 0, y: -189 })
  g.entity('message', 'СООБЩЕНИЕ', { x: 0, y: 0 })
  g.entity('run', 'ЗАПРОС АГЕНТУ', { x: 448, y: 0 })
  g.entity('revision', 'РЕВИЗИЯ', { x: 608, y: -378, weak: true })
  g.entity('preview', 'ПРЕДПРОСМОТР', { x: 1024, y: -215 })
  g.entity('proposal', 'ПРЕДЛОЖЕНИЕ', { x: 1024, y: 0 })
  g.entity('round', 'РАУНД УТОЧНЕНИЙ', { x: 112, y: 361, weak: true })
  g.entity('artifact', 'АРТЕФАКТ РОЛИ', { x: 448, y: 378 })
  g.entity('correction', 'ПРАВКА', { x: 752, y: 361, weak: true })
  g.entity('dictation', 'ДИКТОВКА', { x: 1024, y: 258, weak: true })
  g.entity('segment', 'ФРАЗА ДИКТОВКИ', { x: 1420, y: 258 })

  // ---------- связи ----------
  g.relation('r_rev', 'хранит', { x: 304, y: -378, ident: true })
  g.relation('r_chat', 'включает', { x: 0, y: -284 })
  g.relation('r_msg', 'содержит', { x: 0, y: -95 })
  g.relation('r_init', 'инициирует', { x: 224, y: 0 })
  g.relation('r_base', ['опирается', 'на'], { x: 448, y: -198 })
  g.relation('r_res', 'создаёт', { x: 632, y: -198 })
  g.relation('r_prev', 'строит', { x: 768, y: -112 })
  g.relation('r_prop', 'формирует', { x: 768, y: 0 })
  g.relation('r_show', 'показывает', { x: 1024, y: -108 })
  g.relation('r_round', 'уточняется', { x: 248, y: 181, ident: true })
  g.relation('r_art', 'сохраняет', { x: 448, y: 189 })
  g.relation('r_corr', 'правится', { x: 632, y: 181, ident: true })
  g.relation('r_dict', ['ведётся', 'как'], { x: 808, y: 163, ident: true })
  g.relation('r_seg', ['состоит', 'из'], { x: 1200, y: 258 })

  const L = (e, rel, card, total = false) => g.link(e, rel, { card, total })
  L('diagram', 'r_rev', '1'); L('revision', 'r_rev', 'N', true)
  L('diagram', 'r_chat', '1'); L('chat', 'r_chat', 'N', true)
  L('chat', 'r_msg', '1'); L('message', 'r_msg', 'N', true)
  L('message', 'r_init', '1'); L('run', 'r_init', '1', true)
  L('run', 'r_base', 'N', true); L('revision', 'r_base', '1')
  L('run', 'r_res', '1'); L('revision', 'r_res', '1')
  L('run', 'r_prev', '1'); L('preview', 'r_prev', 'N', true)
  L('run', 'r_prop', '1'); L('proposal', 'r_prop', 'N', true)
  L('proposal', 'r_show', '1', true); L('preview', 'r_show', '1')
  L('run', 'r_round', '1'); L('round', 'r_round', 'N', true)
  L('run', 'r_art', '1'); L('artifact', 'r_art', 'N', true)
  L('run', 'r_corr', '1'); L('correction', 'r_corr', 'N', true)
  L('run', 'r_dict', '1'); L('dictation', 'r_dict', '1', true)
  L('dictation', 'r_seg', '1'); L('segment', 'r_seg', 'N', true)

  // ---------- атрибуты ----------
  g.attrs('diagram', [
    { name: 'ID', key: true, prefer: 300 }, { name: 'название', prefer: 200 }, { name: 'текущая ревизия', prefer: 160 },
    { name: 'редактируемость', prefer: 180 }, { name: ['причины', '«только чтение»'], multi: true, prefer: 230 }, { name: 'дата изменения', prefer: 270 },
  ])
  g.attrs('revision', [
    { name: 'номер', partial: true, prefer: 250 }, { name: 'BPMN XML с DI', prefer: 290 }, { name: 'исходный XML', prefer: 330 },
    { name: 'источник', prefer: 0 }, { name: 'дата создания', prefer: 30 },
  ])
  g.attrs('chat', [{ name: 'ID', key: true, prefer: 0 }, { name: 'название', prefer: 20 }, { name: 'дата создания', prefer: 180 }, { name: 'дата удаления', prefer: 200 }])
  g.attrs('message', [
    { name: 'ID', key: true, prefer: 320 }, { name: 'порядковый номер', prefer: 160 }, { name: 'вид', prefer: 200 },
    { name: 'текст', prefer: 180 }, { name: ['привязки', 'к элементам'], multi: true, prefer: 120 },
  ])
  g.attrs('run', [{ name: 'ID', key: true, prefer: 285 }, { name: 'вид', prefer: 230 }, { name: 'статус', prefer: 165 }, { name: 'ошибка', prefer: 200 }])
  g.attrs('preview', [{ name: 'ID', key: true, prefer: 270 }, { name: 'XML кандидата', prefer: 0 }, { name: ['изменённые', 'элементы'], multi: true, prefer: 320 }, { name: 'устарел', prefer: 220 }])
  g.attrs('proposal', [{ name: 'ID', key: true, prefer: 340 }, { name: 'сводка', prefer: 0 }, { name: ['причины', 'риска'], multi: true, prefer: 20 }, { name: 'статус', prefer: 60 }])
  g.attrs('round', [{ name: 'номер', partial: true, prefer: 180 }, { name: 'вопросы', multi: true, prefer: 135 }, { name: 'ответы', multi: true, prefer: 90 }])
  g.attrs('artifact', [{ name: 'ID', key: true, prefer: 30 }, { name: 'роль', prefer: 0 }, { name: 'модель', prefer: 90 }, { name: 'версия промпта', prefer: 150 }, { name: 'факты (JSON)', prefer: 180 }])
  g.attrs('correction', [{ name: 'номер', partial: true, prefer: 30 }, { name: 'текст', prefer: 90 }, { name: 'дата', prefer: 140 }])
  g.attrs('dictation', [{ name: 'начало', prefer: 60 }, { name: 'последняя фраза', prefer: 100 }, { name: 'длительность', derived: true, prefer: 140 }, { name: 'итог', prefer: 20 }])
  g.attrs('segment', [
    { name: 'ID', key: true, prefer: 270 }, { name: 'номер', prefer: 310 }, { name: 'текст', prefer: 0 }, { name: 'статус', prefer: 230 },
    { name: 'интервал', prefer: 75, parts: [{ name: 'начало, мс', prefer: 120 }, { name: 'конец, мс', prefer: 45 }] },
  ])

  // ---------- легенда ----------
  const ent = (x, y, w, h, weak) => `<rect x="${r(x + 2)}" y="${r(y + 2)}" width="${w - 4}" height="${h - 4}" rx="2" fill="${HUE.blue.fill}" stroke="${HUE.blue.strong}" stroke-width="1.4"/>` +
    (weak ? `<rect x="${r(x + 5)}" y="${r(y + 5)}" width="${w - 10}" height="${h - 10}" fill="none" stroke="${HUE.blue.strong}" stroke-width="1"/>` : '')
  const dia = (x, y, w, h, ident) => `<polygon points="${r(x + w / 2)},${r(y)} ${r(x + w)},${r(y + h / 2)} ${r(x + w / 2)},${r(y + h)} ${r(x)},${r(y + h / 2)}" fill="${HUE.amber.fill}" stroke="${HUE.amber.strong}" stroke-width="1.4"/>` +
    (ident ? `<polygon points="${r(x + w / 2)},${r(y + 4)} ${r(x + w - 8)},${r(y + h / 2)} ${r(x + w / 2)},${r(y + h - 4)} ${r(x + 8)},${r(y + h / 2)}" fill="none" stroke="${HUE.amber.strong}" stroke-width="1"/>` : '')
  const ell = (x, y, w, h, o = {}) => `<ellipse cx="${r(x + w / 2)}" cy="${r(y + h / 2)}" rx="${w / 2 - 1}" ry="${h / 2 - 1}" fill="#fff" stroke="#64748b" stroke-width="1.3"${o.dash ? ' stroke-dasharray="4 3"' : ''}/>` +
    (o.multi ? `<ellipse cx="${r(x + w / 2)}" cy="${r(y + h / 2)}" rx="${w / 2 - 5}" ry="${h / 2 - 4}" fill="none" stroke="#64748b" stroke-width="1"/>` : '') +
    (o.under ? `<line x1="${r(x + w / 2 - 12)}" y1="${r(y + h / 2 + 4)}" x2="${r(x + w / 2 + 12)}" y2="${r(y + h / 2 + 4)}" stroke="${C.text}" stroke-width="1.2"${o.under === 'dash' ? ' stroke-dasharray="3 2"' : ''}/>` : '')
  const items = [
    { text: 'сущность', sample: (d, x, y, w, h) => ent(x, y, w, h) },
    { text: 'слабая сущность', sample: (d, x, y, w, h) => ent(x, y, w, h, true) },
    { text: 'связь', sample: (d, x, y, w, h) => dia(x, y, w, h) },
    { text: 'идентифицирующая связь', sample: (d, x, y, w, h) => dia(x, y, w, h, true) },
    { text: 'атрибут', sample: (d, x, y, w, h) => ell(x, y, w, h) },
    { text: 'ключ', sample: (d, x, y, w, h) => ell(x, y, w, h, { under: true }) },
    { text: 'частичный ключ', sample: (d, x, y, w, h) => ell(x, y, w, h, { under: 'dash' }) },
    { text: 'многозначный атрибут', sample: (d, x, y, w, h) => ell(x, y, w, h, { multi: true }) },
    { text: 'производный атрибут', sample: (d, x, y, w, h) => ell(x, y, w, h, { dash: true }) },
    { text: 'полное участие', sample: (d, x, y, w, h) => `<line x1="${x}" y1="${r(y + h / 2 - 2.6)}" x2="${x + w}" y2="${r(y + h / 2 - 2.6)}" stroke="#334155" stroke-width="1.4"/><line x1="${x}" y1="${r(y + h / 2 + 2.6)}" x2="${x + w}" y2="${r(y + h / 2 + 2.6)}" stroke="#334155" stroke-width="1.4"/>` },
  ]
  g.d.headerRight = legend({ title: 'Обозначения', cols: 5, sw: 46, sh: 26, items })

  return g.render()
}
