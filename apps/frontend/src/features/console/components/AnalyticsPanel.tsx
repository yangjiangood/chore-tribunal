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

function getTaskTypeColor(taskType: TaskType) {
  if (taskType === 'LIGHT') {
    return '#34d399'
  }

  if (taskType === 'CORE') {
    return '#60a5fa'
  }

  return '#f59e0b'
}

function getTaskTypeLabel(taskType: TaskType) {
  if (taskType === 'LIGHT') {
    return '+1 随手活'
  }

  if (taskType === 'CORE') {
    return '+3 主力活'
  }

  return '+5 硬仗'
}

function formatWeekLabel(weekId: string) {
  const match = weekId.match(/W\d+/i)
  if (match) {
    return match[0].toUpperCase()
  }

  return weekId.length > 6 ? weekId.slice(-6) : weekId
}

function buildStatCards(overview: AnalyticsOverviewPayload) {
  return [
    {
      label: '已确认事件',
      value: overview.overviewMetrics.totalEvents,
      hint: `总积分 ${overview.overviewMetrics.totalScore} 分`,
    },
    {
      label: '参与成员',
      value: overview.overviewMetrics.participatingMembers,
      hint: `活跃成员 ${overview.overviewMetrics.activeMembers} 人`,
    },
    {
      label: '当前领先',
      value: overview.overviewMetrics.leaderNickname ?? '暂无',
      hint:
        overview.overviewMetrics.leaderNickname && overview.overviewMetrics.leaderScore > 0
          ? `领先 ${overview.overviewMetrics.leaderScore} 分，分差 ${overview.overviewMetrics.scoreSpread} 分`
          : '还没有形成明显领先',
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

  const maxMemberScore = useMemo(
    () => Math.max(...(overview?.fairnessCharts.memberScoreComparison.map((item) => item.totalScore) ?? [0])),
    [overview],
  )
  const maxWeeklyScore = useMemo(
    () => Math.max(...(overview?.trendCharts.weeklyTotals.map((item) => item.totalScore) ?? [0])),
    [overview],
  )

  const activeRangeLabel = rangeOptions.find((option) => option.value === range)?.label ?? '当前范围'
  const statCards = overview ? buildStatCards(overview) : []

  return (
    <div className="console-page-stack">
      <section className="console-analytics-toolbar">
        <div className="console-analytics-toolbar__copy">
          <strong>{activeRangeLabel}概览</strong>
          <span>只保留关键数字和趋势。</span>
        </div>

        <div className="console-range-switch">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={range === option.value ? 'is-active' : ''}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <article className="console-empty-panel">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <strong>正在加载分析数据</strong>
          <p>请稍等片刻。</p>
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
              <article key={card.label} className="console-analytics-stat">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.hint}</p>
              </article>
            ))}
          </section>

          <section className="console-analytics-middle">
            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>成员</p>
                  <h3>积分对比</h3>
                </div>
              </header>

              {overview.fairnessCharts.memberScoreComparison.length ? (
                <div className="console-bar-chart">
                  {overview.fairnessCharts.memberScoreComparison.map((item) => (
                    <article key={item.memberId} className="console-bar-chart__row">
                      <div className="console-bar-chart__meta">
                        <strong>{item.nickname}</strong>
                        <span>
                          {item.totalScore} 分 · {item.eventCount} 次
                        </span>
                      </div>
                      <div className="console-bar-chart__track">
                        <div
                          className="console-bar-chart__fill"
                          style={{
                            width: `${maxMemberScore > 0 ? Math.max((item.totalScore / maxMemberScore) * 100, 12) : 12}%`,
                          }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="console-chart-card__empty">
                  <p>当前范围内还没有可比较的成员积分。</p>
                </div>
              )}
            </article>

            <article className="console-chart-card">
              <header className="console-chart-card__header console-chart-card__header--simple">
                <div>
                  <p>任务</p>
                  <h3>类型分布</h3>
                </div>
              </header>

              {overview.trendCharts.taskTypeDistribution.length ? (
                <div className="console-distribution">
                  {overview.trendCharts.taskTypeDistribution.map((item) => (
                    <article key={item.taskType} className="console-distribution__item">
                      <div className="console-distribution__meta">
                        <strong>{getTaskTypeLabel(item.taskType)}</strong>
                        <span>{item.count} 次</span>
                      </div>
                      <div className="console-distribution__track">
                        <div
                          className="console-distribution__fill"
                          style={{
                            width: `${overview.overviewMetrics.totalEvents > 0 ? (item.count / overview.overviewMetrics.totalEvents) * 100 : 0}%`,
                            background: getTaskTypeColor(item.taskType),
                          }}
                        />
                      </div>
                      <p>贡献 {item.totalScore} 分</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="console-chart-card__empty">
                  <p>当前范围内没有任务类型分布数据。</p>
                </div>
              )}
            </article>
          </section>

          <section className="console-chart-card console-chart-card--wide">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>周趋势</p>
                <h3>积分变化</h3>
              </div>
            </header>

            {overview.trendCharts.weeklyTotals.length ? (
              <div className="console-trend-chart">
                {overview.trendCharts.weeklyTotals.map((week) => (
                  <article key={week.weekId} className="console-trend-chart__item">
                    <div className="console-trend-chart__bar">
                      <div
                        className="console-trend-chart__fill"
                        style={{
                          height: `${maxWeeklyScore > 0 ? Math.max((week.totalScore / maxWeeklyScore) * 100, 10) : 10}%`,
                        }}
                      />
                    </div>
                    <strong>{week.totalScore}</strong>
                    <span>{formatWeekLabel(week.weekId)}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="console-chart-card__empty">
                <p>当前范围内还没有周趋势数据。</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <article className="console-empty-panel">
          <strong>暂无分析数据</strong>
          <p>等产生正式记录后，这里会自动出现统计结果。</p>
        </article>
      )}
    </div>
  )
}
