import { useLayoutEffect } from 'react'
import { Sparkles, UserRound, X } from 'lucide-react'
import { getHonorKindLabel, getHonorRarityLabel, getHonorToneClass } from '../honor-visuals'
import type { HonorDetailPayload } from './honors-panel.helpers'
import { formatWeekLabel } from './honors-panel.helpers'

interface HonorsDetailModalProps {
  detail: HonorDetailPayload | null
  onClose: () => void
  onOpenMember: (memberId: string) => void
}

export function HonorsDetailModal({
  detail,
  onClose,
  onOpenMember,
}: HonorsDetailModalProps) {
  useLayoutEffect(() => {
    if (!detail || typeof document === 'undefined') {
      return
    }

    const bodyStyle = document.body.style
    const htmlStyle = document.documentElement.style
    const previousBodyOverflow = bodyStyle.overflow
    const previousBodyPaddingRight = bodyStyle.paddingRight
    const previousHtmlOverflow = htmlStyle.overflow
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    bodyStyle.overflow = 'hidden'
    htmlStyle.overflow = 'hidden'

    if (scrollbarWidth > 0) {
      bodyStyle.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      bodyStyle.overflow = previousBodyOverflow
      bodyStyle.paddingRight = previousBodyPaddingRight
      htmlStyle.overflow = previousHtmlOverflow
    }
  }, [detail])

  if (!detail) {
    return null
  }

  return (
    <div className="console-profile-overlay console-profile-overlay--front" onClick={onClose}>
      <div className="console-profile-shell console-profile-shell--compact" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="console-profile-close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>

        <section className="console-profile-hero">
          <div className="console-profile-hero__copy">
            <span>荣誉详情</span>
            <div className="console-honor-headline">
              <div className={`console-honor-emblem ${getHonorToneClass(detail.visual.tone)} is-${detail.visual.rarity}`}>
                <detail.visual.icon className="h-5 w-5" />
                <b>{detail.visual.emblem}</b>
              </div>

              <div>
                <h3>{detail.visual.label}</h3>
                <p>{detail.visual.flavor}</p>
              </div>
            </div>
          </div>

          <div className="console-profile-hero__stats">
            <div className="console-profile-stat">
              <span>稀有度</span>
              <strong>{getHonorRarityLabel(detail.visual.rarity)}</strong>
            </div>

            <div className="console-profile-stat">
              <span>类型</span>
              <strong>{getHonorKindLabel(detail.visual.kind)}</strong>
            </div>

            <div className="console-profile-highlight">
              <strong>触发周数</strong>
              <p>{detail.triggerWeeks} 周</p>
            </div>

            <div className="console-profile-highlight">
              <strong>当前状态</strong>
              <p>{detail.unlocked ? '已经解锁' : '尚未解锁'}</p>
            </div>
          </div>
        </section>

        <section className="console-profile-grid">
          <article className="console-chart-card">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>解锁规则</p>
                <h3>系统如何判定这个荣誉</h3>
              </div>
            </header>

            <div className="console-honor-catalog-card__rule">
              <span>解锁条件</span>
              <p>{detail.visual.condition}</p>
            </div>

            <div className="console-honor-detail-copy">
              <strong>设计意义</strong>
              <p>{detail.visual.flavor}</p>
            </div>
          </article>

          <article className="console-chart-card">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>收藏榜</p>
                <h3>谁最常拿到这个荣誉</h3>
              </div>
            </header>

            <div className="console-profile-spotlight">
              {detail.collectors.length > 0 ? (
                detail.collectors.slice(0, 6).map((collector, index) => (
                  <button
                    key={`collector:${collector.memberId}`}
                    type="button"
                    className="console-honor-action"
                    onClick={() => onOpenMember(collector.memberId)}
                  >
                    <div className="console-profile-spotlight__item">
                      <div className="console-honor-emblem is-violet is-rare">
                        <Sparkles className="h-4 w-4" />
                        <b>#{index + 1}</b>
                      </div>
                      <div>
                        <strong>{collector.memberNickname}</strong>
                        <p>累计收藏 {collector.count} 次</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="console-badge-wall__empty">这个荣誉还没有形成稳定收藏记录，等真实触发后这里会自动出现排行。</div>
              )}
            </div>
          </article>

          <article className="console-chart-card">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>最近获得记录</p>
                <h3>最近几次是在什么时候、被谁拿到</h3>
              </div>
            </header>

            <div className="console-profile-recent">
              {detail.recentMoments.length > 0 ? (
                detail.recentMoments.slice(0, 6).map((moment) => (
                  <article key={`moment:${moment.weekId}:${moment.memberId}`} className="console-profile-recent__item">
                    <div className="console-profile-recent__meta">
                      <div>
                        <strong>{moment.memberNickname}</strong>
                        <span>{formatWeekLabel(moment.weekId)}</span>
                      </div>
                      <span>{moment.sources.join(' / ')}</span>
                    </div>

                    <button type="button" className="console-profile-open" onClick={() => onOpenMember(moment.memberId)}>
                      <UserRound className="h-4 w-4" />
                      查看此成员
                    </button>
                  </article>
                ))
              ) : (
                <div className="console-badge-wall__empty">当前还没有可回溯的获得记录，等解锁后这里会自动沉淀历史轨迹。</div>
              )}
            </div>
          </article>

          <article className="console-chart-card">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>荣誉摘要</p>
                <h3>适合放在比赛展示里的结论信息</h3>
              </div>
            </header>

            <div className="console-analytics-summary archive-summary-grid">
              <article className="console-analytics-summary__item">
                <em>01</em>
                <span>历史触发</span>
                <p>这个荣誉一共在 {detail.triggerWeeks} 个周快照中出现过。</p>
              </article>

              <article className="console-analytics-summary__item">
                <em>02</em>
                <span>收藏人数</span>
                <p>累计有 {detail.uniqueCollectorCount} 位成员拥有过这项荣誉。</p>
              </article>

              <article className="console-analytics-summary__item">
                <em>03</em>
                <span>最近出现</span>
                <p>
                  {detail.lastWeekId
                    ? `最近一次出现在 ${formatWeekLabel(detail.lastWeekId)}。`
                    : '当前还没有最近出现记录。'}
                </p>
              </article>
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}