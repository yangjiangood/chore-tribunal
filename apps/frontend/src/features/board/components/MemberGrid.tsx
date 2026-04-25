import { Crown, Fish } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { BootstrapPayload, Member, TaskType } from '../../../lib/api'
import { getMemberPalette, typeMeta } from '../constants'

interface MemberGridProps {
  members: Member[]
  rankingMap: Map<string, BootstrapPayload['currentBoardSnapshot']['rankings'][number]>
  armedMemberId: string | null
  onArmMember: (memberId: string, taskType: TaskType) => void
}

function getMemberTheme(cardColor: string): CSSProperties {
  const palette = getMemberPalette(cardColor)

  return {
    '--member-accent': palette.accent,
    '--member-accent-soft': palette.accentSoft,
    '--member-accent-ring': palette.accentRing,
    '--member-accent-text': palette.accentText,
    '--member-badge-bg': palette.badge,
  } as CSSProperties
}

export function MemberGrid({ members, rankingMap, armedMemberId, onArmMember }: MemberGridProps) {
  if (!members.length) {
    return (
      <section className="ios-member-grid">
        <article className="ios-member-card ios-member-card--empty">
          <strong>还没有成员</strong>
          <p>先去设置里补充家庭成员，首页就会出现可以直接打卡的角色卡片。</p>
        </article>
      </section>
    )
  }

  return (
    <section className="ios-member-grid" aria-label="成员打卡卡片">
      {members.map((member, index) => {
        const ranking = rankingMap.get(member.id)
        const isArmed = member.id === armedMemberId
        const isLeader = index === 0
        const isLoser = members.length > 1 && index === members.length - 1

        return (
          <article
            key={member.id}
            style={getMemberTheme(member.cardColor)}
            className={`ios-member-card ${isArmed ? 'is-active' : ''} ${isLeader ? 'is-leading' : ''} ${isLoser ? 'is-loser' : ''}`}
          >
            {isLeader ? (
              <div className="ios-member-card__badge is-crown" aria-label="当前领先">
                <Crown size={18} />
              </div>
            ) : null}

            {isLoser ? (
              <div className="ios-member-card__badge is-fish" aria-label="当前垫底">
                <Fish size={18} />
              </div>
            ) : null}

            <header className="ios-member-card__hero">
              <div className="ios-member-card__avatar">
                <span>{member.avatarValue ?? member.nickname.slice(0, 1)}</span>
              </div>

              <div className="ios-member-card__identity">
                <h2>{member.nickname}</h2>
              </div>

              <div className="ios-member-card__score">
                <strong>{ranking?.score ?? 0}</strong>
                <span>分</span>
              </div>
            </header>

            <div className="ios-member-card__actions">
              {(Object.keys(typeMeta) as TaskType[]).map((taskType) => {
                const meta = typeMeta[taskType]

                return (
                  <button
                    key={taskType}
                    type="button"
                    className={`ios-task-button ${meta.accentClass}`}
                    onClick={() => onArmMember(member.id, taskType)}
                  >
                    <div className="ios-task-button__copy">
                      <small>{meta.points}</small>
                      <span>{meta.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </article>
        )
      })}
    </section>
  )
}
