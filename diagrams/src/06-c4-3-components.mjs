// C4, уровень 3 — компоненты контейнера «API-приложение и worker агента»
// (backend/src/bpmn_assistant). Поток слева направо: веб-приложение → контроллеры → сценарии →
// роли и сервисы → адаптеры → внешние системы. Лист A3 альбомный.
import { Diagram } from '../../tools/lib/kit.mjs'
import { c4box, c4db, c4boundary, legend } from '../../tools/lib/shapes.mjs'
import { samples } from '../../tools/lib/samples.mjs'

export default async function () {
  const d = new Diagram({ title: 'C4 · Уровень 3. Компоненты бэкенда schemix', subtitle: 'Component diagram · контейнер «API-приложение и worker агента»' })
  const X = [0, 0, 350, 700, 1050, 1440]
  const Y = [0, 175, 350, 555, 730]
  const at = (c, r) => ({ cx: X[c], cy: Y[r] })
  const comp = (name, type, desc) => c4box({ kind: 'component', name, type, desc, minW: 250 })

  d.node('spa', c4box({ name: 'Веб-приложение', type: '[Container: React 19, bpmn-js 18]', desc: 'через nginx /api', minW: 240 }), { cx: X[1], cy: Y[0] - 215 })

  d.node('http', comp('HTTP API', '[controller/http]', ['Маршруты OpenAPI,', 'идемпотентность']), at(1, 2))
  d.node('ws', comp('Поток событий', '[controller/ws]', ['Прогресс, черновик,', 'ревизии; resync']), at(1, 4))

  d.node('dictation', comp('Диктовка', '[application/dictation]', 'Фразы → текст → черновик'), at(2, 0))
  d.node('docs', comp('Чтение документов', '[adapter/documents]', 'Текст из .docx и .pdf'), at(2, 1))
  d.node('worker', comp('Worker агента', '[application/agent]', 'Берёт запросы по lease'), at(2, 2))
  d.node('workspace', comp('Сценарии', '[application/workspace]', ['Диаграммы, ревизии (CAS),', 'чаты, импорт, экспорт']), at(2, 3))

  d.node('roles', comp('Роли агента', '[adapter/agents]', ['Промпты и JSON-схемы:', 'intent, entities, flow…']), at(3, 1))
  d.node('runner', comp('Runner агента', '[application/agent]', ['Роли, бюджеты, checkpoints,', 'ChangeSet, оценка риска']), at(3, 2))
  d.node('bpmn', comp('BPMN-модуль', '[service/bpmn, adapter/bpmn]', ['XSD, граф, раскладка,', 'нормоконтроль, экспорт']), at(3, 3))

  d.node('sttc', comp('Клиент распознавания', '[порт SpeechToText]', '/audio/transcriptions'), at(4, 0))
  d.node('llmc', comp('Клиент модели', '[порт LanguageModel]', ['OpenAI-совместимый;', 'адаптер Claude Agent SDK']), at(4, 1))
  d.node('repo', comp('Хранилище', '[порт UnitOfWork]', ['Репозитории, транзакции,', 'psycopg 3']), { cx: X[4], cy: (Y[3] + Y[4]) / 2 })

  c4boundary(d, ['http', 'ws', 'dictation', 'docs', 'worker', 'workspace', 'roles', 'runner', 'bpmn', 'sttc', 'llmc', 'repo'],
    { name: 'API-приложение и worker агента', type: '[Container: Python 3.12, FastAPI]', pad: 48 })

  d.node('stt', c4box({ kind: 'external', name: ['Сервис', 'распознавания речи'], type: '[внешняя система]', minW: 210 }), at(5, 0))
  d.node('llm', c4box({ kind: 'external', name: ['Провайдер', 'языковой модели'], type: '[внешняя система]', minW: 210 }), at(5, 1))
  d.node('db', c4db({ name: 'База данных', type: '[Container: PostgreSQL 16]', minW: 210 }), { cx: X[5], cy: (Y[3] + Y[4]) / 2 })

  const rel = { dashed: true }
  d.edge('spa', 'http', { ...rel, fromSide: 'S', toSide: 'N', label: ['команды', '[HTTPS]'] })
  d.edge('spa', 'ws', { ...rel, fromSide: 'W', toSide: 'W', label: ['события', '[WebSocket]'] })
  d.edge('http', 'dictation', { ...rel, fromSide: 'E', toSide: 'W', label: 'фразы' })
  d.edge('http', 'docs', { ...rel, fromSide: 'E', toSide: 'W', label: 'документ' })
  d.edge('http', 'workspace', { ...rel, fromSide: 'S', toSide: 'W', label: 'вызывает' })
  d.edge('worker', 'runner', { ...rel, fromSide: 'E', toSide: 'W', label: 'запускает' })
  d.edge('worker', 'repo', { ...rel, label: 'lease', labelAt: 0.15 })
  d.edge('runner', 'roles', { ...rel, fromSide: 'N', toSide: 'S', label: 'роль' })
  d.edge('runner', 'bpmn', { ...rel, fromSide: 'S', toSide: 'N', label: 'ChangeSet' })
  d.edge('runner', 'repo', { ...rel, label: ['checkpoints,', 'ревизия'] })
  d.edge('workspace', 'bpmn', { ...rel, fromSide: 'E', toSide: 'W', label: ['проверка,', 'экспорт'] })
  d.edge('workspace', 'repo', { ...rel, label: 'транзакции' })
  d.edge('ws', 'repo', { ...rel, fromSide: 'E', toSide: 'S', label: 'журнал' })
  d.edge('dictation', 'roles', { ...rel, fromSide: 'E', toSide: 'N', label: 'dictation' })
  d.edge('dictation', 'sttc', { ...rel, fromSide: 'E', toSide: 'W', label: 'фраза' })
  d.edge('roles', 'llmc', { ...rel, fromSide: 'E', toSide: 'W', label: 'generate' })
  d.edge('repo', 'db', { ...rel, fromSide: 'E', toSide: 'W', label: 'SQL' })
  d.edge('llmc', 'llm', { ...rel, fromSide: 'E', toSide: 'W', label: '[HTTPS, JSON]' })
  d.edge('sttc', 'stt', { ...rel, fromSide: 'E', toSide: 'W', label: '[HTTPS, WAV]' })

  d.node('legend', legend({ items: [samples.c4('container', 'контейнер'), samples.c4('component', 'компонент'), samples.c4('external', 'внешняя система'), samples.boundary, samples.rel] }), { cx: X[5], cy: Y[0] - 200 }, { pins: false })

  return d.render({ route: { buffer: 18, nudge: 14, crossingPenalty: 100 } })
}
