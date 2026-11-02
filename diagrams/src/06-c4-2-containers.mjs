// C4, уровень 2 — контейнеры: из каких запускаемых частей состоит schemix (Docker Compose).
// Лист A4 альбомный.
import { Diagram } from '../../tools/lib/kit.mjs'
import { c4box, c4person, c4db, c4boundary, legend } from '../../tools/lib/shapes.mjs'
import { samples } from '../../tools/lib/samples.mjs'

export default async function () {
  const d = new Diagram({ title: 'C4 · Уровень 2. Контейнеры schemix', subtitle: 'Container diagram · развёртывание: Docker Compose' })

  d.node('analyst', c4person({ name: 'Аналитик', type: '[Person]', desc: 'Работает в браузере' }), { cx: 0, cy: 0 })
  d.node('spa', c4box({ name: 'Веб-приложение', type: '[Container: React 19, TypeScript, bpmn-js 18]', desc: ['Редактор схемы, чаты, история,', 'предпросмотры, голосовой ввод'] }), { cx: -290, cy: 280 })
  d.node('web', c4box({ name: 'Веб-сервер', type: '[Container: nginx 1.28]', desc: ['Раздаёт сборку,', 'проксирует /api и WebSocket'] }), { cx: 290, cy: 280 })
  d.node('api', c4box({ name: 'API-приложение и worker агента', type: '[Container: Python 3.12, FastAPI]', desc: ['HTTP API, поток событий,', 'семь ролей агента, BPMN-модуль'] }), { cx: 290, cy: 520 })
  d.node('migrate', c4box({ name: 'Миграции', type: '[Container: Alembic, разовый запуск]', desc: 'alembic upgrade head' }), { cx: -290, cy: 770 })
  d.node('db', c4db({ name: 'База данных', type: '[Container: PostgreSQL 16]', desc: ['Диаграммы, ревизии, чаты,', 'запросы агента, события'] }), { cx: 290, cy: 770 })
  c4boundary(d, ['spa', 'web', 'api', 'migrate', 'db'], { name: 'schemix', type: '[Software System]' })

  d.node('llm', c4box({ kind: 'external', name: 'Провайдер языковой модели', type: '[Software System, внешняя]', desc: 'chat/completions' }), { cx: 830, cy: 520 })
  d.node('stt', c4box({ kind: 'external', name: 'Сервис распознавания речи', type: '[Software System, внешняя]', desc: '/audio/transcriptions' }), { cx: 830, cy: 770 })

  const rel = { dashed: true }
  d.edge('analyst', 'spa', { ...rel, fromSide: 'W', toSide: 'N', label: ['работает', 'в редакторе'] })
  d.edge('analyst', 'web', { ...rel, fromSide: 'E', toSide: 'N', label: ['открывает стенд', '[HTTPS]'] })
  d.edge('spa', 'web', { ...rel, fromSide: 'E', fromC: 255, toSide: 'W', toC: 255, label: ['команды, события', '[HTTPS, WebSocket]'] })
  d.edge('web', 'spa', { ...rel, fromSide: 'W', fromC: 310, toSide: 'E', toC: 310, label: 'отдаёт сборку' })
  d.edge('web', 'api', { ...rel, fromSide: 'S', toSide: 'N', label: ['проксирует /api', '[HTTP, WebSocket]'] })
  d.edge('api', 'db', { ...rel, fromSide: 'S', toSide: 'N', label: ['читает, пишет, lease запросов', '[SQL, psycopg 3]'] })
  d.edge('migrate', 'db', { ...rel, fromSide: 'E', toSide: 'W', label: ['схема', '[SQL]'] })
  d.edge('api', 'llm', { ...rel, fromSide: 'E', toSide: 'W', label: ['роли агента', '[HTTPS, JSON]'] })
  d.edge('api', 'stt', { ...rel, fromSide: 'E', toSide: 'W', label: ['фразы диктовки', '[HTTPS, WAV]'] })

  d.node('legend', legend({ items: [samples.c4('person', 'человек'), samples.c4('container', 'контейнер'), samples.c4('external', 'внешняя система'), samples.boundary, samples.rel] }), { cx: 830, cy: 150 }, { pins: false })

  return d.render({ route: { buffer: 20, nudge: 16 } })
}
