import { useLayoutEffect } from 'react'
import type { Member } from '@/lib/api'
import { Download, X } from 'lucide-react'
import { HonorMemberAvatar } from './HonorMemberAvatar'
import { getHonorToneClass } from '../honor-visuals'
import type { MemberProfilePayload } from './honors-panel.helpers'
import { formatWeekLabel } from './honors-panel.helpers'

interface HonorsMemberProfileModalProps {
  profile: MemberProfilePayload | null
  memberRecord: Member | null
  onClose: () => void
  onSelectHonor: (honorId: string) => void
  onOpenPoster: (memberId: string) => void
}

export function HonorsMemberProfileModal({
  profile,
  memberRecord,
  onClose,
  onSelectHonor,
  onOpenPoster,
}: HonorsMemberProfileModalProps) {
  useLayoutEffect(() => {
    if (!profile || typeof document === 'undefined') {
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
  }, [profile])

  if (!profile) {
    return null
  }

  return (
    <div className="console-profile-overlay" onClick={onClose}>
      <div className="console-profile-shell" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="console-profile-close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>

        <section className="console-profile-hero">
          <div className="console-profile-hero__copy">
            <span>成员个人主页</span>
            <div className="console-profile-hero__identity">
              <HonorMemberAvatar member={memberRecord} size="lg" />
              <h3>{profile.member.memberNickname}</h3>
            </div>
            <p>{profile.persona}</p>

            <div className="console-profile-actions">
              <button
                type="button"
                className="console-profile-open"
                onClick={() => onOpenPoster(profile.member.memberId)}
              >
                <Download className="h-4 w-4" />
                生成荣誉海报
              </button>
            </div>
          </div>

          <div className="console-profile-hero__stats">
            <div className="console-profile-stat">
              <span>累计称号</span>
              <strong>{profile.member.totalTitleEarned}</strong>
            </div>

            <div className="console-profile-stat">
              <span>累计徽章</span>
              <strong>{profile.member.totalBadgeEarned}</strong>
            </div>

            <div className="console-profile-highlight">
              <strong>代表称号</strong>
              <p>{profile.signatureTitle?.label ?? '还在形成中'}</p>
            </div>

            <div className="console-profile-highlight">
              <strong>代表徽章</strong>
              <p>{profile.signatureBadge?.label ?? '还在形成中'}</p>
            </div>
          </div>
        </section>

        <section className="console-profile-grid">
          <article className="console-chart-card">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>高光荣誉</p>
                <h3>这个成员最容易触发什么标签</h3>
              </div>
            </header>

            <div className="console-profile-spotlight">
              {profile.spotlightHonors.length > 0 ? (
                profile.spotlightHonors.map((item) => (
                  <button
                    key={`profile:${item.id}:${item.source}`}
                    type="button"
                    className="console-honor-action"
                    onClick={() => onSelectHonor(item.id)}
                  >
                    <div className="console-profile-spotlight__item">
                      <div className={`console-honor-emblem ${getHonorToneClass(item.tone)} is-${item.visual.rarity}`}>
                        <item.visual.icon className="h-4 w-4" />
                        <b>{item.visual.shortLabel}</b>
                      </div>

                      <div>
                        <strong>{item.label}</strong>
                        <p>
                          累计 {item.count} 次
                          {item.lastEarnedWeekId ? `，最近出现在 ${formatWeekLabel(item.lastEarnedWeekId)}` : '。'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="console-badge-wall__empty">还没有足够的荣誉沉淀，继续打卡后这里会逐渐形成画像。</div>
              )}
            </div>
          </article>

          <article className="console-chart-card">
            <header className="console-chart-card__header console-chart-card__header--simple">
              <div>
                <p>近几周表现</p>
                <h3>把这个成员最近几周的输出完整展开</h3>
              </div>
            </header>

            <div className="console-profile-recent">
              {profile.recentWeeks.length > 0 ? (
                profile.recentWeeks.map((week) => (
                  <article key={`recent:${week.weekId}`} className="console-profile-recent__item">
                    <div className="console-profile-recent__meta">
                      <div>
                        <strong>{formatWeekLabel(week.weekId)}</strong>
                        <span>{week.eventCount} 次打卡</span>
                      </div>
                      <span>{week.totalScore} 分</span>
                    </div>

                    <div className="console-profile-recent__bar">
                      <span
                        style={{
                          width: `${profile.bestWeek ? Math.max((week.totalScore / Math.max(profile.bestWeek.totalScore, 1)) * 100, 8) : 8}%`,
                        }}
                      />
                    </div>

                    <div className="console-profile-recent__honors">
                      {week.honors.length > 0 ? (
                        week.honors.map((honor, index) => (
                          <button
                            key={`recent:${week.weekId}:${honor.id}:${index}`}
                            type="button"
                            className="console-honor-action console-honor-detail-copy"
                            onClick={() => onSelectHonor(honor.id)}
                          >
                            <b>{honor.label}</b>
                          </button>
                        ))
                      ) : (
                        <b>本周暂无新增荣誉</b>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="console-badge-wall__empty">最近还没有周快照数据，等出现真实打卡后就能看到成员成长轨迹。</div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}