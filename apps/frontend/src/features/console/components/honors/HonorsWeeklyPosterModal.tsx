import { useLayoutEffect } from 'react'
import { Download, X } from 'lucide-react'
import type { HonorsHallPayload } from '@/lib/api'
import { formatWeekLabel } from './honors-panel.helpers'

interface HonorsWeeklyPosterModalProps {
  week: HonorsHallPayload['weeklyHonorRolls'][number] | null
  feedback: string | null
  downloading: boolean
  onClose: () => void
  onDownload: () => void
}

export function HonorsWeeklyPosterModal({
  week,
  feedback,
  downloading,
  onClose,
  onDownload,
}: HonorsWeeklyPosterModalProps) {
  useLayoutEffect(() => {
    if (!week || typeof document === 'undefined') {
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
  }, [week])

  if (!week) {
    return null
  }

  const titlePreview = week.weeklyTitles.slice(0, 3)
  const badgePreview = week.memberBadges.filter((item) => item.badges.length > 0).slice(0, 3)

  return (
    <div className="console-profile-overlay console-profile-overlay--poster" onClick={onClose}>
      <div className="console-profile-shell console-profile-shell--poster" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="console-profile-close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>

        <section className="console-poster-preview">
          <div className="console-poster-preview__art">
            <div className="console-poster-card is-gold">
              <div className="console-poster-card__brand">家庭无情裁判所 · 本周荣誉海报</div>

              <div className="console-poster-card__hero">
                <span>家庭整周荣誉总结</span>
                <strong>{formatWeekLabel(week.weekId)}</strong>
                <p>把这一周的家庭称号、成员徽章、领先成员和关键结果收束成一张更适合展示的分享海报。</p>
              </div>

              <div className="console-poster-card__stats">
                <article>
                  <span>总积分</span>
                  <strong>{week.totalScore}</strong>
                </article>
                <article>
                  <span>总打卡</span>
                  <strong>{week.totalEvents}</strong>
                </article>
                <article>
                  <span>本周领先</span>
                  <strong>{week.leaderNickname ?? '暂无'}</strong>
                </article>
              </div>

              <div className="console-poster-card__section">
                <span>本周称号</span>
                <div className="console-poster-card__list">
                  {titlePreview.length > 0 ? (
                    titlePreview.map((item) => (
                      <article key={`${week.weekId}:${item.id}:${item.memberId ?? 'family'}`}>
                        <strong>{item.memberNickname ?? '全家协作'} · {item.title}</strong>
                        <p>{item.description}</p>
                      </article>
                    ))
                  ) : (
                    <article>
                      <strong>本周暂无称号</strong>
                      <p>继续打卡后，这里会自动出现本周家庭荣誉亮点。</p>
                    </article>
                  )}
                </div>
              </div>

              <div className="console-poster-card__section">
                <span>成员徽章</span>
                <div className="console-poster-card__list">
                  {badgePreview.length > 0 ? (
                    badgePreview.map((item) => (
                      <article key={`${week.weekId}:${item.memberId}`}>
                        <strong>{item.memberNickname}</strong>
                        <p>{item.badges.map((badge) => badge.label).join(' · ')}</p>
                      </article>
                    ))
                  ) : (
                    <article>
                      <strong>本周暂无成员徽章</strong>
                      <p>继续积累个人高光，下次这里会出现更丰富的成员勋章。</p>
                    </article>
                  )}
                </div>
              </div>

              <div className="console-poster-card__footer">适合发群、周汇报、比赛说明文档或答辩展示页</div>
            </div>
          </div>

          <div className="console-poster-preview__aside">
            <div className="console-honor-detail-copy">
              <strong>海报说明</strong>
              <p>这张海报导出的是"家庭整周荣誉总结"，不是个人荣誉卡，更适合放在时间线周报节点中使用。</p>
            </div>

            <div className="console-honor-detail-copy">
              <strong>当前内容</strong>
              <p>会包含本周总积分、总打卡、本周领先成员、本周称号和成员徽章摘要。</p>
            </div>

            {feedback ? <div className="console-poster-feedback">{feedback}</div> : null}

            <div className="console-profile-actions">
              <button
                type="button"
                className="console-profile-open"
                onClick={onDownload}
                disabled={downloading}
              >
                <Download className="h-4 w-4" />
                {downloading ? '正在导出 PNG...' : '下载本周海报'}
              </button>

              <button type="button" className="console-profile-open is-secondary" onClick={onClose}>
                关闭预览
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}