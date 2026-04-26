import { Download, Medal, Trophy, UserRound } from 'lucide-react'
import type { HonorsHallPayload, Member } from '@/lib/api'
import { HonorMemberAvatar } from './HonorMemberAvatar'
import { getHonorToneClass, getHonorVisual } from '../honor-visuals'
import { formatWeekLabel } from './honors-panel.helpers'

interface HonorsMembersSectionProps {
  memberHall: HonorsHallPayload['memberHall']
  memberLookup: Map<string, Member>
  onOpenMember: (memberId: string) => void
  onOpenPoster: (memberId: string) => void
  onSelectHonor: (honorId: string) => void
}

export function HonorsMembersSection({
  memberHall,
  memberLookup,
  onOpenMember,
  onOpenPoster,
  onSelectHonor,
}: HonorsMembersSectionProps) {
  return (
    <article className="console-chart-card">
      <header className="console-chart-card__header console-chart-card__header--simple">
        <div>
          <p>成员荣誉册</p>
          <h3>谁的个人画像最鲜明</h3>
          <small>这里更强调长期积累。点击“查看个人主页”后，会展开该成员的高光周、代表荣誉和近几周表现。</small>
        </div>
      </header>

      <div className="console-hall-members">
        {memberHall.map((member, index) => {
          const representativeHonors = [...member.titleCounts, ...member.badgeCounts]
            .sort((left, right) => {
              if (right.count !== left.count) {
                return right.count - left.count
              }

              return (right.lastEarnedWeekId ?? '').localeCompare(left.lastEarnedWeekId ?? '', 'zh-CN')
            })
            .slice(0, 2)
          const memberRecord = memberLookup.get(member.memberId) ?? null

          return (
            <article key={member.memberId} className="console-hall-member">
              <div className="console-hall-member__head">
                <div className="console-hall-member__identity">
                  <HonorMemberAvatar member={memberRecord} />
                  <div>
                    <span>成员 #{index + 1}</span>
                    <strong>{member.memberNickname}</strong>
                  </div>
                </div>
                {index === 0 ? <b className="console-hall-member__leader">收藏领先</b> : null}
              </div>

              <div className="console-hall-member__stats">
                <div className="console-hall-member__stat">
                  <Trophy className="h-4 w-4" />
                  <span>累计称号</span>
                  <strong>{member.totalTitleEarned}</strong>
                </div>

                <div className="console-hall-member__stat">
                  <Medal className="h-4 w-4" />
                  <span>累计徽章</span>
                  <strong>{member.totalBadgeEarned}</strong>
                </div>
              </div>

              <div className="console-hall-member__section">
                <h4>代表荣誉</h4>
                <div className="console-honor-week__titles">
                  {representativeHonors.length > 0 ? representativeHonors.map((item) => {
                    const visual = getHonorVisual(item.id)
                    const Icon = visual.icon

                    return (
                      <button
                        key={`${member.memberId}:${item.id}`}
                        type="button"
                        className="console-honor-action"
                        onClick={() => onSelectHonor(item.id)}
                      >
                        <div className={`console-honor-card is-${visual.rarity}`}>
                          <div className="console-honor-card__head">
                            <div className="console-honor-headline">
                              <div className={`console-honor-emblem ${getHonorToneClass(item.tone)} is-${visual.rarity}`}>
                                <Icon className="h-4 w-4" />
                                <b>{item.count}</b>
                              </div>
                              <div>
                                <strong>{item.label}</strong>
                              </div>
                            </div>
                          </div>
                          <div className="console-honor-card__body">
                            <p>{visual.flavor}</p>
                            <div className="console-honor-card__meta">
                              <span>{getRarityTag(visual.rarity)}</span>
                              <b>{item.lastEarnedWeekId ? formatWeekLabel(item.lastEarnedWeekId) : '历史荣誉'}</b>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  }) : (
                    <div className="console-badge-wall__empty">当前还没有形成代表荣誉，再打几周这里就会逐渐丰富起来。</div>
                  )}
                </div>
              </div>

              <div className="console-profile-actions">
                <button type="button" className="console-profile-open" onClick={() => onOpenMember(member.memberId)}>
                  <UserRound className="h-4 w-4" />
                  查看个人主页
                </button>

                <button
                  type="button"
                  className="console-profile-open is-secondary"
                  onClick={() => onOpenPoster(member.memberId)}
                >
                  <Download className="h-4 w-4" />
                  生成荣誉海报
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </article>
  )
}

function getRarityTag(rarity: ReturnType<typeof getHonorVisual>['rarity']) {
  if (rarity === 'legendary') {
    return '传说级'
  }
  if (rarity === 'epic') {
    return '史诗级'
  }
  if (rarity === 'special') {
    return '特别奖'
  }
  return '稀有级'
}
