import { Trophy } from 'lucide-react'
import type { BootstrapPayload } from '../../../lib/api'

interface RankingPanelProps {
  boardSnapshot: BootstrapPayload['currentBoardSnapshot'] | null
}

export function RankingPanel({ boardSnapshot }: RankingPanelProps) {
  const rankings = boardSnapshot?.rankings ?? []

  return (
    <section className="ios-ranking-strip" aria-label="实时排行">
      <div className="ios-ranking-strip__header">
        <div className="ios-ranking-strip__label">
          <Trophy size={14} />
          <span>排行</span>
        </div>
        <div className="ios-ranking-strip__meta">本周 {boardSnapshot?.scoreSummary.totalEvents ?? 0} 条记录</div>
      </div>

      {rankings.length ? (
        <div className="ios-ranking-strip__track">
          {rankings.map((item, index) => (
            <article key={item.memberId} className={`ios-ranking-pill ${index === 0 ? 'is-leading' : ''}`}>
              <span className="ios-ranking-pill__index">#{index + 1}</span>
              <div className="ios-ranking-pill__avatar">{item.avatarValue ?? item.nickname.slice(0, 1)}</div>
              <div className="ios-ranking-pill__body">
                <strong>{item.nickname}</strong>
                <small>
                  正式 {item.confirmedCount} · 待确认 {item.pendingCount}
                </small>
              </div>
              <em>{item.score}</em>
            </article>
          ))}
        </div>
      ) : (
        <p className="ios-empty-text">本周还没有新的积分记录。</p>
      )}
    </section>
  )
}
