import type { HonorsHallPayload } from '@/lib/api'
import {
  getHonorVisual,
  HONOR_CATALOG,
  type HonorTone,
  type HonorVisual,
} from '../honor-visuals'

export interface HonorsSummary {
  totalTitles: number
  totalBadges: number
  leader: HonorsHallPayload['memberHall'][number] | null
  unlockedTitleIds: Set<string>
  unlockedBadgeIds: Set<string>
  unlockedCatalogCount: number
}

export interface MemberSpotlightHonor {
  id: string
  label: string
  count: number
  lastEarnedWeekId: string | null
  source: 'title' | 'badge'
  visual: HonorVisual
  tone: HonorTone
}

export interface MemberRecentWeek {
  weekId: string
  totalScore: number
  eventCount: number
  lightCount: number
  coreCount: number
  epicCount: number
  honors: Array<{
    id: string
    label: string
  }>
}

export interface MemberProfilePayload {
  member: HonorsHallPayload['memberHall'][number]
  spotlightHonors: MemberSpotlightHonor[]
  recentWeeks: MemberRecentWeek[]
  bestWeek: MemberRecentWeek | null
  participationWeeks: number
  persona: string
  signatureTitle: HonorsHallPayload['memberHall'][number]['titleCounts'][number] | undefined
  signatureBadge: HonorsHallPayload['memberHall'][number]['badgeCounts'][number] | undefined
}

export interface HonorDetailPayload {
  visual: HonorVisual
  unlocked: boolean
  triggerWeeks: number
  recentMoments: Array<{
    weekId: string
    memberId: string
    memberNickname: string
    sources: string[]
  }>
  collectors: Array<{
    memberId: string
    memberNickname: string
    count: number
  }>
  lastWeekId: string | null
  uniqueCollectorCount: number
}

export interface HonorRaritySummaryItem {
  rarity: 'legendary' | 'epic' | 'special'
  label: string
  description: string
  count: number
  unlocked: number
  tone: HonorTone
}

export interface WeeklyHonorEntry {
  id: string
  label: string
  description: string
  memberId: string | null
  memberNickname: string | null
  tone: HonorTone
  source: 'title' | 'badge' | 'hybrid'
}

export function formatWeekLabel(weekId: string) {
  const match = weekId.match(/W\d+/i)
  return match ? match[0].toUpperCase() : weekId
}

function buildMemberPersona(input: {
  totalBadgeEarned: number
  totalTitleEarned: number
  signatureBadgeLabel?: string
  signatureTitleLabel?: string
  participationWeeks: number
}) {
  const { totalBadgeEarned, totalTitleEarned, signatureBadgeLabel, signatureTitleLabel, participationWeeks } = input

  if (totalBadgeEarned === 0 && totalTitleEarned === 0) {
    return '这位成员还在积累个人荣誉的起步阶段，只要持续参与，人物画像很快就会丰满起来。'
  }

  if (totalTitleEarned >= 4) {
    return `这位成员已经形成稳定的角色标签，「${signatureTitleLabel ?? '个人称号'}」正在成为他在家庭协作里的代表身份。`
  }

  if (totalBadgeEarned >= 5) {
    return `这位成员的个人能力更突出，「${signatureBadgeLabel ?? '代表徽章'}」已经成为最鲜明的荣誉符号。`
  }

  if (participationWeeks >= 4) {
    return '这位成员最近几周都保持活跃，虽然头衔还在积累，但已经具备比较稳定的参与节奏。'
  }

  return '这位成员正在逐步形成自己的协作风格，目前已经能看出初步的荣誉偏好和任务倾向。'
}

function getHonorCollectionCount(
  member: HonorsHallPayload['memberHall'][number],
  honorId: string,
) {
  const visual = getHonorVisual(honorId)
  const titleCount = member.titleCounts.find((item) => item.id === honorId)?.count ?? 0
  const badgeCount = member.badgeCounts.find((item) => item.id === honorId)?.count ?? 0

  if (visual.kind === 'badge') {
    return badgeCount
  }

  if (visual.kind === 'title') {
    return titleCount
  }

  return Math.max(titleCount, badgeCount)
}

export function buildHonorsSummary(hall: HonorsHallPayload): HonorsSummary {
  const unlockedTitleIds = new Set<string>()
  const unlockedBadgeIds = new Set<string>()

  for (const week of hall.weeklyHonorRolls) {
    for (const title of week.weeklyTitles) {
      unlockedTitleIds.add(title.id)
    }
  }

  for (const member of hall.memberHall) {
    for (const badge of member.badgeCounts) {
      unlockedBadgeIds.add(badge.id)
    }
  }

  return {
    totalTitles: hall.memberHall.reduce((sum, member) => sum + member.totalTitleEarned, 0),
    totalBadges: hall.memberHall.reduce((sum, member) => sum + member.totalBadgeEarned, 0),
    leader: hall.memberHall[0] ?? null,
    unlockedTitleIds,
    unlockedBadgeIds,
    unlockedCatalogCount: HONOR_CATALOG.filter((item) =>
      item.kind === 'badge'
        ? unlockedBadgeIds.has(item.id)
        : unlockedTitleIds.has(item.id) || unlockedBadgeIds.has(item.id),
    ).length,
  }
}

export function buildMemberProfilePayload(hall: HonorsHallPayload, memberId: string): MemberProfilePayload | null {
  const member = hall.memberHall.find((item) => item.memberId === memberId)
  if (!member) {
    return null
  }

  const spotlightHonors: MemberSpotlightHonor[] = [
    ...member.titleCounts.map((item) => ({
      id: item.id,
      label: item.label,
      count: item.count,
      lastEarnedWeekId: item.lastEarnedWeekId,
      source: 'title' as const,
      visual: getHonorVisual(item.id),
      tone: item.tone,
    })),
    ...member.badgeCounts.map((item) => ({
      id: item.id,
      label: item.label,
      count: item.count,
      lastEarnedWeekId: item.lastEarnedWeekId,
      source: 'badge' as const,
      visual: getHonorVisual(item.id),
      tone: item.tone,
    })),
  ].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }

    return (right.lastEarnedWeekId ?? '').localeCompare(left.lastEarnedWeekId ?? '', 'zh-CN')
  })

  const recentWeeks: MemberRecentWeek[] = hall.weeklyHonorRolls
    .map((week) => {
      const snapshot = week.memberSnapshots.find((item) => item.memberId === memberId)
      if (!snapshot) {
        return null
      }

      const weekTitles = week.weeklyTitles.filter((item) => item.memberId === memberId)
      const badgeGroup = week.memberBadges.find((item) => item.memberId === memberId)

      return {
        weekId: week.weekId,
        totalScore: snapshot.totalScore,
        eventCount: snapshot.eventCount,
        lightCount: snapshot.lightCount,
        coreCount: snapshot.coreCount,
        epicCount: snapshot.epicCount,
        honors: [
          ...weekTitles.map((item) => ({ id: item.id, label: item.title })),
          ...(badgeGroup?.badges ?? []).map((item) => ({ id: item.id, label: item.label })),
        ],
      }
    })
    .filter((item): item is MemberRecentWeek => Boolean(item))

  const bestWeek = recentWeeks.reduce<MemberRecentWeek | null>((best, current) => {
    if (!best || current.totalScore > best.totalScore) {
      return current
    }

    return best
  }, null)

  const signatureTitle = member.titleCounts[0]
  const signatureBadge = member.badgeCounts[0]

  return {
    member,
    spotlightHonors: spotlightHonors.slice(0, 6),
    recentWeeks: recentWeeks.slice(0, 6),
    bestWeek,
    participationWeeks: recentWeeks.length,
    persona: buildMemberPersona({
      totalBadgeEarned: member.totalBadgeEarned,
      totalTitleEarned: member.totalTitleEarned,
      signatureBadgeLabel: signatureBadge?.label,
      signatureTitleLabel: signatureTitle?.label,
      participationWeeks: recentWeeks.length,
    }),
    signatureTitle,
    signatureBadge,
  }
}

export function buildHonorDetailPayload(
  hall: HonorsHallPayload,
  summary: HonorsSummary,
  honorId: string,
): HonorDetailPayload {
  const visual = getHonorVisual(honorId)
  const recentMomentMap = new Map<
    string,
    {
      weekId: string
      memberId: string
      memberNickname: string
      sources: Set<string>
    }
  >()

  for (const week of hall.weeklyHonorRolls) {
    for (const title of week.weeklyTitles) {
      if (title.id !== honorId || !title.memberId || !title.memberNickname) {
        continue
      }

      const key = `${week.weekId}:${title.memberId}`
      const current = recentMomentMap.get(key) ?? {
        weekId: week.weekId,
        memberId: title.memberId,
        memberNickname: title.memberNickname,
        sources: new Set<string>(),
      }
      current.sources.add('称号')
      recentMomentMap.set(key, current)
    }

    for (const group of week.memberBadges) {
      for (const badge of group.badges) {
        if (badge.id !== honorId) {
          continue
        }

        const key = `${week.weekId}:${group.memberId}`
        const current = recentMomentMap.get(key) ?? {
          weekId: week.weekId,
          memberId: group.memberId,
          memberNickname: group.memberNickname,
          sources: new Set<string>(),
        }
        current.sources.add('徽章')
        recentMomentMap.set(key, current)
      }
    }
  }

  const recentMoments = Array.from(recentMomentMap.values()).map((item) => ({
    weekId: item.weekId,
    memberId: item.memberId,
    memberNickname: item.memberNickname,
    sources: Array.from(item.sources.values()),
  }))

  const collectors = hall.memberHall
    .map((member) => ({
      memberId: member.memberId,
      memberNickname: member.memberNickname,
      count: getHonorCollectionCount(member, honorId),
    }))
    .filter((member) => member.count > 0)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      return left.memberNickname.localeCompare(right.memberNickname, 'zh-CN')
    })

  return {
    visual,
    unlocked:
      visual.kind === 'badge'
        ? summary.unlockedBadgeIds.has(honorId)
        : summary.unlockedTitleIds.has(honorId) || summary.unlockedBadgeIds.has(honorId),
    triggerWeeks: recentMoments.length,
    recentMoments,
    collectors,
    lastWeekId: recentMoments[0]?.weekId ?? null,
    uniqueCollectorCount: collectors.length,
  }
}

export function buildHonorRaritySummary(summary: HonorsSummary): HonorRaritySummaryItem[] {
  return [
    {
      rarity: 'legendary',
      label: '传说级',
      description: '最高冲击力的头衔与高能徽章',
      count: HONOR_CATALOG.filter((item) => item.rarity === 'legendary').length,
      unlocked: HONOR_CATALOG.filter(
        (item) =>
          item.rarity === 'legendary' &&
          (item.kind === 'badge'
            ? summary.unlockedBadgeIds.has(item.id)
            : summary.unlockedTitleIds.has(item.id) || summary.unlockedBadgeIds.has(item.id)),
      ).length,
      tone: 'gold',
    },
    {
      rarity: 'epic',
      label: '史诗级',
      description: '稳定输出、全能协作与主力担当',
      count: HONOR_CATALOG.filter((item) => item.rarity === 'epic').length,
      unlocked: HONOR_CATALOG.filter(
        (item) =>
          item.rarity === 'epic' &&
          (item.kind === 'badge'
            ? summary.unlockedBadgeIds.has(item.id)
            : summary.unlockedTitleIds.has(item.id) || summary.unlockedBadgeIds.has(item.id)),
      ).length,
      tone: 'violet',
    },
    {
      rarity: 'special',
      label: '特别类',
      description: '更强调协作状态与家庭整体表现',
      count: HONOR_CATALOG.filter((item) => item.rarity === 'special' || item.rarity === 'rare').length,
      unlocked: HONOR_CATALOG.filter(
        (item) =>
          (item.rarity === 'special' || item.rarity === 'rare') &&
          (item.kind === 'badge'
            ? summary.unlockedBadgeIds.has(item.id)
            : summary.unlockedTitleIds.has(item.id) || summary.unlockedBadgeIds.has(item.id)),
      ).length,
      tone: 'teal',
    },
  ]
}

export function buildWeeklyHonorEntries(week: HonorsHallPayload['weeklyHonorRolls'][number]): WeeklyHonorEntry[] {
  const entries = new Map<string, WeeklyHonorEntry>()

  for (const title of week.weeklyTitles) {
    const key = `${title.id}:${title.memberId ?? 'family'}`
    entries.set(key, {
      id: title.id,
      label: title.title,
      description: title.description,
      memberId: title.memberId,
      memberNickname: title.memberNickname,
      tone: title.tone,
      source: 'title',
    })
  }

  for (const group of week.memberBadges) {
    for (const badge of group.badges) {
      const key = `${badge.id}:${group.memberId}`
      const current = entries.get(key)

      if (current) {
        entries.set(key, {
          ...current,
          description:
            current.description.length >= badge.description.length ? current.description : badge.description,
          source: current.source === 'title' ? 'hybrid' : current.source,
        })
        continue
      }

      entries.set(key, {
        id: badge.id,
        label: badge.label,
        description: badge.description,
        memberId: group.memberId,
        memberNickname: group.memberNickname,
        tone: badge.tone,
        source: 'badge',
      })
    }
  }

  const rarityRank = {
    legendary: 0,
    epic: 1,
    special: 2,
    rare: 3,
  } as const

  return Array.from(entries.values()).sort((left, right) => {
    const leftRank = rarityRank[getHonorVisual(left.id).rarity]
    const rightRank = rarityRank[getHonorVisual(right.id).rarity]

    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return left.label.localeCompare(right.label, 'zh-CN')
  })
}

function splitPosterLines(text: string, maxLength: number, maxLines: number) {
  const source = text.replace(/\s+/g, ' ').trim()
  if (!source) {
    return []
  }

  const lines: string[] = []
  let cursor = 0

  while (cursor < source.length && lines.length < maxLines) {
    const next = source.slice(cursor, cursor + maxLength)
    lines.push(next)
    cursor += next.length
  }

  if (cursor < source.length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(maxLength - 1, 1))}…`
  }

  return lines
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildPosterSvg(profile: MemberProfilePayload) {
  const width = 1080
  const height = 1520
  const themeVisual = getHonorVisual(profile.signatureTitle?.id ?? profile.signatureBadge?.id ?? 'weekly-champion')
  const paletteMap = {
    gold: {
      start: '#fff3c4',
      end: '#f59e0b',
      accent: '#a16207',
      soft: '#fffbeb',
      line: '#fcd34d',
    },
    violet: {
      start: '#e9ddff',
      end: '#6d5efc',
      accent: '#4338ca',
      soft: '#f5f3ff',
      line: '#c4b5fd',
    },
    teal: {
      start: '#d9fff7',
      end: '#14b8a6',
      accent: '#0f766e',
      soft: '#f0fdfa',
      line: '#5eead4',
    },
    rose: {
      start: '#ffe1ea',
      end: '#fb7185',
      accent: '#be123c',
      soft: '#fff1f2',
      line: '#fda4af',
    },
  } as const

  const palette = paletteMap[themeVisual.tone]
  const personaLines = splitPosterLines(profile.persona, 18, 3)
  const topHonors = profile.spotlightHonors.slice(0, 3)
  const recentWeeks = profile.recentWeeks.slice(0, 3)
  const bestWeekLabel = profile.bestWeek ? formatWeekLabel(profile.bestWeek.weekId) : '待刷新'
  const titleLabel = profile.signatureTitle?.label ?? '持续成长中'
  const badgeLabel = profile.signatureBadge?.label ?? '荣誉待点亮'

  const honorRows = topHonors
    .map((item, index) => {
      const y = 760 + index * 118
      return `
        <g>
          <rect x="86" y="${y}" width="908" height="92" rx="28" fill="rgba(255,255,255,0.76)" stroke="${palette.line}" stroke-opacity="0.5" />
          <circle cx="136" cy="${y + 46}" r="24" fill="${palette.soft}" stroke="${palette.line}" />
          <text x="136" y="${y + 53}" text-anchor="middle" font-size="18" font-weight="700" fill="${palette.accent}">${escapeXml(item.visual.shortLabel)}</text>
          <text x="182" y="${y + 40}" font-size="30" font-weight="700" fill="#0f172a">${escapeXml(item.label)}</text>
          <text x="182" y="${y + 70}" font-size="20" fill="#475569">累计 ${item.count} 次${item.lastEarnedWeekId ? ` · 最近 ${escapeXml(formatWeekLabel(item.lastEarnedWeekId))}` : ''}</text>
        </g>
      `
    })
    .join('')

  const weekRows = recentWeeks
    .map((item, index) => {
      const y = 1138 + index * 90
      const honorText =
        item.honors.length > 0 ? item.honors.slice(0, 2).map((honor) => honor.label).join(' · ') : '本周暂无新增荣誉'
      return `
        <g>
          <text x="96" y="${y}" font-size="24" font-weight="700" fill="#0f172a">${escapeXml(formatWeekLabel(item.weekId))}</text>
          <text x="230" y="${y}" font-size="22" fill="#334155">${item.totalScore} 分 · ${item.eventCount} 次打卡</text>
          <text x="96" y="${y + 34}" font-size="18" fill="#64748b">${escapeXml(honorText)}</text>
        </g>
      `
    })
    .join('')

  const personaText = personaLines
    .map((line, index) => `<tspan x="88" dy="${index === 0 ? 0 : 38}">${escapeXml(line)}</tspan>`)
    .join('')

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
        <linearGradient id="panel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.96)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.88)" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.16" />
        </filter>
      </defs>

      <rect width="${width}" height="${height}" rx="0" fill="#f8fafc" />
      <circle cx="920" cy="136" r="220" fill="${palette.start}" opacity="0.76" />
      <circle cx="148" cy="1328" r="180" fill="${palette.line}" opacity="0.28" />
      <rect x="42" y="42" width="996" height="1436" rx="44" fill="url(#bg)" filter="url(#shadow)" />
      <rect x="60" y="60" width="960" height="1400" rx="38" fill="url(#panel)" stroke="rgba(255,255,255,0.72)" />

      <text x="88" y="122" font-size="28" font-weight="700" fill="${palette.accent}">家庭无情裁判所 · 荣誉海报</text>
      <text x="88" y="184" font-size="88" font-weight="800" fill="#0f172a">${escapeXml(profile.member.memberNickname)}</text>
      <text x="88" y="232" font-size="30" fill="#475569">本周家庭荣誉画像 / 可分享战绩卡</text>

      <rect x="80" y="286" width="920" height="246" rx="34" fill="rgba(255,255,255,0.72)" stroke="${palette.line}" stroke-opacity="0.55" />
      <text x="88" y="338" font-size="24" font-weight="700" fill="${palette.accent}">角色画像</text>
      <text x="88" y="394" font-size="30" font-weight="700" fill="#0f172a">代表称号：${escapeXml(titleLabel)}</text>
      <text x="88" y="438" font-size="26" fill="#334155">代表徽章：${escapeXml(badgeLabel)}</text>
      <text x="88" y="490" font-size="24" fill="#475569">${personaText}</text>

      <g>
        <rect x="80" y="570" width="278" height="144" rx="30" fill="rgba(255,255,255,0.78)" stroke="${palette.line}" stroke-opacity="0.55" />
        <text x="106" y="620" font-size="22" fill="#64748b">累计称号</text>
        <text x="106" y="686" font-size="56" font-weight="800" fill="#0f172a">${profile.member.totalTitleEarned}</text>
      </g>
      <g>
        <rect x="398" y="570" width="278" height="144" rx="30" fill="rgba(255,255,255,0.78)" stroke="${palette.line}" stroke-opacity="0.55" />
        <text x="424" y="620" font-size="22" fill="#64748b">累计徽章</text>
        <text x="424" y="686" font-size="56" font-weight="800" fill="#0f172a">${profile.member.totalBadgeEarned}</text>
      </g>
      <g>
        <rect x="716" y="570" width="284" height="144" rx="30" fill="rgba(255,255,255,0.78)" stroke="${palette.line}" stroke-opacity="0.55" />
        <text x="742" y="620" font-size="22" fill="#64748b">最佳高光周</text>
        <text x="742" y="674" font-size="36" font-weight="800" fill="#0f172a">${escapeXml(bestWeekLabel)}</text>
        <text x="742" y="704" font-size="22" fill="#475569">${profile.bestWeek ? `${profile.bestWeek.totalScore} 分 / ${profile.bestWeek.eventCount} 次` : '等待更多数据'}</text>
      </g>

      <text x="88" y="744" font-size="30" font-weight="800" fill="#0f172a">高光荣誉</text>
      ${honorRows || ''}

      <rect x="80" y="1090" width="920" height="288" rx="34" fill="rgba(255,255,255,0.72)" stroke="${palette.line}" stroke-opacity="0.55" />
      <text x="88" y="1140" font-size="30" font-weight="800" fill="#0f172a">近期表现</text>
      ${weekRows || ''}

      <text x="88" y="1430" font-size="20" fill="#475569">系统自动生成 · 适合比赛展示 / 社群分享 / 成员荣誉存档</text>
    </svg>
  `
}

export function buildWeeklyFamilyPosterSvg(week: HonorsHallPayload['weeklyHonorRolls'][number]) {
  const width = 1080
  const height = 1520
  const titles = week.weeklyTitles.slice(0, 4)
  const badges = week.memberBadges.filter((item) => item.badges.length > 0).slice(0, 4)
  const highlightVisual = getHonorVisual(week.weeklyTitles[0]?.id ?? badges[0]?.badges[0]?.id ?? 'weekly-champion')

  const paletteMap = {
    gold: {
      start: '#fff6d9',
      end: '#f59e0b',
      accent: '#a16207',
      soft: '#fffbeb',
      line: '#fcd34d',
    },
    violet: {
      start: '#efe8ff',
      end: '#6d5efc',
      accent: '#4338ca',
      soft: '#f5f3ff',
      line: '#c4b5fd',
    },
    teal: {
      start: '#e3fff9',
      end: '#14b8a6',
      accent: '#0f766e',
      soft: '#f0fdfa',
      line: '#5eead4',
    },
    rose: {
      start: '#fff1f5',
      end: '#fb7185',
      accent: '#be123c',
      soft: '#fff1f2',
      line: '#fda4af',
    },
  } as const

  const palette = paletteMap[highlightVisual.tone]

  const titleRows = titles
    .map((item, index) => {
      const y = 620 + index * 96
      return `
        <g>
          <rect x="86" y="${y}" width="908" height="74" rx="24" fill="rgba(255,255,255,0.76)" stroke="${palette.line}" stroke-opacity="0.5" />
          <text x="118" y="${y + 31}" font-size="18" fill="#64748b">${escapeXml(item.memberNickname ?? '全家协作')}</text>
          <text x="118" y="${y + 58}" font-size="28" font-weight="700" fill="#0f172a">${escapeXml(item.title)}</text>
          <text x="732" y="${y + 46}" font-size="18" fill="#475569">${escapeXml(item.description)}</text>
        </g>
      `
    })
    .join('')

  const badgeRows = badges
    .map((item, index) => {
      const y = 1088 + index * 88
      const badgeText = item.badges.map((badge) => badge.label).join(' · ')
      return `
        <g>
          <rect x="86" y="${y}" width="908" height="68" rx="24" fill="rgba(255,255,255,0.76)" stroke="${palette.line}" stroke-opacity="0.5" />
          <text x="118" y="${y + 28}" font-size="18" fill="#64748b">${escapeXml(item.memberNickname)}</text>
          <text x="118" y="${y + 52}" font-size="24" font-weight="700" fill="#0f172a">${escapeXml(badgeText)}</text>
        </g>
      `
    })
    .join('')

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.16" />
        </filter>
      </defs>

      <rect width="${width}" height="${height}" fill="#f8fafc" />
      <circle cx="924" cy="136" r="220" fill="${palette.start}" opacity="0.8" />
      <circle cx="154" cy="1316" r="180" fill="${palette.line}" opacity="0.26" />
      <rect x="42" y="42" width="996" height="1436" rx="44" fill="url(#bg)" filter="url(#shadow)" />
      <rect x="60" y="60" width="960" height="1400" rx="38" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.72)" />

      <text x="88" y="122" font-size="28" font-weight="700" fill="${palette.accent}">家庭无情裁判所 · 本周荣誉海报</text>
      <text x="88" y="184" font-size="82" font-weight="800" fill="#0f172a">${escapeXml(formatWeekLabel(week.weekId))}</text>
      <text x="88" y="232" font-size="30" fill="#475569">家庭整周荣誉总结 / 可直接分享至群聊或比赛展示</text>

      <g>
        <rect x="80" y="292" width="278" height="138" rx="30" fill="rgba(255,255,255,0.76)" stroke="${palette.line}" stroke-opacity="0.55" />
        <text x="108" y="338" font-size="22" fill="#64748b">总积分</text>
        <text x="108" y="394" font-size="54" font-weight="800" fill="#0f172a">${week.totalScore}</text>
      </g>
      <g>
        <rect x="398" y="292" width="278" height="138" rx="30" fill="rgba(255,255,255,0.76)" stroke="${palette.line}" stroke-opacity="0.55" />
        <text x="426" y="338" font-size="22" fill="#64748b">总打卡</text>
        <text x="426" y="394" font-size="54" font-weight="800" fill="#0f172a">${week.totalEvents}</text>
      </g>
      <g>
        <rect x="716" y="292" width="284" height="138" rx="30" fill="rgba(255,255,255,0.76)" stroke="${palette.line}" stroke-opacity="0.55" />
        <text x="744" y="338" font-size="22" fill="#64748b">本周领先</text>
        <text x="744" y="392" font-size="32" font-weight="800" fill="#0f172a">${escapeXml(week.leaderNickname ?? '暂无')}</text>
      </g>

      <text x="88" y="510" font-size="30" font-weight="800" fill="#0f172a">本周称号</text>
      ${titleRows || '<text x="88" y="562" font-size="24" fill="#64748b">本周暂无称号记录</text>'}

      <text x="88" y="980" font-size="30" font-weight="800" fill="#0f172a">本周成员徽章</text>
      ${badgeRows || '<text x="88" y="1032" font-size="24" fill="#64748b">本周暂无成员徽章记录</text>'}

      <text x="88" y="1430" font-size="20" fill="#475569">系统自动生成 · 适合周度汇报 / 荣誉归档 / 比赛展示材料</text>
    </svg>
  `
}
