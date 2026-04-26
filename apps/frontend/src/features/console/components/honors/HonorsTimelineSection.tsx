import {
  getHonorRarityLabel,
  getHonorToneClass,
  getHonorVisual,
} from '../honor-visuals'
import { buildWeeklyHonorEntries, formatWeekLabel } from './honors-panel.helpers'
import type { HonorsHallPayload } from '@/lib/api'

interface HonorsTimelineSectionProps {
  weeklyHonorRolls: HonorsHallPayload['weeklyHonorRolls']
  onSelectHonor: (honorId: string) => void
  onOpenWeekPoster: (weekId: string) => void
}

export function HonorsTimelineSection({
  weeklyHonorRolls,
  onSelectHonor,
  onOpenWeekPoster,
}: HonorsTimelineSectionProps) {
  const sortedWeeks = [...weeklyHonorRolls].sort((left, right) => getWeekOrder(right.weekId) - getWeekOrder(left.weekId))

  return (
    <article className="console-chart-card">
      <header className="console-chart-card__header console-chart-card__header--simple">
        <div>
          <p>历史时间线</p>
          <h3>按周回看每一次荣誉结算</h3>
          <small>每一周都是一张独立周报卡，先看周汇总，再看本周点亮的荣誉，浏览顺序会更清晰。</small>
        </div>
      </header>

      {sortedWeeks.length > 0 ? (
        <div className="console-honor-timeline">
          {sortedWeeks.map((week, index) => {
            const weeklyEntries = buildWeeklyHonorEntries(week)

            return (
              <article key={week.weekId} className="console-honor-week">
                <div className="console-honor-week__meta">
                  <div className="console-honor-week__summary">
                    <span>{index === 0 ? '最新周结算' : '历史周归档'}</span>
                    <strong>{week.weekId}</strong>
                    <small>
                      {week.leaderNickname
                        ? `${formatWeekLabel(week.weekId)} · 本周领跑者 ${week.leaderNickname}`
                        : `${formatWeekLabel(week.weekId)} · 本周荣誉归档`}
                    </small>
                  </div>

                  <div className="console-honor-week__chips">
                    <b>总积分 {week.totalScore}</b>
                    <b>公平度 {week.fairnessScore}</b>
                    {week.leaderNickname ? <b>领跑者 {week.leaderNickname}</b> : null}
                  </div>
                </div>

                <div className="console-honor-week__divider" />

                <div className="console-honor-week__titles">
                  {weeklyEntries.map((entry) => {
                    const visual = getHonorVisual(entry.id)
                    const Icon = visual.icon
                    const sourceLabel =
                      entry.source === 'title'
                        ? '周称号'
                        : entry.source === 'badge'
                          ? '成员徽章'
                          : '周荣誉'

                    return (
                      <button
                        key={`${week.weekId}:${entry.source}:${entry.id}:${entry.memberId ?? 'family'}`}
                        type="button"
                        className="console-honor-action"
                        onClick={() => onSelectHonor(entry.id)}
                      >
                        <div className={`console-honor-card is-${visual.rarity}`}>
                          <div className="console-honor-card__head">
                            <div className="console-honor-headline">
                              <div className={`console-honor-emblem ${getHonorToneClass(entry.tone)} is-${visual.rarity}`}>
                                <Icon className="h-5 w-5" />
                                <b>{visual.emblem}</b>
                              </div>
                              <div className="console-honor-card__copy">
                                <span>{entry.memberNickname ?? '全家协作'} · {sourceLabel}</span>
                                <strong>{entry.label}</strong>
                                <p>{getTimelineHonorSummary(entry.memberNickname, sourceLabel, visual.flavor)}</p>
                              </div>
                            </div>
                          </div>

                          <div className="console-honor-card__meta">
                            <span>{getHonorRarityLabel(visual.rarity)}</span>
                            <b>{sourceLabel}</b>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="console-honor-week__footer">
                  <button
                    type="button"
                    className="console-profile-open"
                    onClick={() => onOpenWeekPoster(week.weekId)}
                  >
                    生成本周荣誉海报
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="console-chart-card__empty">
          <p>暂无更多历史周数据，完成更多打卡解锁更多荣誉吧！</p>
        </div>
      )}
    </article>
  )
}

function getWeekOrder(weekId: string) {
  const match = weekId.match(/^(\d{4})-W(\d{1,2})$/i)
  if (!match) {
    return 0
  }

  return Number(match[1]) * 100 + Number(match[2])
}

function getTimelineHonorSummary(memberNickname: string | null, sourceLabel: string, flavor: string) {
  const summary = flavor.replace(/。$/, '')
  const owner = memberNickname ?? '全家协作'
  return `${owner}${sourceLabel === '周荣誉' ? '本周共同点亮' : '本周解锁'} · ${summary}`
}
