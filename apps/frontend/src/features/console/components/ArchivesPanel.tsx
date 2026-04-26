import { useEffect, useMemo, useState } from 'react'
import { Copy, LoaderCircle, ScrollText } from 'lucide-react'
import { useTribunal } from '@/app/use-tribunal'
import type { AnalyticsOverviewPayload, BootstrapPayload } from '@/lib/api'
import { getHonorRarityLabel, getHonorToneClass, getHonorVisual } from './honor-visuals'

interface ArchivesPanelProps {
  bootstrap: BootstrapPayload | null
}

function parseWeekId(weekId: string) {
  const match = /^(?<year>\d{4})-W(?<week>\d{2})$/.exec(weekId)

  if (!match?.groups) {
    return null
  }

  return {
    year: Number(match.groups.year),
    week: Number(match.groups.week),
  }
}

function getWeekStartDate(weekId: string) {
  const parsed = parseWeekId(weekId)

  if (!parsed) {
    return null
  }

  const januaryFourth = new Date(Date.UTC(parsed.year, 0, 4))
  const day = januaryFourth.getUTCDay() || 7
  const monday = new Date(januaryFourth)

  monday.setUTCDate(januaryFourth.getUTCDate() - day + 1 + (parsed.week - 1) * 7)
  return monday
}

function getWeekIdFromUtcDate(date: Date) {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = normalized.getUTCDay() || 7

  normalized.setUTCDate(normalized.getUTCDate() + 4 - day)

  const isoYear = normalized.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const week = Math.ceil(((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

function shiftWeekId(weekId: string, deltaWeeks: number) {
  const weekStart = getWeekStartDate(weekId)

  if (!weekStart) {
    return weekId
  }

  weekStart.setUTCDate(weekStart.getUTCDate() + deltaWeeks * 7)
  return getWeekIdFromUtcDate(weekStart)
}

function buildRecentWeekIds(referenceWeekId: string, count: number) {
  return Array.from({ length: count }, (_, index) => shiftWeekId(referenceWeekId, -index))
}

function formatWeekLabel(weekId: string) {
  const match = weekId.match(/W\d+/i)
  return match ? match[0].toUpperCase() : weekId
}

function buildWeeklyReportText(overview: AnalyticsOverviewPayload) {
  const report = overview.weeklyReport
  const titleLines = overview.achievements.weeklyTitles.map((item, index) => {
    const owner = item.memberNickname ? `${item.memberNickname} · ` : ''
    return `${index + 1}. ${owner}${item.title}：${item.description}`
  })
  const badgeLines = overview.achievements.memberBadges
    .filter((item) => item.badges.length > 0)
    .map((item) => `${item.memberNickname}：${item.badges.map((badge) => badge.label).join('、')}`)

  return [
    report.title,
    report.headline,
    '',
    report.summary,
    '',
    '本周重点：',
    ...report.highlights.map((item, index) => `${index + 1}. ${item}`),
    '',
    '本周称号：',
    ...titleLines,
    '',
    '成员徽章：',
    ...(badgeLines.length > 0 ? badgeLines : ['暂无已点亮徽章']),
    '',
    report.closing,
  ].join('\n')
}

export function ArchivesPanel({ bootstrap }: ArchivesPanelProps) {
  const { getAnalyticsOverview } = useTribunal()
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [overview, setOverview] = useState<AnalyticsOverviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const weekOptions = useMemo(() => {
    if (!bootstrap?.family.currentWeekId) {
      return []
    }

    return buildRecentWeekIds(bootstrap.family.currentWeekId, 12)
  }, [bootstrap])

  useEffect(() => {
    if (!selectedWeekId && weekOptions.length > 0) {
      setSelectedWeekId(weekOptions[0])
    }
  }, [selectedWeekId, weekOptions])

  useEffect(() => {
    if (!selectedWeekId) {
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setCopied(false)

      try {
        const payload = await getAnalyticsOverview('1w', selectedWeekId ?? undefined)
        if (!cancelled) {
          setOverview(payload)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '周报加载失败。')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [getAnalyticsOverview, selectedWeekId])

  async function handleCopy() {
    if (!overview) {
      return
    }

    try {
      await navigator.clipboard.writeText(buildWeeklyReportText(overview))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="console-page-stack">
      <section className="console-analytics-toolbar">
        <div className="console-analytics-toolbar__copy">
          <strong>家庭周报档案</strong>
          <span>按周沉淀成果内容，适合查看历史周报、复制总结，也更适合作为比赛展示材料。</span>
        </div>

        <div className="console-range-switch archive-range-switch" aria-label="选择周报周期">
          {weekOptions.slice(0, 6).map((weekId) => (
            <button
              key={weekId}
              type="button"
              className={selectedWeekId === weekId ? 'is-active' : ''}
              onClick={() => setSelectedWeekId(weekId)}
              disabled={loading}
            >
              {formatWeekLabel(weekId)}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <article className="console-empty-panel">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <strong>正在加载周报</strong>
          <p>请稍等片刻，系统正在整理这一周的总结、称号和徽章内容。</p>
        </article>
      ) : error ? (
        <article className="console-empty-panel">
          <strong>周报暂时不可用</strong>
          <p>{error}</p>
        </article>
      ) : overview ? (
        <>
          <section className="console-weekly-archive-meta">
            <article className="console-analytics-pill">
              <span>周报周期</span>
              <strong>{overview.weeklyReport.title}</strong>
              <p>当前查看的是单周成果归档，不会和分析页的多周趋势混在一起。</p>
            </article>

            <article className="console-analytics-pill">
              <span>公平度评分</span>
              <strong>{overview.fairnessInsight.score} 分</strong>
              <p>{overview.fairnessInsight.label}，可以直接作为作品里“自动分析能力”的量化展示。</p>
            </article>
          </section>

          <section className="console-weekly-report">
            <article className="console-weekly-report__card">
              <header className="console-weekly-report__header">
                <div>
                  <span>本周家庭周报</span>
                  <h3>{overview.weeklyReport.title}</h3>
                  <p>{overview.weeklyReport.headline}</p>
                </div>

                <button
                  type="button"
                  className="console-weekly-report__copy"
                  onClick={() => void handleCopy()}
                >
                  <Copy className="h-4 w-4" />
                  {copied ? '已复制' : '复制周报'}
                </button>
              </header>

              <div className="console-weekly-report__body">
                <article className="console-weekly-report__summary">
                  <strong>本周摘要</strong>
                  <p>{overview.weeklyReport.summary}</p>
                </article>

                <article className="console-weekly-report__highlights">
                  <strong>本周重点</strong>
                  <div className="console-weekly-report__highlight-list">
                    {overview.weeklyReport.highlights.map((highlight, index) => (
                      <div key={`${highlight}-${index}`} className="console-weekly-report__highlight">
                        <em>{String(index + 1).padStart(2, '0')}</em>
                        <p>{highlight}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <footer className="console-weekly-report__footer">
                <strong>结语</strong>
                <p>{overview.weeklyReport.closing}</p>
              </footer>
            </article>
          </section>

          <section className="console-achievement-grid">
            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>本周称号</p>
                  <h3>自动生成的周度亮点</h3>
                  <small>根据当前所选周的积分、打卡频率和任务结构自动计算，适合直接作为比赛亮点展示。</small>
                </div>
              </header>

              <div className="console-title-list">
                {overview.achievements.weeklyTitles.map((item) => (
                  <article key={item.id} className={`console-title-card ${getHonorToneClass(item.tone)}`}>
                    <div className="console-title-card__head">
                      <div className="console-honor-headline">
                        <div className={`console-honor-emblem ${getHonorToneClass(item.tone)} is-${getHonorVisual(item.id).rarity}`}>
                          {(() => {
                            const Icon = getHonorVisual(item.id).icon
                            return <Icon className="h-5 w-5" />
                          })()}
                          <b>{getHonorVisual(item.id).emblem}</b>
                        </div>
                        <div>
                          <span>{item.title}</span>
                          <strong>{item.memberNickname ?? '全家协作'}</strong>
                        </div>
                      </div>
                      <mark>{getHonorRarityLabel(getHonorVisual(item.id).rarity)}</mark>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>成员徽章墙</p>
                  <h3>谁在本周点亮了什么能力</h3>
                  <small>每位成员最多展示 3 枚徽章，没拿到徽章的成员也会保留位置，方便持续激励。</small>
                </div>
              </header>

              <div className="console-badge-wall">
                {overview.achievements.memberBadges.map((member) => (
                  <article key={member.memberId} className="console-badge-wall__member">
                    <div className="console-badge-wall__member-head">
                      <strong>{member.memberNickname}</strong>
                      <span>{member.badges.length > 0 ? `已点亮 ${member.badges.length} 枚徽章` : '本周继续加油'}</span>
                    </div>

                    {member.badges.length > 0 ? (
                      <div className="console-badge-wall__badges">
                        {member.badges.map((badge) => (
                          <article key={badge.id} className={`console-member-badge ${getHonorToneClass(badge.tone)}`}>
                            <div className="console-honor-headline">
                              <div className={`console-honor-emblem ${getHonorToneClass(badge.tone)} is-${getHonorVisual(badge.id).rarity}`}>
                                {(() => {
                                  const Icon = getHonorVisual(badge.id).icon
                                  return <Icon className="h-4 w-4" />
                                })()}
                                <b>{getHonorVisual(badge.id).shortLabel}</b>
                              </div>
                              <strong>{badge.label}</strong>
                            </div>
                            <p>{badge.description}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="console-badge-wall__empty">本周还没有点亮个人徽章，下一次打卡就有机会冲榜。</div>
                    )}
                  </article>
                ))}
              </div>
            </article>
          </section>

          <section className="console-weekly-archive-grid">
            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>本周建议</p>
                  <h3>下周分工方向</h3>
                </div>
              </header>

              <div className="console-suggestion-list">
                {overview.actionSuggestions.map((suggestion) => (
                  <article key={suggestion.id} className="console-suggestion-card">
                    <div className="console-suggestion-card__head">
                      <strong>{suggestion.title}</strong>
                      <span className={`console-suggestion-card__priority is-${suggestion.priority}`}>
                        {suggestion.priority === 'high'
                          ? '优先处理'
                          : suggestion.priority === 'medium'
                            ? '建议跟进'
                            : '可持续优化'}
                      </span>
                    </div>
                    <p>{suggestion.description}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>本周裁决摘要</p>
                  <h3>系统总结</h3>
                </div>
              </header>

              <div className="console-analytics-summary archive-summary-grid">
                <article className="console-analytics-summary__item">
                  <em>01</em>
                  <span>整体状态</span>
                  <p>{overview.systemSummary.overall}</p>
                </article>

                <article className="console-analytics-summary__item">
                  <em>02</em>
                  <span>公平性评估</span>
                  <p>{overview.systemSummary.fairness}</p>
                </article>

                <article className="console-analytics-summary__item">
                  <em>03</em>
                  <span>趋势提醒</span>
                  <p>{overview.systemSummary.trend}</p>
                </article>
              </div>
            </article>
          </section>

          <section className="console-weekly-timeline">
            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>历史索引</p>
                  <h3>最近 12 周周报入口</h3>
                  <small>点击任意一周即可切换查看对应的单周周报内容。</small>
                </div>
              </header>

              <div className="console-weekly-timeline__list">
                {weekOptions.map((weekId) => (
                  <button
                    key={weekId}
                    type="button"
                    className={`console-weekly-timeline__item${selectedWeekId === weekId ? ' is-active' : ''}`}
                    onClick={() => setSelectedWeekId(weekId)}
                  >
                    <ScrollText className="h-4 w-4" />
                    <div>
                      <strong>{weekId}</strong>
                      <span>查看该周周报</span>
                    </div>
                  </button>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : (
        <article className="console-empty-panel">
          <strong>暂无周报</strong>
          <p>完成打卡后，这里会按周沉淀正式周报、称号和徽章内容。</p>
        </article>
      )}
    </div>
  )
}
