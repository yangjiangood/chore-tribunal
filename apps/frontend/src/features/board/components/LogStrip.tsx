import { History } from 'lucide-react'
import type { BootstrapPayload, Member } from '../../../lib/api'
import { formatLogTime, getMemberPalette, typeMeta } from '../constants'

interface LogStripProps {
  logs: BootstrapPayload['currentBoardSnapshot']['recentLogs']
  members: Member[]
}

export function LogStrip({ logs, members }: LogStripProps) {
  const displayLogs = logs.slice(0, 10)
  const loopLogs = displayLogs.length ? [...displayLogs, ...displayLogs] : []
  const memberMap = new Map(members.map((member) => [member.id, member]))

  return (
    <footer className="ios-log-footer" aria-label="打卡日志">
      <div className="ios-log-footer__label">
        <History size={14} />
        <span>打卡日志</span>
      </div>

      <div className="ios-log-footer__viewport">
        {loopLogs.length ? (
          <div className="ios-log-footer__track">
            {loopLogs.map((log, index) => {
              const meta = typeMeta[log.taskType]
              const Icon = meta.icon
              const member = memberMap.get(log.memberId)
              const palette = getMemberPalette(member?.cardColor ?? 'archive-blue')

              return (
                <div key={`${log.eventId}-${index}`} className="ios-log-pill">
                  <span>{formatLogTime(log.createdAt)}</span>
                  <strong style={{ color: palette.accentText }}>{log.memberNickname}</strong>
                  <em>{log.taskLabel}</em>
                  <b>+{log.scoreDelta}分</b>
                  <small>
                    <Icon size={12} />
                    {meta.label}
                  </small>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="ios-log-footer__empty">今天还没有新的打卡记录。</div>
        )}
      </div>
    </footer>
  )
}
