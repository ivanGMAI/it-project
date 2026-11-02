// Общий стиль всех диаграмм: палитра, шрифты, толщины линий.
// Цвета подобраны так, чтобы текст на заливке давал контраст не ниже 4,5:1 (WCAG AA),
// а заливки различались и в оттенках серого при чёрно-белой печати.
import { SANS, MONO } from './fonts.mjs'

export const F = (size, weight = 400, family = SANS, spacing = 0) => ({ size, weight, family, spacing })

export const FONT = {
  title: F(30, 700),
  subtitle: F(16, 400),
  nodeTitle: F(16.5, 600),
  nodeTitleL: F(18, 700),
  body: F(15, 400),
  bodyM: F(15, 500),
  small: F(13.5, 400),
  tag: F(13, 500),
  label: F(14, 500),
  labelTech: F(13, 400),
  num: F(15, 700),
  mono: F(13.5, 400, MONO),
  monoB: F(13.5, 700, MONO),
  legendTitle: F(14, 600),
  legend: F(13.5, 400),
}

export const C = {
  ink: '#0f172a',
  text: '#1e293b',
  muted: '#475569',
  faint: '#64748b',
  hair: '#cbd5e1',
  line: '#475569',
  bg: '#ffffff',
  panel: '#f8fafc',
}

// Семейства цветов: fill — заливка, soft — плашка/заголовок, stroke — рамка, strong — акцент
// (белый текст на нём читается), ink — тёмный текст на fill/soft.
export const HUE = {
  blue: { shade: '#93c5fd', fill: '#eff6ff', soft: '#dbeafe', stroke: '#3b82f6', strong: '#1d4ed8', ink: '#1e3a8a' },
  teal: { shade: '#5eead4', fill: '#f0fdfa', soft: '#ccfbf1', stroke: '#14b8a6', strong: '#0f766e', ink: '#134e4a' },
  green: { shade: '#86efac', fill: '#f0fdf4', soft: '#dcfce7', stroke: '#22c55e', strong: '#15803d', ink: '#14532d' },
  violet: { shade: '#c4b5fd', fill: '#f5f3ff', soft: '#ede9fe', stroke: '#8b5cf6', strong: '#6d28d9', ink: '#4c1d95' },
  amber: { shade: '#fcd34d', fill: '#fffbeb', soft: '#fef3c7', stroke: '#f59e0b', strong: '#b45309', ink: '#78350f' },
  orange: { shade: '#fdba74', fill: '#fff7ed', soft: '#ffedd5', stroke: '#f97316', strong: '#c2410c', ink: '#7c2d12' },
  rose: { shade: '#fda4af', fill: '#fff1f2', soft: '#ffe4e6', stroke: '#f43f5e', strong: '#be123c', ink: '#881337' },
  slate: { shade: '#cbd5e1', fill: '#f8fafc', soft: '#e2e8f0', stroke: '#94a3b8', strong: '#475569', ink: '#1e293b' },
}

// C4: оттенки синего по уровням, внешние системы — серые. Темнее стандартных цветов C4,
// чтобы белый текст читался (контраст ≥ 4,5:1).
export const C4 = {
  person: { fill: '#0b3d6e', stroke: '#072b4f', text: '#ffffff', sub: '#c7dcf2' },
  system: { fill: '#11589e', stroke: '#0b437b', text: '#ffffff', sub: '#dce8f6' },
  container: { fill: '#1866b4', stroke: '#125496', text: '#ffffff', sub: '#e6f0fb' },
  component: { fill: '#dbeafe', stroke: '#60a5fa', text: '#0b3d6e', sub: '#1e4f86' },
  external: { fill: '#5b6472', stroke: '#454c57', text: '#ffffff', sub: '#e2e5ea' },
}

export const STROKE = { node: 1.6, line: 1.6, thin: 1.2 }
