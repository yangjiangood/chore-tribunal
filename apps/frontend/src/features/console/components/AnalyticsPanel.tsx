import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useTribunal } from '@/app/use-tribunal'
import type { AnalyticsOverviewPayload, AnalyticsRange, TaskType } from '@/lib/api'

const rangeOptions: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '1w', label: '近 1 周' },
  { value: '4w', label: '近 4 周' },
  { value: '8w', label: '近 8 周' },
  { value: '12w', label: '近 12 周' },
]

function getTaskTypeMeta(taskType: TaskType | null) {
  if (taskType === 'LIGHT') {
    return {
      color: '#22c55e',
      label: '+1 随手活',
    }
  }

  if (taskType === 'CORE') {
    return {
      color: '#3b82f6',
      label: '+3 主力活',
    }
  }

  if (taskType === 'EPIC') {
    return {
      color: '#f59e0b',
      label: '+5 硬仗',
    }
  }

  return {
    color: '#64748b',
    label: '综合任务',
  }
}

function getPriorityLabel(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') {
    return '优先处理'
  }

  if (priority === 'medium') {
    return '建议跟进'
  }

  return '可持续优化'
}

function getFairnessTone(level: AnalyticsOverviewPayload['fairnessInsight']['level']) {
  if (level === 'excellent') {
    return 'excellent'
  }

  if (level === 'good') {
    return 'good'
  }

  if (level === 'watch') {
    return 'watch'
  }

  return 'risky'
}

function formatWeekLabel(weekId: string) {
  const match = weekId.match(/W\d+/i)
  if (match) {
    return match[0].toUpperCase()
  }

  return weekId.length > 6 ? weekId.slice(-6) : weekId
}

function buildParticipationHint(overview: AnalyticsOverviewPayload) {
  const { activeMembers, participatingMembers } = overview.overviewMetrics

  if (activeMembers <= 0) {
    return '当前还没有可统计的家庭成员'
  }

  if (participatingMembers === 0) {
    return `共 ${activeMembers} 人，暂时还没有人完成打卡`
  }

  if (participatingMembers === activeMembers) {
    return '全员参与'
  }

  return `${activeMembers} 人中有 ${participatingMembers} 人参与打卡`
}

function buildLeaderHint(overview: AnalyticsOverviewPayload) {
  const { totalEvents, leaderNickname, scoreSpread } = overview.overviewMetrics

  if (totalEvents === 0 || !leaderNickname) {
    return '完成打卡后会自动生成领先信息'
  }

  if (scoreSpread <= 0) {
    return '当前积分非常接近，暂时没有明显差距'
  }

  return `领先第二名 ${scoreSpread} 分`
}

function buildStatCards(overview: AnalyticsOverviewPayload) {
  return [
    {
      label: '已确认打卡',
      value: `${overview.overviewMetrics.totalEvents}次`,
      hint: `对应总积分 ${overview.overviewMetrics.totalScore} 分`,
      tone: 'violet',
    },
    {
      label: '参与成员',
      value: `${overview.overviewMetrics.participatingMembers}人`,
      hint: buildParticipationHint(overview),
      tone: 'emerald',
    },
    {
      label: '本周领先',
      value: overview.overviewMetrics.leaderNickname ?? '暂无',
      hint: buildLeaderHint(overview),
      tone: 'amber',
    },
  ] as const
}

export function AnalyticsPanel() {
  const { getAnalyticsOverview } = useTribunal()
  const [range, setRange] = useState<AnalyticsRange>('4w')
  const [overview, setOverview] = useState<AnalyticsOverviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await getAnalyticsOverview(range)

        if (!cancelled) {
          setOverview(payload)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '分析数据加载失败。')
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
  }, [getAnalyticsOverview, range])

  const activeRangeLabel = rangeOptions.find((option) => option.value === range)?.label ?? '当前范围'
  const statCards = useMemo(() => (overview ? buildStatCards(overview) : []), [overview])

  const memberComparison = useMemo(
    () =>
      [...(overview?.fairnessCharts.memberScoreComparison ?? [])].sort((left, right) => {
        if (right.totalScore !== left.totalScore) {
          return right.totalScore - left.totalScore
        }

        return right.eventCount - left.eventCount
      }),
    [overview],
  )

  const taskDistribution = useMemo(
    () =>
      [...(overview?.trendCharts.taskTypeDistribution ?? [])].sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count
        }

        return right.totalScore - left.totalScore
      }),
    [overview],
  )

  const weeklyTotals = overview?.trendCharts.weeklyTotals ?? []
  const maxMemberScore = useMemo(() => Math.max(...memberComparison.map((item) => item.totalScore), 0), [memberComparison])
  const maxTaskTypeCount = useMemo(() => Math.max(...taskDistribution.map((item) => item.count), 0), [taskDistribution])
  const maxWeeklyScore = useMemo(() => Math.max(...weeklyTotals.map((item) => item.totalScore), 0), [weeklyTotals])

  const hasTrendData = weeklyTotals.some((week) => week.totalEvents > 0)
  const hasAnyData = Boolean(overview?.overviewMetrics.totalEvents)
  const activeWeekCount = weeklyTotals.filter((week) => week.totalEvents > 0).length

  const bestWeek = weeklyTotals.reduce<(typeof weeklyTotals)[number] | null>((best, current) => {
    if (current.totalEvents <= 0) {
      return best
    }

    if (!best || current.totalScore > best.totalScore) {
      return current
    }

    return best
  }, null)

  const averageWeeklyScore =
    activeWeekCount > 0 && overview ? Math.round(overview.overviewMetrics.totalScore / activeWeekCount) : 0

  return (
    <div className="console-page-stack">
      <section className="console-analytics-toolbar">
        <div className="console-analytics-toolbar__copy">
          <strong>{activeRangeLabel}数据分析</strong>
          <span>先看关键数字，再看公平度、分工建议和趋势结论。</span>
        </div>

        <div className="console-range-switch" aria-label="分析时间范围">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={range === option.value ? 'is-active' : ''}
              onClick={() => setRange(option.value)}
              disabled={loading}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {overview ? (
        <section className="console-analytics-overview-strip">
          <article className="console-analytics-pill">
            <span>统计周数</span>
            <strong>{overview.includedWeekIds.length} 周</strong>
            <p>当前筛选范围内纳入统计的时间窗口</p>
          </article>

          <article className="console-analytics-pill">
            <span>人均积分</span>
            <strong>{Math.round(overview.overviewMetrics.averageScorePerMember)} 分</strong>
            <p>按参与成员计算的平均贡献水平</p>
          </article>

          <article className="console-analytics-pill">
            <span>活跃周数</span>
            <strong>{activeWeekCount} 周</strong>
            <p>至少出现过 1 次打卡记录的自然周</p>
          </article>
        </section>
      ) : null}

      {loading ? (
        <article className="console-empty-panel">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <strong>正在加载分析数据</strong>
          <p>请稍等片刻，图表会跟着时间范围一起刷新。</p>
        </article>
      ) : error ? (
        <article className="console-empty-panel">
          <strong>分析数据暂时不可用</strong>
          <p>{error}</p>
        </article>
      ) : overview ? (
        <>
          <section className="console-analytics-top">
            {statCards.map((card) => (
              <article key={card.label} className={`console-analytics-stat console-analytics-stat--${card.tone}`}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.hint}</p>
              </article>
            ))}
          </section>

          <section className="console-analytics-focus">
            <article className={`console-fairness-card is-${getFairnessTone(overview.fairnessInsight.level)}`}>
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>公平度评分</p>
                  <h3>{overview.fairnessInsight.label}</h3>
                  <small>{overview.fairnessInsight.summary}</small>
                </div>
              </header>

              <div className="console-fairness-card__score">
                <strong>{overview.fairnessInsight.score}</strong>
                <span>/ 100</span>
              </div>

              <div className="console-fairness-metrics">
                <article className="console-fairness-metric">
                  <div className="console-fairness-metric__head">
                    <span>参与覆盖</span>
                    <strong>{overview.fairnessInsight.dimensions.participation}</strong>
                  </div>
                  <div className="console-fairness-metric__track">
                    <div
                      className="console-fairness-metric__fill"
                      style={{ width: `${overview.fairnessInsight.dimensions.participation}%` }}
                    />
                  </div>
                </article>

                <article className="console-fairness-metric">
                  <div className="console-fairness-metric__head">
                    <span>积分均衡</span>
                    <strong>{overview.fairnessInsight.dimensions.balance}</strong>
                  </div>
                  <div className="console-fairness-metric__track">
                    <div
                      className="console-fairness-metric__fill"
                      style={{ width: `${overview.fairnessInsight.dimensions.balance}%` }}
                    />
                  </div>
                </article>

                <article className="console-fairness-metric">
                  <div className="console-fairness-metric__head">
                    <span>任务轮换</span>
                    <strong>{overview.fairnessInsight.dimensions.rotation}</strong>
                  </div>
                  <div className="console-fairness-metric__track">
                    <div
                      className="console-fairness-metric__fill"
                      style={{ width: `${overview.fairnessInsight.dimensions.rotation}%` }}
                    />
                  </div>
                </article>
              </div>
            </article>

            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>下周建议</p>
                  <h3>分工优化方向</h3>
                  <small>系统会根据参与度、积分差距和任务集中度，自动生成最值得优先处理的建议。</small>
                </div>
              </header>

              <div className="console-suggestion-list">
                {overview.actionSuggestions.map((suggestion) => {
                  const taskMeta = getTaskTypeMeta(suggestion.focusTaskType)

                  return (
                    <article key={suggestion.id} className="console-suggestion-card">
                      <div className="console-suggestion-card__head">
                        <strong>{suggestion.title}</strong>
                        <span className={`console-suggestion-card__priority is-${suggestion.priority}`}>
                          {getPriorityLabel(suggestion.priority)}
                        </span>
                      </div>

                      <p>{suggestion.description}</p>

                      <div className="console-suggestion-card__tags">
                        {suggestion.focusMemberNickname ? (
                          <span className="console-suggestion-card__tag">
                            重点成员：{suggestion.focusMemberNickname}
                          </span>
                        ) : null}

                        {suggestion.focusTaskType ? (
                          <span
                            className="console-suggestion-card__tag"
                            style={{ borderColor: `${taskMeta.color}33`, color: taskMeta.color }}
                          >
                            建议任务：{taskMeta.label}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </article>
          </section>

          <section className="console-analytics-middle">
            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>成员对比</p>
                  <h3>积分排行榜</h3>
                  <small>按积分降序展示，右侧同时保留打卡次数。</small>
                </div>
              </header>

              {memberComparison.length ? (
                <div className="console-bar-chart console-bar-chart--grid">
                  {memberComparison.map((item, index) => (
                    <article
                      key={item.memberId}
                      className={`console-bar-chart__row${index === 0 ? ' is-top' : ''}`}
                      title={`${item.nickname}：${item.totalScore}分，占总积分${item.sharePercent}%，打卡${item.eventCount}次`}
                    >
                      <div className="console-bar-chart__meta">
                        <div className="console-bar-chart__identity">
                          <em>#{index + 1}</em>
                          <strong>{item.nickname}</strong>
                        </div>

                        <div className="console-bar-chart__stats">
                          <span>{item.totalScore}分 · {item.eventCount}次打卡</span>
                          <b>{item.sharePercent}% 占比</b>
                        </div>
                      </div>

                      <div className="console-bar-chart__track">
                        <div
                          className="console-bar-chart__fill"
                          style={{
                            width: `${maxMemberScore > 0 ? Math.max((item.totalScore / maxMemberScore) * 100, 12) : 0}%`,
                          }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="console-chart-card__empty">
                  <p>暂无成员积分对比数据，完成打卡后这里会自动生成排行。</p>
                </div>
              )}
            </article>

            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>类型分布</p>
                  <h3>不同档位贡献情况</h3>
                  <small>条长代表打卡次数，附带显示该档位贡献积分。</small>
                </div>
              </header>

              {taskDistribution.length ? (
                <div className="console-distribution">
                  {taskDistribution.map((item) => {
                    const meta = getTaskTypeMeta(item.taskType)
                    const sharePercent =
                      overview.overviewMetrics.totalScore > 0
                        ? Math.round((item.totalScore / overview.overviewMetrics.totalScore) * 100)
                        : 0

                    return (
                      <article
                        key={item.taskType}
                        className="console-distribution__item"
                        title={`${meta.label}：${item.count}次，贡献${item.totalScore}分，占总积分${sharePercent}%`}
                      >
                        <div className="console-distribution__meta">
                          <div className="console-distribution__label">
                            <strong>{meta.label}</strong>
                            <b style={{ color: meta.color }}>{sharePercent}%</b>
                          </div>
                          <span>{item.count}次 · 贡献{item.totalScore}分</span>
                        </div>

                        <div className="console-distribution__track">
                          <div
                            className="console-distribution__fill"
                            style={{
                              width: `${maxTaskTypeCount > 0 ? Math.max((item.count / maxTaskTypeCount) * 100, 10) : 0}%`,
                              background: `linear-gradient(90deg, ${meta.color}, ${meta.color}cc)`,
                            }}
                          />
                        </div>

                        <p>积分占比 {sharePercent}%</p>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="console-chart-card__empty">
                  <p>暂无类型分布数据，完成打卡后即可查看各档位贡献情况。</p>
                </div>
              )}
            </article>
          </section>

          <section className="console-chart-card console-chart-card--wide">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>周趋势</p>
                <h3>积分变化</h3>
                <small>观察每周积分变化，快速判断最近的活跃程度。</small>
              </div>
            </header>

            {hasTrendData ? (
              <>
                <div className="console-trend-kpis">
                  <article className="console-trend-kpis__item">
                    <span>峰值周</span>
                    <strong>{bestWeek ? formatWeekLabel(bestWeek.weekId) : '暂无'}</strong>
                    <p>{bestWeek ? `${bestWeek.totalScore}分 · ${bestWeek.totalEvents}次打卡` : '等待数据生成'}</p>
                  </article>

                  <article className="console-trend-kpis__item">
                    <span>平均每周积分</span>
                    <strong>{averageWeeklyScore} 分</strong>
                    <p>只按有打卡记录的周数计算，更接近真实节奏</p>
                  </article>

                  <article className="console-trend-kpis__item">
                    <span>当前统计周</span>
                    <strong>{activeWeekCount} / {weeklyTotals.length}</strong>
                    <p>前者为活跃周数，后者为当前筛选周期总周数</p>
                  </article>
                </div>

                <div className="console-trend-chart">
                  {weeklyTotals.map((week) => {
                    const hasWeekData = week.totalEvents > 0
                    const height = hasWeekData && maxWeeklyScore > 0
                      ? Math.max((week.totalScore / maxWeeklyScore) * 100, 8)
                      : 0

                    return (
                      <article
                        key={week.weekId}
                        className={`console-trend-chart__item${hasWeekData ? '' : ' is-empty'}`}
                        title={
                          hasWeekData
                            ? `${formatWeekLabel(week.weekId)}：${week.totalScore}分，${week.totalEvents}次打卡`
                            : `${formatWeekLabel(week.weekId)}：暂无数据`
                        }
                      >
                        <span className="console-trend-chart__value">
                          {hasWeekData ? `${week.totalScore}分` : '暂无数据'}
                        </span>

                        <div className="console-trend-chart__bar">
                          <div
                            className="console-trend-chart__fill"
                            style={{
                              height: `${height}%`,
                            }}
                          />
                        </div>

                        <strong>{formatWeekLabel(week.weekId)}</strong>
                        <em>{hasWeekData ? `${week.totalEvents}次打卡` : '暂无记录'}</em>
                      </article>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="console-chart-card__empty">
                <p>暂无趋势数据，完成打卡后即可查看每周积分变化。</p>
              </div>
            )}
          </section>

          <section className="console-chart-card console-analytics-summary-card">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>系统结论</p>
                <h3>{hasAnyData ? '自动总结' : '等待数据生成'}</h3>
              </div>
            </header>

            {hasAnyData ? (
              <div className="console-analytics-summary">
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
            ) : (
              <div className="console-chart-card__empty">
                <p>暂无数据，完成打卡后这里会自动生成客观结论和参与提醒。</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <article className="console-empty-panel">
          <strong>暂无分析数据</strong>
          <p>等产生正式记录后，这里会自动出现统计结果和系统结论。</p>
        </article>
      )}
    </div>
  )
}
