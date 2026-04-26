import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Award,
  Crown,
  Gem,
  HandHelping,
  ShieldCheck,
  Sparkles,
  Swords,
  TimerReset,
  Trophy,
  Zap,
} from 'lucide-react'

export type HonorTone = 'gold' | 'violet' | 'teal' | 'rose'
export type HonorRarity = 'legendary' | 'epic' | 'rare' | 'special'

export type HonorVisual = {
  id: string
  icon: LucideIcon
  emblem: string
  rarity: HonorRarity
  shortLabel: string
  tone: HonorTone
  label: string
  kind: 'title' | 'badge' | 'hybrid'
  condition: string
  flavor: string
}

export const HONOR_CATALOG: HonorVisual[] = [
  {
    id: 'weekly-champion',
    icon: Crown,
    emblem: '01',
    rarity: 'legendary',
    shortLabel: '周冠',
    tone: 'gold',
    label: '本周冠军',
    kind: 'hybrid',
    condition: '单周总积分排名第一时解锁。',
    flavor: '属于一周家务赛场上的头号输出位，是最直观的周度荣誉。',
  },
  {
    id: 'attendance-leader',
    icon: Trophy,
    emblem: '02',
    rarity: 'epic',
    shortLabel: '劳模',
    tone: 'teal',
    label: '打卡劳模',
    kind: 'hybrid',
    condition: '单周打卡次数排名第一时解锁。',
    flavor: '强调参与频率和稳定性，适合鼓励持续出勤。',
  },
  {
    id: 'light-task-king',
    icon: Sparkles,
    emblem: '03',
    rarity: 'epic',
    shortLabel: '随手',
    tone: 'violet',
    label: '随手活之王',
    kind: 'hybrid',
    condition: '单周 +1 随手活完成次数最多时解锁。',
    flavor: '零碎事务清理专家，适合突出“家务微贡献”的价值。',
  },
  {
    id: 'core-task-ace',
    icon: Swords,
    emblem: '04',
    rarity: 'legendary',
    shortLabel: '主力',
    tone: 'rose',
    label: '主力担当',
    kind: 'hybrid',
    condition: '单周主力活与硬仗完成次数综合最高时解锁。',
    flavor: '代表高分任务的核心承担者，是重活担当型荣誉。',
  },
  {
    id: 'team-balance-status',
    icon: ShieldCheck,
    emblem: '05',
    rarity: 'special',
    shortLabel: '协作',
    tone: 'teal',
    label: '分工协作在线',
    kind: 'title',
    condition: '系统依据公平度评分自动颁发给当周家庭整体状态。',
    flavor: '不是个人奖，而是家庭协作状态的系统认证。',
  },
  {
    id: 'steady-participant',
    icon: Activity,
    emblem: '06',
    rarity: 'rare',
    shortLabel: '稳定',
    tone: 'teal',
    label: '稳定出勤',
    kind: 'badge',
    condition: '单周完成至少 2 次有效打卡时解锁。',
    flavor: '强调稳定参与，是最容易形成正反馈的基础徽章。',
  },
  {
    id: 'all-round-helper',
    icon: Gem,
    emblem: '07',
    rarity: 'epic',
    shortLabel: '全能',
    tone: 'violet',
    label: '全能协作',
    kind: 'badge',
    condition: '单周同时完成随手活和主力活时解锁。',
    flavor: '代表任务覆盖面广，能接不同类型的家务。',
  },
  {
    id: 'high-efficiency',
    icon: Zap,
    emblem: '08',
    rarity: 'legendary',
    shortLabel: '高能',
    tone: 'gold',
    label: '高能输出',
    kind: 'badge',
    condition: '单周平均每次打卡得分达到较高阈值时解锁。',
    flavor: '强调单次效率，是少打卡但贡献高的荣誉表达。',
  },
  {
    id: 'waiting-for-records',
    icon: TimerReset,
    emblem: '00',
    rarity: 'special',
    shortLabel: '待启',
    tone: 'teal',
    label: '待开赛',
    kind: 'title',
    condition: '当前周暂无有效打卡时显示。',
    flavor: '用于提示系统已就绪，只差真实数据开始沉淀。',
  },
]

const honorVisualMap = new Map(HONOR_CATALOG.map((item) => [item.id, item] as const))

export function getHonorVisual(id: string): HonorVisual {
  return (
    honorVisualMap.get(id) ?? {
      id,
      icon: Award,
      emblem: 'HX',
      rarity: 'rare',
      shortLabel: '荣誉',
      tone: 'violet',
      label: '荣誉',
      kind: 'badge',
      condition: '系统自动生成。',
      flavor: '一项尚未录入图鉴说明的荣誉。',
    }
  )
}

export function getHonorToneClass(tone: HonorTone) {
  return `is-${tone}`
}

export function getHonorRarityLabel(rarity: HonorRarity) {
  if (rarity === 'legendary') {
    return '传说级'
  }

  if (rarity === 'epic') {
    return '史诗级'
  }

  if (rarity === 'special') {
    return '特别奖'
  }

  return '稀有级'
}

export function getHonorKindLabel(kind: HonorVisual['kind']) {
  if (kind === 'title') {
    return '称号'
  }

  if (kind === 'hybrid') {
    return '称号 / 徽章'
  }

  return '徽章'
}

export function getHonorEmptyIcon() {
  return HandHelping
}
