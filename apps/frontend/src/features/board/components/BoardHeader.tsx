import { useEffect, useState } from 'react'
import { CalendarDays, Expand, LogOut, Settings, Sparkles } from 'lucide-react'
import type { BootstrapPayload } from '../../../lib/api'
import { formatClock, formatWeekRange } from '../constants'

interface BoardHeaderProps {
  bootstrap: BootstrapPayload | null
  loading: boolean
  onOpenConsole: () => void
  onOpenVerdict: () => void
  onLogout: () => void
}

export function BoardHeader({ bootstrap, loading, onOpenConsole, onOpenVerdict, onLogout }: BoardHeaderProps) {
  const [clock, setClock] = useState(() => formatClock())
  const [weekRange, setWeekRange] = useState(() => formatWeekRange())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(formatClock())
      setWeekRange(formatWeekRange())
    }, 30_000)

    return () => window.clearInterval(timer)
  }, [])

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        return
      }

      await document.exitFullscreen()
    } catch {
      // Browsers can reject fullscreen in some embedded contexts.
    }
  }

  return (
    <header className="ios-board-toolbar">
      <div className="ios-board-toolbar__status">
        <span>
          <CalendarDays size={14} />
          <strong>{weekRange}</strong>
        </span>
        <span>
          <CalendarDays size={14} />
          <strong>{clock}</strong>
        </span>
        <span>
          <CalendarDays size={14} />
          <strong>{loading ? '同步中' : `本周 ${bootstrap?.currentBoardSnapshot.scoreSummary.totalEvents ?? 0} 条记录`}</strong>
        </span>
      </div>

      <div className="ios-board-toolbar__actions">
        <button type="button" aria-label="打开设置" onClick={onOpenConsole}>
          <Settings size={16} />
          <span>设置</span>
        </button>
        <button type="button" aria-label="召唤 AI 裁判" onClick={onOpenVerdict}>
          <Sparkles size={16} />
          <span>裁决</span>
        </button>
        <button type="button" aria-label="切换全屏" onClick={() => void toggleFullscreen()}>
          <Expand size={16} />
          <span>全屏</span>
        </button>
        <button type="button" aria-label="退出登录" onClick={onLogout}>
          <LogOut size={16} />
          <span>退出</span>
        </button>
      </div>
    </header>
  )
}
