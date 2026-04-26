import type { LucideIcon } from 'lucide-react'
import { Hammer, Hand, Wrench } from 'lucide-react'
import type { TaskType } from '../../lib/api'

export const typeMeta: Record<
  TaskType,
  {
    label: string
    shortLabel: string
    accentClass: string
    kicker: string
    points: string
    icon: LucideIcon
  }
> = {
  LIGHT: {
    label: '随手活',
    shortLabel: '随手',
    accentClass: 'is-light',
    kicker: '轻量家务',
    points: '+1',
    icon: Hand,
  },
  CORE: {
    label: '主力活',
    shortLabel: '主力',
    accentClass: 'is-core',
    kicker: '核心家务',
    points: '+3',
    icon: Wrench,
  },
  EPIC: {
    label: '硬仗',
    shortLabel: '硬仗',
    accentClass: 'is-epic',
    kicker: '高强度任务',
    points: '+5',
    icon: Hammer,
  },
}

export const memberPalette: Record<
  string,
  { accent: string; accentSoft: string; accentRing: string; accentText: string; badge: string }
> = {
  'archive-blue': {
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.14)',
    accentRing: 'rgba(96, 165, 250, 0.24)',
    accentText: '#3b82f6',
    badge: 'rgba(96, 165, 250, 0.2)',
  },
  'violet-iris': {
    accent: '#8b5cf6',
    accentSoft: 'rgba(139, 92, 246, 0.14)',
    accentRing: 'rgba(139, 92, 246, 0.24)',
    accentText: '#8b5cf6',
    badge: 'rgba(139, 92, 246, 0.2)',
  },
  'moss-green': {
    accent: '#16c784',
    accentSoft: 'rgba(22, 199, 132, 0.14)',
    accentRing: 'rgba(22, 199, 132, 0.24)',
    accentText: '#10b981',
    badge: 'rgba(22, 199, 132, 0.18)',
  },
  'mint-teal': {
    accent: '#2dd4bf',
    accentSoft: 'rgba(45, 212, 191, 0.14)',
    accentRing: 'rgba(45, 212, 191, 0.24)',
    accentText: '#14b8a6',
    badge: 'rgba(45, 212, 191, 0.18)',
  },
  'gold-amber': {
    accent: '#ffb100',
    accentSoft: 'rgba(255, 177, 0, 0.14)',
    accentRing: 'rgba(255, 177, 0, 0.22)',
    accentText: '#ff9800',
    badge: 'rgba(255, 196, 70, 0.22)',
  },
  'sunset-orange': {
    accent: '#fb923c',
    accentSoft: 'rgba(251, 146, 60, 0.14)',
    accentRing: 'rgba(251, 146, 60, 0.24)',
    accentText: '#f97316',
    badge: 'rgba(251, 146, 60, 0.2)',
  },
  'verdict-red': {
    accent: '#ff5f7c',
    accentSoft: 'rgba(255, 95, 124, 0.14)',
    accentRing: 'rgba(255, 95, 124, 0.24)',
    accentText: '#ff3366',
    badge: 'rgba(255, 95, 124, 0.18)',
  },
  'rose-pink': {
    accent: '#f472b6',
    accentSoft: 'rgba(244, 114, 182, 0.14)',
    accentRing: 'rgba(244, 114, 182, 0.24)',
    accentText: '#ec4899',
    badge: 'rgba(244, 114, 182, 0.18)',
  },
  'slate-indigo': {
    accent: '#818cf8',
    accentSoft: 'rgba(129, 140, 248, 0.14)',
    accentRing: 'rgba(129, 140, 248, 0.24)',
    accentText: '#6366f1',
    badge: 'rgba(129, 140, 248, 0.18)',
  },
  'lime-pop': {
    accent: '#84cc16',
    accentSoft: 'rgba(132, 204, 22, 0.14)',
    accentRing: 'rgba(132, 204, 22, 0.24)',
    accentText: '#65a30d',
    badge: 'rgba(132, 204, 22, 0.18)',
  },
}

export function getMemberPalette(cardColor: string) {
  return memberPalette[cardColor] ?? memberPalette['archive-blue']
}

export function formatClock() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).format(new Date())
}

export function formatWeekRange(date = new Date()) {
  const current = new Date(date)
  const day = current.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(current)
  start.setDate(current.getDate() + mondayOffset)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const format = (value: Date) =>
    `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}`

  return `本周 ${format(start)}-${format(end)}`
}

export function formatLogTime(isoString: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}
