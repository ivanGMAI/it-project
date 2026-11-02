// Контекстная диаграмма (DFD уровня 0, нотация Гейна–Сарсона): система — один процесс «0»,
// вокруг внешние сущности и потоки данных. Лист A4 альбомный.
import { Diagram } from '../../tools/lib/kit.mjs'
import { process, external, legend } from '../../tools/lib/shapes.mjs'
import { samples } from '../../tools/lib/samples.mjs'
import { HUE } from '../../tools/lib/theme.mjs'

export default async function () {
  const d = new Diagram({ title: 'Контекстная диаграмма schemix', subtitle: 'DFD уровня 0 · нотация Гейна–Сарсона' })

  d.node('sys', process({ num: 0, title: 'schemix', lines: ['ИИ-ассистент построения', 'BPMN-схем по описанию процесса'], minW: 300 }), { cx: 0, cy: 0 })
  d.node('analyst', external({ title: 'Аналитик', lines: ['бизнес-аналитик,', 'методолог'], hue: HUE.violet, minW: 190 }), { cx: -560, cy: 0 })
  d.node('llm', external({ title: ['Провайдер', 'языковой модели'], lines: ['OpenAI-совместимый API'], minW: 230 }), { cx: 470, cy: -215 })
  d.node('stt', external({ title: ['Сервис', 'распознавания речи'], lines: ['/audio/transcriptions'], minW: 230 }), { cx: 500, cy: 0 })
  d.node('ext', external({ title: ['Внешние системы', 'моделирования'], lines: ['bpmn.io, Camunda, Sila Union'], minW: 230 }), { cx: 470, cy: 215 })

  const list = { labelAlign: 'start' }
  d.edge('analyst', 'sys', { ...list, fromSide: 'E', fromC: -26, toSide: 'W', toC: -26, labelPlace: 'N',
    label: ['• описание процесса: текст,', '  .docx, .pdf, голос', '• файл BPMN для импорта', '• ручные правки схемы', '• ответы на вопросы, решения'] })
  d.edge('sys', 'analyst', { ...list, fromSide: 'W', fromC: 26, toSide: 'E', toC: 26, labelPlace: 'S',
    label: ['• BPMN-схема и история ревизий', '• вопросы с вариантами ответа', '• предложения с рисками', '• замечания нормоконтроля', '• файлы BPMN, SVG, MD, DOCX, EPC'] })
  d.edge('sys', 'llm', { fromSide: 'N', fromAt: 0.62, toSide: 'W', toAt: 0.32, label: ['текст, роль', 'и JSON-схема'] })
  d.edge('llm', 'sys', { fromSide: 'W', fromAt: 0.72, toSide: 'N', toAt: 0.82, label: ['факты', 'с цитатами'] })
  d.edge('sys', 'stt', { fromSide: 'E', fromC: -20, toSide: 'W', toC: -20, label: 'аудио фразы' })
  d.edge('stt', 'sys', { fromSide: 'W', fromC: 20, toSide: 'E', toC: 20, label: 'текст фразы' })
  d.edge('sys', 'ext', { fromSide: 'S', fromAt: 0.75, toSide: 'W', label: ['BPMN 2.0 XML,', 'EPC (XML)'] })

  d.node('legend', legend({ items: [samples.process, samples.external, samples.flow] }), { cx: -470, cy: 245 }, { pins: false })

  return d.render({ route: { buffer: 18, nudge: 16 } })
}
