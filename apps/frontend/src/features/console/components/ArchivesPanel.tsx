import { Archive, FileClock, ScrollText } from 'lucide-react'
import type { BootstrapPayload } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ConsoleSection } from './ConsoleSection'

interface ArchivesPanelProps {
  bootstrap: BootstrapPayload | null
}

export function ArchivesPanel({ bootstrap }: ArchivesPanelProps) {
  const summary = bootstrap?.currentBoardSnapshot.scoreSummary

  return (
    <div className="console-stack">
      <ConsoleSection
        eyebrow="Archives"
        title="周报档案"
        description="归档接口还没完全落地，这个页签先稳定承接周报入口和单周预览结构。"
      >
        <div className="archive-preview">
          <div className="archive-preview__stamp">
            <Archive className="h-5 w-5" />
            <span>{bootstrap?.family.currentWeekId ?? 'CURRENT-WEEK'}</span>
          </div>
          <div className="archive-preview__body">
            <strong>本周卷宗预览</strong>
            <p>
              家庭：{bootstrap?.family.name ?? '未命名家庭'}，当前已累计{' '}
              {bootstrap?.currentBoardSnapshot.scoreSummary.totalEvents ?? 0} 条记录，后续归档接口会把这里变成正式周报入口。
            </p>
          </div>
          <Button type="button" variant="subtle" disabled>
            等待归档接口接入
          </Button>
        </div>

        <div className="archive-stat-grid">
          <article className="console-mini-stat">
            <span>本周事件</span>
            <strong>{summary?.totalEvents ?? 0}</strong>
            <p>当前周已产生的全部事件</p>
          </article>
          <article className="console-mini-stat">
            <span>已确认</span>
            <strong>{summary?.confirmedEvents ?? 0}</strong>
            <p>可以进入最终周报的数据</p>
          </article>
          <article className="console-mini-stat">
            <span>待确认</span>
            <strong>{summary?.pendingEvents ?? 0}</strong>
            <p>需要在归档前先处理干净</p>
          </article>
          <article className="console-mini-stat">
            <span>总积分</span>
            <strong>{summary?.totalScore ?? 0}</strong>
            <p>方便后续直接写入摘要头部</p>
          </article>
        </div>
      </ConsoleSection>

      <ConsoleSection
        eyebrow="Roadmap"
        title="档案结构"
        description="先把周报入口和信息架构稳定下来，后续接归档接口时不用重做页面骨架。"
      >
        <div className="archive-roadmap">
          <article className="archive-card">
            <FileClock className="h-5 w-5" />
            <strong>当前周摘要</strong>
            <p>承接本周冠军、末位、累计事件和 AI 判决状态。</p>
          </article>

          <article className="archive-card">
            <ScrollText className="h-5 w-5" />
            <strong>历史周报列表</strong>
            <p>接入 `GET /archives` 后，这里会展示按周索引的归档列表。</p>
          </article>

          <article className="archive-card">
            <Archive className="h-5 w-5" />
            <strong>单周详情页</strong>
            <p>接入 `GET /archives/:archiveId` 后承接冠军、垫底、奖惩和 AI 判决书。</p>
          </article>
        </div>

        <div className="archive-note">
          <strong>当前策略</strong>
          <p>先把信息架构、摘要位和入口布局固定下来，等后端归档接口上线后直接填充真实数据，不再重做 UI。</p>
        </div>
      </ConsoleSection>
    </div>
  )
}
