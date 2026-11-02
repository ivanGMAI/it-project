// C4, уровень 1 — контекст системы: кто пользуется schemix и с какими внешними системами она
// связана. Лист A4 альбомный.
import { Diagram } from '../../tools/lib/kit.mjs'
import { c4box, c4person, legend } from '../../tools/lib/shapes.mjs'
import { samples } from '../../tools/lib/samples.mjs'

export default async function () {
  const d = new Diagram({ title: 'C4 · Уровень 1. Контекст системы schemix', subtitle: 'System Context diagram' })

  d.node('analyst', c4person({ name: 'Аналитик', type: '[Person]', desc: ['Описывает процесс текстом или голосом,', 'правит схему, выгружает файл'] }), { cx: 0, cy: 0 })
  d.node('schemix', c4box({ kind: 'system', name: 'schemix', type: '[Software System]', desc: ['Строит BPMN 2.0 по описанию процесса,', 'задаёт уточняющие вопросы,', 'хранит ревизии и историю'] }), { cx: 0, cy: 330 })
  d.node('llm', c4box({ kind: 'external', name: 'Провайдер языковой модели', type: '[Software System, внешняя]', desc: ['OpenAI-совместимый chat/completions:', 'DeepSeek V4.1 Flash, Qwen3.6', 'в Yandex Cloud'] }), { cx: -390, cy: 640 })
  d.node('stt', c4box({ kind: 'external', name: 'Сервис распознавания речи', type: '[Software System, внешняя]', desc: ['OpenAI-совместимый', '/audio/transcriptions'] }), { cx: 390, cy: 640 })
  d.node('ext', c4box({ kind: 'external', name: 'BPMN-редакторы и Sila Union', type: '[Software System, внешняя]', desc: ['bpmn.io, Camunda Modeler,', 'система моделирования', 'архитектуры'] }), { cx: 640, cy: 330 })

  const rel = { dashed: true }
  d.edge('analyst', 'schemix', { ...rel, fromSide: 'S', toSide: 'N', label: ['описывает процесс, правит схему,', 'отвечает на вопросы', '[HTTPS, WebSocket]'] })
  d.edge('schemix', 'llm', { ...rel, fromSide: 'W', toSide: 'N', label: ['извлекает факты по JSON-схеме', '[HTTPS, JSON]'] })
  d.edge('schemix', 'stt', { ...rel, fromSide: 'E', toSide: 'N', label: ['распознаёт фразы диктовки', '[HTTPS, WAV]'] })
  d.edge('analyst', 'ext', { ...rel, fromSide: 'E', toSide: 'N', label: ['открывает выгруженные', 'BPMN 2.0 и EPC'] })

  d.node('legend', legend({ items: [samples.c4('person', 'человек'), samples.c4('system', 'проектируемая система'), samples.c4('external', 'внешняя система'), samples.rel] }), { cx: -560, cy: 120 }, { pins: false })

  return d.render({ route: { buffer: 20, nudge: 16 } })
}
