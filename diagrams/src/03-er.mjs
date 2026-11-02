// ER-диаграмма schemix (нотация «воронья лапка», логическая модель PostgreSQL 16).
// Таблицы и колонки — по миграциям backend/migration/versions/0001–0011.
// Связь выходит из строки первичного ключа родителя и входит в строку внешнего ключа потомка.
// Пунктир — логическая ссылка без ограничения FK в базе (proposals.preview_id). Лист A3 альбомный.
import { Diagram } from '../../tools/lib/kit.mjs'
import { legend } from '../../tools/lib/shapes.mjs'
import { table, card, cardSample, GROUPS } from '../../tools/lib/er.mjs'
import { r } from '../../tools/lib/kit.mjs'
import { C } from '../../tools/lib/theme.mjs'

const T = {
  diagrams: ['doc', 'Диаграмма', [['PK', 'id', 'text'], ['', 'title', 'text'], ['', 'title_auto', 'bool'], ['', 'current_revision', 'int'], ['', 'editability', 'text'], ['', 'read_only_reasons', 'jsonb'], ['', 'updated_at', 'timestamptz'], ['', 'deleted_at', 'timestamptz']]],
  revisions: ['doc', 'Ревизия', [['PK,FK', 'diagram_id', 'text'], ['PK', 'revision', 'int'], ['', 'bpmn_xml', 'text'], ['', 'original_xml', 'text'], ['', 'source', 'text'], ['FK', 'run_id', 'text'], ['', 'restored_from', 'int'], ['', 'created_at', 'timestamptz']]],
  diagram_streams: ['doc', 'Поток событий', [['PK,FK', 'diagram_id', 'text'], ['', 'cursor', 'bigint'], ['', 'progress', 'jsonb'], ['', 'draft', 'jsonb']]],
  stream_events: ['doc', 'Событие потока', [['PK,FK', 'diagram_id', 'text'], ['PK', 'seq', 'bigint'], ['UQ', 'event_id', 'text'], ['', 'event', 'jsonb']]],
  chats: ['chat', 'Чат', [['PK', 'id', 'text'], ['FK', 'diagram_id', 'text'], ['', 'title', 'text'], ['', 'last_sequence', 'int'], ['', 'created_at', 'timestamptz'], ['', 'deleted_at', 'timestamptz']]],
  messages: ['chat', 'Сообщение', [['PK', 'id', 'text'], ['FK', 'chat_id', 'text'], ['', 'sequence', 'int'], ['', 'kind', 'text'], ['', 'text', 'text'], ['', 'anchors', 'jsonb'], ['FK', 'run_id', 'text'], ['', 'clarification_round', 'int'], ['', 'question_ids', 'jsonb'], ['', 'proposal_id', 'text'], ['', 'created_at', 'timestamptz']]],
  runs: ['agent', 'Запрос агенту', [['PK', 'id', 'text'], ['FK', 'diagram_id', 'text'], ['FK', 'chat_id', 'text'], ['FK', 'user_message_id', 'text'], ['', 'kind', 'text'], ['', 'base_revision', 'int'], ['', 'status', 'text'], ['', 'current_stage', 'text'], ['', 'result_revision', 'int'], ['', 'error', 'jsonb'], ['FK', 'retry_of', 'text'], ['', 'board_id', 'text'], ['', 'lease_token', 'text'], ['', 'lease_expires_at', 'timestamptz'], ['', 'created_at', 'timestamptz'], ['', 'updated_at', 'timestamptz']]],
  clarification_rounds: ['agent', 'Раунд уточнений', [['PK,FK', 'run_id', 'text'], ['PK', 'number', 'int'], ['', 'questions', 'jsonb'], ['', 'answers', 'jsonb'], ['', 'schema_version', 'int']]],
  run_corrections: ['agent', 'Правка', [['PK,FK', 'run_id', 'text'], ['PK', 'number', 'int'], ['', 'text', 'text'], ['', 'message_id', 'text'], ['', 'created_at', 'timestamptz']]],
  proposals: ['agent', 'Предложение', [['PK', 'id', 'text'], ['UQ', 'seq', 'bigint'], ['FK', 'run_id', 'text'], ['', 'base_revision', 'int'], ['', 'summary', 'text'], ['', 'risk_reasons', 'jsonb'], ['', 'changed_element_ids', 'jsonb'], ['FK', 'preview_id', 'text'], ['', 'status', 'text']]],
  previews: ['agent', 'Предпросмотр', [['PK', 'id', 'text'], ['FK', 'diagram_id', 'text'], ['FK', 'run_id', 'text'], ['', 'base_revision', 'int'], ['', 'bpmn_xml', 'text'], ['', 'operations', 'jsonb'], ['', 'changed_element_ids', 'jsonb'], ['', 'issues', 'jsonb'], ['', 'stale', 'bool']]],
  run_artifacts: ['agent', 'Артефакт роли', [['PK', 'id', 'bigint'], ['FK', 'run_id', 'text'], ['', 'stage', 'text'], ['', 'round', 'int'], ['', 'base_revision', 'int'], ['', 'schema_version', 'text'], ['', 'prompt_version', 'text'], ['', 'model', 'text'], ['', 'payload', 'jsonb'], ['', 'created_at', 'timestamptz']]],
  structure_suggestions: ['agent', 'Предложение этапов', [['PK', 'id', 'text'], ['FK,UQ', 'run_id', 'text'], ['FK', 'diagram_id', 'text'], ['', 'base_revision', 'int'], ['', 'source', 'text'], ['', 'status', 'text'], ['', 'stages', 'jsonb'], ['', 'outcome', 'jsonb'], ['', 'model', 'text'], ['', 'prompt_version', 'text'], ['', 'schema_version', 'text'], ['', 'created_at', 'timestamptz'], ['', 'decided_at', 'timestamptz']]],
  dictations: ['dict', 'Диктовка', [['PK,FK', 'run_id', 'text'], ['', 'anchor_id', 'text'], ['', 'voice_message_id', 'text'], ['', 'started_at', 'timestamptz'], ['', 'last_segment_at', 'timestamptz'], ['', 'checkpoint', 'jsonb'], ['', 'outcome', 'jsonb']]],
  dictation_segments: ['dict', 'Фраза диктовки', [['PK', 'id', 'text'], ['FK', 'run_id', 'text'], ['UQ', 'seq', 'int'], ['', 'started_ms', 'int'], ['', 'ended_ms', 'int'], ['', 'status', 'text'], ['', 'text', 'text'], ['', 'stt_ms', 'int'], ['', 'llm_ms', 'int'], ['', 'element_ids', 'jsonb'], ['', 'error_code', 'text'], ['', 'audio', 'bytea'], ['', 'received_at', 'timestamptz']]],
  idempotency_keys: ['svc', 'Ключ идемпотентности', [['PK', 'method', 'text'], ['PK', 'path', 'text'], ['PK', 'key', 'text'], ['', 'request_hash', 'text'], ['', 'status_code', 'int'], ['', 'body_json', 'text'], ['', 'created_at', 'timestamptz']]],
}

// [родитель.колонка, потомок.колонка, маркер у родителя, маркер у потомка, пунктир]
const REL = [
  ['diagrams.id', 'revisions.diagram_id', 'one', 'oneMany'],
  ['diagrams.id', 'chats.diagram_id', 'one', 'oneMany'],
  ['diagrams.id', 'diagram_streams.diagram_id', 'one', 'zeroOne'],
  ['diagrams.id', 'stream_events.diagram_id', 'one', 'many'],
  ['diagrams.id', 'runs.diagram_id', 'one', 'many'],
  ['diagrams.id', 'previews.diagram_id', 'one', 'many'],
  ['diagrams.id', 'structure_suggestions.diagram_id', 'one', 'many'],
  ['chats.id', 'messages.chat_id', 'one', 'many'],
  ['chats.id', 'runs.chat_id', 'one', 'many'],
  ['messages.id', 'runs.user_message_id', 'one', 'zeroOne'],
  ['runs.id', 'messages.run_id', 'zeroOne', 'many'],
  ['runs.id', 'revisions.run_id', 'zeroOne', 'zeroOne'],
  ['runs.id', 'runs.retry_of', 'zeroOne', 'many'],
  ['runs.id', 'clarification_rounds.run_id', 'one', 'many'],
  ['runs.id', 'run_corrections.run_id', 'one', 'many'],
  ['runs.id', 'proposals.run_id', 'one', 'many'],
  ['runs.id', 'previews.run_id', 'one', 'many'],
  ['runs.id', 'run_artifacts.run_id', 'one', 'many'],
  ['runs.id', 'structure_suggestions.run_id', 'one', 'zeroOne'],
  ['runs.id', 'dictations.run_id', 'one', 'zeroOne'],
  ['runs.id', 'dictation_segments.run_id', 'one', 'many'],
  ['previews.id', 'proposals.preview_id', 'one', 'zeroOne', true],
]

// Раскладка: две «ступицы» — diagrams слева и runs в центре; общие потомки (chats, messages,
// revisions, previews, structure_suggestions) между ними, собственные — по краям.
// Значение — [колонка, ряд, выравнивание по вертикали внутри ряда: 0 — верх, 0.5 — центр, 1 — низ].
const GRID = {
  diagram_streams: [0, 0, 1],
  diagrams: [0, 1, 0.5],
  stream_events: [0, 2, 0],
  idempotency_keys: [0, 2, 1],
  chats: [1, 0, 1],
  messages: [1, 1, 0.5],
  revisions: [1, 2, 0],
  previews: [2, 0, 1],
  runs: [2, 1, 0.5],
  structure_suggestions: [2, 2, 0],
  proposals: [3, 0, 1],
  run_artifacts: [3, 1, 0.5],
  dictations: [3, 2, 0],
  clarification_rounds: [4, 0, 1],
  run_corrections: [4, 1, 0],
  dictation_segments: [4, 2, 0],
}
const GAP_X = 94
const GAP_Y = 58

export default async function () {
  const d = new Diagram({ title: 'ER-диаграмма schemix', subtitle: 'Логическая модель PostgreSQL 16 · нотация «воронья лапка» (IE)' })
  const tabs = {}
  for (const [name, [group, ru, cols]] of Object.entries(T)) tabs[name] = table({ name, ru, cols, hue: GROUPS[group].hue })
  // ширина колонок и высота рядов — по самым крупным таблицам
  const colW = [0, 1, 2, 3, 4].map((c) => Math.max(...Object.entries(GRID).filter(([, g]) => g[0] === c).map(([n]) => tabs[n].shape.w)))
  const rowH = [0, 1, 2].map((rr) => Math.max(...Object.entries(GRID).filter(([n, g]) => g[1] === rr && n !== 'stream_events' && n !== 'idempotency_keys').map(([n]) => tabs[n].shape.h)))
  const colX = colW.map((_, c) => colW.slice(0, c).reduce((a, b) => a + b + GAP_X, 0))
  const rowY = rowH.map((_, rr) => rowH.slice(0, rr).reduce((a, b) => a + b + GAP_Y, 0))
  for (const [name, t] of Object.entries(tabs)) {
    const [c, rr, v] = GRID[name]
    const x = colX[c] + (colW[c] - t.shape.w) / 2
    // idempotency_keys ни с чем не связана — под stream_events, чуть ниже общего ряда
    const y = name === 'idempotency_keys' ? rowY[2] + tabs.stream_events.shape.h + 34 : rowY[rr] + (rowH[rr] - t.shape.h) * v
    // Связь от родителя — уровня таблицы: из шапки (слева/справа) или с верхней/нижней грани.
    // Связь к потомку — в строку внешнего ключа (toPins ниже). У runs низ справа занят петлёй.
    const south = name === 'runs' ? [0.2, 0.3, 0.4, 0.5] : undefined
    d.node(name, t.shape, { x, y }, { sides: 'NSWE', slots: { W: [t.headAt], E: [t.headAt], S: south } })
  }
  for (const [from, to, a, b, dashed] of REL) {
    const [pt] = from.split('.'); const [ct, cc] = to.split('.')
    const at = tabs[ct].rowAt(cc)
    if (pt === ct) {
      // runs.retry_of → runs.id: петля справа внизу — из строки retry_of к нижней стороне таблицы
      d.edge(pt, ct, {
        arrow: 'none', radius: 8,
        path: ({ x, y, w, h }) => [[x + w * 0.72, y + h], [x + w * 0.72, y + h + 30], [x + w + 30, y + h + 30], [x + w + 30, y + at * h], [x + w, y + at * h]],
        markers: { start: card[a], end: card[b] },
      })
      continue
    }
    d.edge(pt, ct, {
      arrow: 'none', dashed: dashed ? '6 5' : false, radius: 8,
      toPins: [{ side: 'W', at }, { side: 'E', at }],
      markers: { start: card[a], end: card[b] },
    })
  }

  const groupSample = (g) => ({
    text: GROUPS[g].text,
    sample: (dd, x, y, w, h) => `<rect x="${r(x + 2)}" y="${r(y + 4)}" width="${w - 4}" height="${h - 8}" rx="5" fill="${GROUPS[g].hue.strong}"/>`,
  })
  d.headerRight = legend({ title: 'Группы таблиц', cols: 5, sw: 30, sh: 20, items: Object.keys(GROUPS).map(groupSample) })
  const rc = d.box('run_corrections')
  const cardLegend = legend({
    title: 'Кардинальность',
    items: [
      cardSample('one', 'ровно один'), cardSample('zeroOne', 'ноль или один'),
      cardSample('many', 'ноль или много'), cardSample('oneMany', 'один или много'),
      { text: ['ссылка без FK', 'в базе'], sample: (dd, x, y, w, h) => `<line x1="${r(x)}" y1="${r(y + h / 2)}" x2="${r(x + w)}" y2="${r(y + h / 2)}" stroke="${C.line}" stroke-width="1.6" stroke-dasharray="6 5"/>` },
    ],
  })
  d.node('legend', cardLegend, { x: rc.x + rc.w - cardLegend.w, y: rowY[1] + rowH[1] - cardLegend.h }, { pins: false })

  return d.render({ route: { buffer: 26, nudge: 10, segmentPenalty: 40, crossingPenalty: 60 } })
}
