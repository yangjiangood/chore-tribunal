import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LoaderCircle, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EventHistoryItem, EventListPayload, EventStatus, Member, TaskType } from '@/lib/api'
import { useTribunal } from '@/app/use-tribunal'

type HistoryFilter = {
  memberId: string
  taskType: TaskType | 'ALL'
  status: EventStatus | 'ALL'
  keyword: string
}

interface HistoryPanelProps {
  members: Member[]
}

const initialFilters: HistoryFilter = {
  memberId: 'ALL',
  taskType: 'ALL',
  status: 'ALL',
  keyword: '',
}

function formatLogDate(isoString: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

function matchesKeyword(log: EventHistoryItem, keyword: string) {
  const value = keyword.trim().toLowerCase()
  if (!value) {
    return true
  }

  return (
    log.memberNickname.toLowerCase().includes(value) ||
    log.taskLabel.toLowerCase().includes(value) ||
    log.weekId.toLowerCase().includes(value)
  )
}

export function HistoryPanel({ members }: HistoryPanelProps) {
  const { listEvents } = useTribunal()
  const [filters, setFilters] = useState<HistoryFilter>(initialFilters)
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState<EventListPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await listEvents({
          memberId: filters.memberId === 'ALL' ? undefined : filters.memberId,
          taskType: filters.taskType === 'ALL' ? undefined : filters.taskType,
          status: filters.status === 'ALL' ? undefined : filters.status,
          page,
          pageSize: 10,
        })

        if (!cancelled) {
          setHistory(payload)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '历史记录加载失败。')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [filters.memberId, filters.taskType, filters.status, listEvents, page])

  const filteredItems = useMemo(
    () => (history?.items ?? []).filter((log) => matchesKeyword(log, filters.keyword)),
    [filters.keyword, history?.items],
  )

  const hasActiveFilters =
    filters.memberId !== 'ALL' ||
    filters.taskType !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.keyword.trim().length > 0

  return (
    <div className="console-page-stack">
      <section className="console-history-toolbar">
        <div className="console-history-filter-grid">
          <FilterField label="成员">
            <Select
              value={filters.memberId}
              onValueChange={(value) => {
                setPage(1)
                setFilters((current) => ({ ...current, memberId: value }))
              }}
            >
              <SelectTrigger className="console-history-select">
                <SelectValue placeholder="全部成员" />
              </SelectTrigger>
              <SelectContent className="console-history-select__content">
                <SelectItem value="ALL">全部成员</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="档位">
            <Select
              value={filters.taskType}
              onValueChange={(value) => {
                setPage(1)
                setFilters((current) => ({ ...current, taskType: value as TaskType | 'ALL' }))
              }}
            >
              <SelectTrigger className="console-history-select">
                <SelectValue placeholder="全部档位" />
              </SelectTrigger>
              <SelectContent className="console-history-select__content">
                <SelectItem value="ALL">全部档位</SelectItem>
                <SelectItem value="LIGHT">+1 随手活</SelectItem>
                <SelectItem value="CORE">+3 主力活</SelectItem>
                <SelectItem value="EPIC">+5 硬仗</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="状态">
            <Select
              value={filters.status}
              onValueChange={(value) => {
                setPage(1)
                setFilters((current) => ({ ...current, status: value as EventStatus | 'ALL' }))
              }}
            >
              <SelectTrigger className="console-history-select">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent className="console-history-select__content">
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="PENDING">待确认</SelectItem>
                <SelectItem value="CONFIRMED">正式</SelectItem>
                <SelectItem value="REVERTED">已撤销</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <label className="console-history-search">
            <span className="console-history-search__label">搜索</span>
            <div className="console-history-search__box">
              <Search className="h-4 w-4" />
              <Input
                value={filters.keyword}
                placeholder="成员、事项、周编号"
                onChange={(event) => {
                  setPage(1)
                  setFilters((current) => ({
                    ...current,
                    keyword: event.target.value,
                  }))
                }}
                className="console-dark-input"
              />
            </div>
          </label>
        </div>

        <div className="console-history-toolbar__meta">
          <span>{filteredItems.length} 条当前结果</span>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            className="console-history-reset"
            disabled={!hasActiveFilters}
            onClick={() => {
              setPage(1)
              setFilters(initialFilters)
            }}
          >
            <RotateCcw className="h-4 w-4" />
            重置筛选
          </Button>
        </div>
      </section>

      {loading ? (
        <article className="console-empty-panel">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <strong>正在加载记录</strong>
          <p>请稍等片刻。</p>
        </article>
      ) : error ? (
        <article className="console-empty-panel">
          <strong>记录暂时不可用</strong>
          <p>{error}</p>
        </article>
      ) : filteredItems.length ? (
        <section className="console-history-table">
          <div className="console-history-table__head">
            <span>时间</span>
            <span>成员</span>
            <span>事项</span>
            <span>档位</span>
            <span>状态</span>
          </div>

          {filteredItems.map((item) => (
            <article key={item.eventId} className="console-history-row">
              <span>{formatLogDate(item.createdAt)}</span>
              <strong>{item.memberNickname}</strong>
              <p>{item.taskLabel}</p>
              <em className={`console-tier-badge console-tier-badge--${item.taskType.toLowerCase()}`}>
                {item.taskType === 'LIGHT' ? '+1' : item.taskType === 'CORE' ? '+3' : '+5'}
              </em>
              <b className={`console-status-badge console-status-badge--${item.status.toLowerCase()}`}>
                {item.status === 'PENDING'
                  ? '待确认'
                  : item.status === 'CONFIRMED'
                    ? '正式'
                    : '已撤销'}
              </b>
            </article>
          ))}

          <div className="console-history-table__footer">
            <span>
              第 {history?.pagination.page ?? 1} / {history?.pagination.totalPages ?? 1} 页，共{' '}
              {history?.pagination.totalCount ?? 0} 条
            </span>
            <div className="console-history-pagination">
              <ButtonLike
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={(history?.pagination.page ?? 1) <= 1}
              >
                上一页
              </ButtonLike>
              <ButtonLike
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, history?.pagination.totalPages ?? current + 1),
                  )
                }
                disabled={(history?.pagination.page ?? 1) >= (history?.pagination.totalPages ?? 1)}
              >
                下一页
              </ButtonLike>
            </div>
          </div>
        </section>
      ) : (
        <article className="console-empty-panel">
          <strong>没有结果</strong>
          <p>换个筛选条件再试试。</p>
        </article>
      )}
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="console-history-filter-field">
      <span className="console-history-filter-field__label">{label}</span>
      {children}
    </label>
  )
}

function ButtonLike({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" disabled={disabled} className="console-page-button" onClick={onClick}>
      {children}
    </button>
  )
}
