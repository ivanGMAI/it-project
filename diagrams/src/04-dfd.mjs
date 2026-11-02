// DFD уровня 1 (нотация Гейна–Сарсона): процесс 0 контекстной диаграммы разложен на семь
// процессов. Скруглённый прямоугольник с номером — процесс, открытый прямоугольник с ячейкой D —
// хранилище, прямоугольник с тенью — внешняя сущность (косая черта в углу — её копия),
// стрелка — поток данных. Лист A3 альбомный.
import { Diagram } from '../../tools/lib/kit.mjs'
import { process, store, external, legend } from '../../tools/lib/shapes.mjs'
import { samples } from '../../tools/lib/samples.mjs'
import { HUE } from '../../tools/lib/theme.mjs'

export default async function () {
  const d = new Diagram({ title: 'Диаграмма потоков данных schemix', subtitle: 'DFD уровня 1 · нотация Гейна–Сарсона' })
  const X = [0, 330, 670, 1010, 1345, 1670]
  const Y = [0, 200, 410, 640, 870]
  const at = (c, r) => ({ cx: X[c], cy: Y[r] })

  // внешние сущности
  d.node('analyst', external({ title: 'Аналитик', lines: ['описывает процесс,', 'выгружает схему'], hue: HUE.violet, minW: 170 }), { cx: X[0] - 30, cy: (Y[1] + Y[3]) / 2 }, { h: 230 })
  d.node('analyst2', external({ title: 'Аналитик', lines: ['отвечает на вопросы, правит схему, получает результат'], hue: HUE.violet, dup: true }), { cx: (X[3] + X[5]) / 2, cy: Y[4] + 10 }, { w: X[5] - X[3] + 200 })
  d.node('stt', external({ title: ['Сервис', 'распознавания речи'] }), at(1, 0))
  d.node('llm', external({ title: ['Провайдер', 'языковой модели'] }), at(3, 0))
  d.node('ext', external({ title: ['Внешние системы', 'моделирования'], lines: ['bpmn.io, Camunda, Sila Union'] }), { cx: X[1], cy: Y[4] + 10 })

  // процессы
  d.node('p1', process({ num: 1, lines: ['Принять описание', 'процесса'] }), at(1, 1))
  d.node('p2', process({ num: 2, lines: ['Извлечь факты', 'ролями агента'] }), at(3, 1))
  d.node('p3', process({ num: 3, lines: ['Собрать ChangeSet', 'и проверить схему'] }), at(4, 1))
  d.node('p4', process({ num: 4, lines: ['Уточнить', 'и подтвердить'] }), at(4, 3))
  d.node('p5', process({ num: 5, lines: ['Записать', 'ревизию'] }), at(3, 3))
  d.node('p6', process({ num: 6, lines: ['Выгрузить и проверить', 'оформление'] }), at(1, 3))
  d.node('p7', process({ num: 7, lines: ['Транслировать', 'события'] }), at(5, 3))

  // хранилища
  d.node('d1', store({ id: 'D1', lines: ['Диаграммы и ревизии'] }), at(3, 2))
  d.node('d2', store({ id: 'D2', lines: ['Чаты и сообщения'] }), at(1, 2))
  d.node('d3', store({ id: 'D3', lines: ['Запросы агенту', 'и артефакты ролей'] }), at(2, 1))
  d.node('d4', store({ id: 'D4', lines: ['Уточнения, предложения,', 'предпросмотры'] }), at(4, 2))
  d.node('d5', store({ id: 'D5', lines: ['Журнал событий', 'диаграммы'] }), at(5, 2))

  // потоки
  d.edge('analyst', 'p1', { fromSide: 'E', toSide: 'W', label: ['описание: текст,', 'файл, голос'] })
  d.edge('p1', 'stt', { label: 'аудио фразы' })
  d.edge('stt', 'p1', { label: 'текст фразы' })
  d.edge('p1', 'd2', { label: 'сообщение' })
  d.edge('p1', 'd3', { label: 'новый запрос' })

  d.edge('d3', 'p2', { label: ['запрос', 'из очереди'] })
  d.edge('p2', 'd3', { label: ['артефакты', 'ролей'] })
  d.edge('d1', 'p2', { label: 'граф схемы' })
  d.edge('p2', 'llm', { label: ['роль,', 'JSON-схема'] })
  d.edge('llm', 'p2', { label: ['факты', 'с цитатами'] })
  d.edge('p2', 'p3', { label: 'факты' })

  d.edge('d1', 'p3', { label: 'XML ревизии' })
  d.edge('p3', 'd5', { label: ['этапы,', 'черновик'] })
  d.edge('p3', 'd4', { label: ['вопросы,', 'предложение'] })
  d.edge('p3', 'p5', { label: ['безопасная', 'правка'] })

  d.edge('d4', 'p4', { label: ['вопросы,', 'предложение'] })
  d.edge('analyst2', 'p4', { fromSide: 'N', fromC: X[4] + 25, toSide: 'S', toC: X[4] + 25, label: ['ответы, решение,', 'правка'] })
  d.edge('p4', 'analyst2', { fromSide: 'S', fromC: X[4] - 25, toSide: 'N', toC: X[4] - 25, label: ['вопросы,', 'риски'] })
  d.edge('p4', 'd3', { label: 'ответы' })
  d.edge('p4', 'p5', { label: ['подтверждённая', 'правка'] })

  d.edge('analyst2', 'p5', { fromSide: 'N', fromC: X[3], toSide: 'S', toC: X[3], label: ['ручная правка,', 'импорт, возврат'] })
  d.edge('d1', 'p5', { label: ['текущая', 'ревизия'] })
  d.edge('p5', 'd1', { label: ['новая', 'ревизия'] })
  d.edge('p5', 'd5', { label: 'revision.committed' })

  d.edge('d5', 'p7', { label: 'события' })
  d.edge('p7', 'analyst2', { label: ['прогресс, черновик,', 'ревизии'] })

  d.edge('analyst', 'p6', { fromSide: 'E', toSide: 'W', label: ['формат', 'выгрузки'] })
  d.edge('d1', 'p6', { label: 'XML ревизии' })
  d.edge('p6', 'analyst2', { label: ['файлы,', 'замечания'] })
  d.edge('p6', 'ext', { label: ['BPMN 2.0,', 'EPC'] })

  d.node('legend', legend({ items: [samples.process, samples.store, samples.external, samples.externalDup, samples.flow], cols: 1 }), { cx: X[5] + 40, cy: Y[0] + 30 }, { pins: false })

  return d.render({ route: { buffer: 16, nudge: 14, crossingPenalty: 200 } })
}
