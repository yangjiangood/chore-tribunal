import { LoaderCircle, Medal, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTribunal } from '@/app/use-tribunal'
import type { HonorsHallPayload } from '@/lib/api'
import {
  getHonorEmptyIcon,
  getHonorKindLabel,
  getHonorRarityLabel,
  getHonorToneClass,
  getHonorVisual,
  HONOR_CATALOG,
} from './honor-visuals'

function formatWeekLabel(weekId: string) {
  const match = weekId.match(/W\d+/i)
  return match ? match[0].toUpperCase() : weekId
}

export function HonorsPanel() {
  const { getHonorsHall } = useTribunal()
  const [hall, setHall] = useState<HonorsHallPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await getHonorsHall()
        if (!cancelled) {
          setHall(payload)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '荣誉殿堂加载失败。')
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
  }, [getHonorsHall])

  const summary = useMemo(() => {
    if (!hall) {
      return null
    }

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

    const totalTitles = hall.memberHall.reduce((sum, member) => sum + member.totalTitleEarned, 0)
    const totalBadges = hall.memberHall.reduce((sum, member) => sum + member.totalBadgeEarned, 0)
    const leader = hall.memberHall[0] ?? null

    return {
      totalTitles,
      totalBadges,
      leader,
      unlockedTitleIds,
      unlockedBadgeIds,
      unlockedCatalogCount: HONOR_CATALOG.filter((item) =>
        item.kind === 'badge' ? unlockedBadgeIds.has(item.id) : unlockedTitleIds.has(item.id) || unlockedBadgeIds.has(item.id),
      ).length,
    }
  }, [hall])

  if (loading) {
    return (
      <article className="console-empty-panel">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        <strong>正在整理荣誉殿堂</strong>
        <p>系统正在汇总历史称号、累计徽章和成员荣誉统计。</p>
      </article>
    )
  }

  if (error) {
    return (
      <article className="console-empty-panel">
        <strong>荣誉殿堂暂时不可用</strong>
        <p>{error}</p>
      </article>
    )
  }

  if (!hall || !summary) {
    return (
      <article className="console-empty-panel">
        <strong>暂无荣誉数据</strong>
        <p>完成更多真实打卡后，这里会沉淀成按周可回看的长期荣誉档案。</p>
      </article>
    )
  }

  return (
    <div className="console-page-stack">
      <section className="console-analytics-toolbar">
        <div className="console-analytics-toolbar__copy">
          <strong>家庭荣誉殿堂</strong>
          <span>这里专门看长期积累，不和单周周报混在一起，更适合展示历史称号、累计徽章、图鉴解锁和成员荣誉变化。</span>
        </div>
      </section>

      <section className="console-analytics-overview-strip">
        <article className="console-analytics-pill">
          <span>已追踪周数</span>
          <strong>{hall.trackedWeekIds.length} 周</strong>
          <p>当前展示最近 {hall.trackedWeekIds.length} 个有真实记录的自然周。</p>
        </article>

        <article className="console-analytics-pill">
          <span>图鉴解锁进度</span>
          <strong>
            {summary.unlockedCatalogCount} / {HONOR_CATALOG.length}
          </strong>
          <p>当前家庭已经点亮的荣誉条目数量，适合直接展示长期激励机制的完成度。</p>
        </article>

        <article className="console-analytics-pill">
          <span>荣誉榜领先</span>
          <strong>{summary.leader?.memberNickname ?? '暂无'}</strong>
          <p>
            累计徽章 {summary.totalBadges} 枚，累计称号 {summary.totalTitles} 次。
          </p>
        </article>
      </section>

      <section className="console-honors-layout">
        <article className="console-chart-card">
          <header className="console-chart-card__header console-chart-card__header--simple">
            <div>
              <p>历史称号时间线</p>
              <h3>每一周谁拿到了什么称号</h3>
              <small>保留历史周度结果，方便回看“某一周谁是冠军、谁是劳模、谁是主力担当”。</small>
            </div>
          </header>

          <div className="console-honor-timeline">
            {hall.weeklyHonorRolls.map((week) => (
              <article key={week.weekId} className="console-honor-week">
                <div className="console-honor-week__meta">
                  <div>
                    <span>{formatWeekLabel(week.weekId)}</span>
                    <strong>{week.leaderNickname ? `${week.leaderNickname} 领跑` : '本周荣誉归档'}</strong>
                  </div>
                  <div className="console-honor-week__chips">
                    <b>{week.totalScore} 分</b>
                    <b>{week.totalEvents} 次打卡</b>
                    <b>公平度 {week.fairnessScore}</b>
                  </div>
                </div>

                <div className="console-honor-week__titles">
                  {week.weeklyTitles.map((title) => {
                    const visual = getHonorVisual(title.id)
                    const Icon = visual.icon

                    return (
                      <article
                        key={`${week.weekId}-${title.id}-${title.memberId ?? 'team'}`}
                        className={`console-honor-card ${getHonorToneClass(title.tone)}`}
                      >
                        <div className={`console-honor-emblem ${getHonorToneClass(title.tone)} is-${visual.rarity}`}>
                          <Icon className="h-4 w-4" />
                          <b>{visual.emblem}</b>
                        </div>

                        <div className="console-honor-card__body">
                          <div className="console-honor-card__head">
                            <strong>{title.title}</strong>
                            <span>{title.memberNickname ?? '全家协作'}</span>
                          </div>
                          <p>{title.description}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="console-chart-card">
          <header className="console-chart-card__header console-chart-card__header--simple">
            <div>
              <p>成员累计荣誉册</p>
              <h3>谁拿过哪些徽章与称号</h3>
              <small>不只展示本周拿到什么，还能看到一个成员过去总共点亮了多少荣誉，以及最近一次出现在哪一周。</small>
            </div>
          </header>

          <div className="console-hall-members">
            {hall.memberHall.map((member) => (
              <article key={member.memberId} className="console-hall-member">
                <div className="console-hall-member__head">
                  <div>
                    <strong>{member.memberNickname}</strong>
                    <span>
                      {member.totalBadgeEarned} 枚徽章 · {member.totalTitleEarned} 次称号
                    </span>
                  </div>

                  {summary.leader?.memberId === member.memberId ? (
                    <div className="console-hall-member__leader">
                      <Trophy className="h-4 w-4" />
                      荣誉榜领先
                    </div>
                  ) : null}
                </div>

                <div className="console-hall-member__stats">
                  <div className="console-hall-member__stat">
                    <Medal className="h-4 w-4" />
                    <span>累计徽章</span>
                    <strong>{member.totalBadgeEarned}</strong>
                  </div>
                  <div className="console-hall-member__stat">
                    <Sparkles className="h-4 w-4" />
                    <span>累计称号</span>
                    <strong>{member.totalTitleEarned}</strong>
                  </div>
                </div>

                <div className="console-hall-member__section">
                  <h4>徽章收藏</h4>
                  {member.badgeCounts.length > 0 ? (
                    <div className="console-hall-collection">
                      {member.badgeCounts.map((badge) => {
                        const visual = getHonorVisual(badge.id)
                        const Icon = visual.icon

                        return (
                          <article key={`${member.memberId}-${badge.id}`} className={`console-collection-item ${getHonorToneClass(badge.tone)}`}>
                            <div className={`console-honor-emblem ${getHonorToneClass(badge.tone)} is-${visual.rarity}`}>
                              <Icon className="h-4 w-4" />
                              <b>{badge.count}x</b>
                            </div>
                            <div className="console-collection-item__body">
                              <strong>{badge.label}</strong>
                              <span>{getHonorRarityLabel(visual.rarity)}</span>
                              <p>最近获得：{badge.lastEarnedWeekId ?? '暂无'}</p>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="console-badge-wall__empty">还没有累计到个人徽章，继续打卡就会逐步点亮。</div>
                  )}
                </div>

                <div className="console-hall-member__section">
                  <h4>称号履历</h4>
                  {member.titleCounts.length > 0 ? (
                    <div className="console-hall-title-list">
                      {member.titleCounts.map((title) => {
                        const visual = getHonorVisual(title.id)
                        const Icon = visual.icon

                        return (
                          <article key={`${member.memberId}-${title.id}`} className={`console-hall-title ${getHonorToneClass(title.tone)}`}>
                            <div className="console-hall-title__head">
                              <div className="console-honor-headline">
                                <div className={`console-honor-emblem ${getHonorToneClass(title.tone)} is-${visual.rarity}`}>
                                  <Icon className="h-4 w-4" />
                                  <b>{visual.shortLabel}</b>
                                </div>
                                <strong>{title.label}</strong>
                              </div>
                              <mark>{title.count} 次</mark>
                            </div>
                            <p>最近一次出现在 {title.lastEarnedWeekId ?? '暂无记录'}</p>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="console-badge-wall__empty">历史称号还没解锁，继续参与就会开始沉淀。</div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="console-chart-card console-honor-catalog">
        <header className="console-chart-card__header console-chart-card__header--simple">
          <div>
            <p>荣誉图鉴</p>
            <h3>有哪些徽章、什么稀有度、如何解锁</h3>
            <small>把“荣誉系统”从结果展示升级成可解释的游戏化机制，让评委一眼看懂这套激励设计。</small>
          </div>
        </header>

        <div className="console-honor-rarity-strip">
          <article className="console-honor-rarity-card is-gold">
            <span>传说级</span>
            <strong>高价值核心荣誉</strong>
            <p>通常对应冠军、主力、高能输出，代表高贡献或高效率表现。</p>
          </article>
          <article className="console-honor-rarity-card is-violet">
            <span>史诗级</span>
            <strong>角色型能力荣誉</strong>
            <p>强调任务类型优势和全面协作能力，适合塑造成员画像。</p>
          </article>
          <article className="console-honor-rarity-card is-teal">
            <span>稀有级 / 特别奖</span>
            <strong>过程激励与系统状态</strong>
            <p>既能鼓励稳定参与，也能解释系统对家庭整体协作的判断。</p>
          </article>
        </div>

        <div className="console-honor-catalog-grid">
          {HONOR_CATALOG.map((item) => {
            const Icon = item.icon
            const isUnlocked =
              item.kind === 'badge'
                ? summary.unlockedBadgeIds.has(item.id)
                : summary.unlockedTitleIds.has(item.id) || summary.unlockedBadgeIds.has(item.id)
            const earnedCount =
              item.kind === 'badge'
                ? hall.memberHall.reduce(
                    (sum, member) => sum + (member.badgeCounts.find((badge) => badge.id === item.id)?.count ?? 0),
                    0,
                  )
                : hall.memberHall.reduce(
                    (sum, member) => sum + (member.titleCounts.find((title) => title.id === item.id)?.count ?? 0),
                    0,
                  )

            return (
              <article
                key={item.id}
                className={`console-honor-catalog-card ${getHonorToneClass(item.tone)}${isUnlocked ? ' is-unlocked' : ' is-locked'}`}
              >
                <div className="console-honor-catalog-card__top">
                  <div className={`console-honor-emblem ${getHonorToneClass(item.tone)} is-${item.rarity}`}>
                    <Icon className="h-5 w-5" />
                    <b>{item.emblem}</b>
                  </div>

                  <div className="console-honor-catalog-card__badges">
                    <span>{getHonorRarityLabel(item.rarity)}</span>
                    <span>{getHonorKindLabel(item.kind)}</span>
                    <span>{isUnlocked ? `已解锁 ${earnedCount} 次` : '尚未解锁'}</span>
                  </div>
                </div>

                <div className="console-honor-catalog-card__body">
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.flavor}</p>
                  </div>
                  <article className="console-honor-catalog-card__rule">
                    <span>解锁条件</span>
                    <p>{item.condition}</p>
                  </article>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {hall.memberHall.every((member) => member.badgeCounts.length === 0 && member.titleCounts.length === 0) ? (
        <article className="console-empty-panel">
          {(() => {
            const EmptyIcon = getHonorEmptyIcon()
            return <EmptyIcon className="h-5 w-5" />
          })()}
          <strong>荣誉系统已就绪</strong>
          <p>现在只差更多真实打卡记录，荣誉时间线、成员荣誉册和图鉴解锁进度就会逐步丰满起来。</p>
        </article>
      ) : null}
    </div>
  )
}
