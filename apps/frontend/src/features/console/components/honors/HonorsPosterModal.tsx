import { useLayoutEffect } from 'react'
import { Download, X } from 'lucide-react'
import { getHonorVisual } from '../honor-visuals'
import type { MemberProfilePayload } from './honors-panel.helpers'
import { formatWeekLabel } from './honors-panel.helpers'

interface HonorsPosterModalProps {
  profile: MemberProfilePayload | null
  feedback: string | null
  downloading: boolean
  onClose: () => void
  onDownload: () => void
}

export function HonorsPosterModal({
  profile,
  feedback,
  downloading,
  onClose,
  onDownload,
}: HonorsPosterModalProps) {
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

  const tone = getHonorVisual(profile.signatureTitle?.id ?? profile.signatureBadge?.id ?? 'weekly-champion').tone

  return (
    <div className="console-profile-overlay console-profile-overlay--poster" onClick={onClose}>
      <div className="console-profile-shell console-profile-shell--poster" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="console-profile-close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>

        <section className="console-poster-preview">
          <div className="console-poster-preview__art">
            <div className={`console-poster-card is-${tone}`}>
              <div className="console-poster-card__brand">家庭无情裁判所 · 荣誉海报</div>
              <div className="console-poster-card__hero">
                <span>成员荣誉画像</span>
                <strong>{profile.member.memberNickname}</strong>
                <p>{profile.persona}</p>
              </div>

              <div className="console-poster-card__stats">
                <article>
                  <span>累计称号</span>
                  <strong>{profile.member.totalTitleEarned}</strong>
                </article>
                <article>
                  <span>累计徽章</span>
                  <strong>{profile.member.totalBadgeEarned}</strong>
                </article>
                <article>
                  <span>最佳高光周</span>
                  <strong>{profile.bestWeek ? formatWeekLabel(profile.bestWeek.weekId) : '待刷新'}</strong>
                </article>
              </div>

              <div className="console-poster-card__section">
                <span>代表荣誉</span>
                <div className="console-poster-card__chips">
                  <b>{profile.signatureTitle?.label ?? '持续成长中'}</b>
                  <b>{profile.signatureBadge?.label ?? '荣誉待点亮'}</b>
                </div>
              </div>

              <div className="console-poster-card__section">
                <span>高光荣誉</span>
                <div className="console-poster-card__list">
                  {profile.spotlightHonors.slice(0, 3).map((item) => (
                    <article key={`poster:${item.id}`}>
                      <strong>{item.label}</strong>
                      <p>
                        累计 {item.count} 次
                        {item.lastEarnedWeekId ? ` · 最近 ${formatWeekLabel(item.lastEarnedWeekId)}` : ''}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="console-poster-card__footer">适合分享至群聊、比赛材料或成员荣誉存档</div>
            </div>
          </div>

          <div className="console-poster-preview__aside">
            <div className="console-honor-detail-copy">
              <strong>分享建议</strong>
              <p>这张海报会导出为 PNG，适合直接发群、贴进作品说明文档，或者放到比赛答辩 PPT。</p>
            </div>

            <div className="console-honor-detail-copy">
              <strong>当前展示内容</strong>
              <p>会包含该成员的累计荣誉、代表称号、代表徽章、最佳高光周和高光荣誉清单。</p>
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
                {downloading ? '正在导出 PNG...' : '下载 PNG 海报'}
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