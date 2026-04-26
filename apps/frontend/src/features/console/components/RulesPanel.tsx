import { useMemo, useState, type CSSProperties } from 'react'
import { Edit3, Lock, PauseCircle, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TaskRule, TaskType } from '@/lib/api'
import { DangerConfirmModal } from './DangerConfirmModal'

type RuleDraft = {
  label: string
  taskType: TaskType
  scoreDelta: number
  sortOrder: number
  isPinned: boolean
}

interface RulesPanelProps {
  rules: TaskRule[]
  loading: boolean
  draft: RuleDraft
  onDraftChange: (draft: RuleDraft) => void
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void
  onUpdate: (
    ruleId: string,
    payload: Pick<RuleDraft, 'label' | 'sortOrder' | 'taskType' | 'scoreDelta'>,
  ) => void
  onDisable: (rule: TaskRule) => void
  onRestore: (rule: TaskRule) => void
}

const ruleGroups: Array<{
  type: TaskType
  title: string
  score: string
  description: string
  color: string
}> = [
  {
    type: 'LIGHT',
    title: '+1 随手活',
    score: '+1',
    description: '轻量高频任务',
    color: '#34d399',
  },
  {
    type: 'CORE',
    title: '+3 主力活',
    score: '+3',
    description: '核心日常任务',
    color: '#60a5fa',
  },
  {
    type: 'EPIC',
    title: '+5 硬仗',
    score: '+5',
    description: '高强度重点任务',
    color: '#f59e0b',
  },
]

function getScoreDeltaByTaskType(taskType: TaskType) {
  return taskType === 'LIGHT' ? 1 : taskType === 'CORE' ? 3 : 5
}

function getGroupByTaskType(taskType: TaskType) {
  return ruleGroups.find((group) => group.type === taskType) ?? ruleGroups[1]
}

export function RulesPanel({
  rules,
  loading,
  draft,
  onDraftChange,
  onCreate,
  onUpdate,
  onDisable,
  onRestore,
}: RulesPanelProps) {
  const [creatingType, setCreatingType] = useState<TaskType | null>(null)
  const [editingRule, setEditingRule] = useState<TaskRule | null>(null)
  const [editDraft, setEditDraft] = useState<RuleDraft>({
    label: '',
    taskType: 'CORE',
    scoreDelta: 3,
    sortOrder: 10,
    isPinned: false,
  })
  const [pendingTierConfirm, setPendingTierConfirm] = useState<null | {
    ruleId: string
    originalLabel: string
    fromGroup: string
    toGroup: string
    payload: Pick<RuleDraft, 'label' | 'sortOrder' | 'taskType' | 'scoreDelta'>
  }>(null)

  const groupedRules = useMemo(
    () =>
      ruleGroups.map((group) => ({
        ...group,
        items: rules
          .filter((rule) => rule.taskType === group.type)
          .sort((left, right) => {
            if (left.status !== right.status) {
              return left.status === 'ACTIVE' ? -1 : 1
            }

            return left.sortOrder - right.sortOrder || left.label.localeCompare(right.label, 'zh-CN')
          }),
      })),
    [rules],
  )

  function openCreate(type: TaskType) {
    const groupItems = groupedRules.find((group) => group.type === type)?.items ?? []
    const nextSortOrder = (groupItems[groupItems.length - 1]?.sortOrder ?? 0) + 10

    setCreatingType(type)
    onDraftChange({
      label: '',
      taskType: type,
      scoreDelta: getScoreDeltaByTaskType(type),
      sortOrder: nextSortOrder || 10,
      isPinned: false,
    })
  }

  function openEdit(rule: TaskRule) {
    setEditingRule(rule)
    setPendingTierConfirm(null)
    setEditDraft({
      label: rule.label,
      taskType: rule.taskType,
      scoreDelta: rule.scoreDelta,
      sortOrder: rule.sortOrder,
      isPinned: rule.isPinned,
    })
  }

  function handleTierChange(nextType: TaskType, currentDraft: RuleDraft, changeDraft: (draft: RuleDraft) => void) {
    if (currentDraft.isPinned) {
      return
    }

    changeDraft({
      ...currentDraft,
      taskType: nextType,
      scoreDelta: getScoreDeltaByTaskType(nextType),
    })
  }

  async function handleUpdateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingRule || !editDraft.label.trim()) {
      return
    }

    const payload = {
      label: editDraft.label,
      sortOrder: editDraft.sortOrder,
      taskType: editDraft.taskType,
      scoreDelta: editDraft.scoreDelta,
    } satisfies Pick<RuleDraft, 'label' | 'sortOrder' | 'taskType' | 'scoreDelta'>

    if (!editingRule.isPinned && editingRule.taskType !== editDraft.taskType) {
      setPendingTierConfirm({
        ruleId: editingRule.id,
        originalLabel: editDraft.label.trim() || editingRule.label,
        fromGroup: getGroupByTaskType(editingRule.taskType).title,
        toGroup: getGroupByTaskType(editDraft.taskType).title,
        payload,
      })
      return
    }

    await onUpdate(editingRule.id, payload)
    setEditingRule(null)
  }

  async function handleConfirmTierSave() {
    if (!pendingTierConfirm) {
      return
    }

    await onUpdate(pendingTierConfirm.ruleId, pendingTierConfirm.payload)
    setPendingTierConfirm(null)
    setEditingRule(null)
  }

  return (
    <div className="console-page-stack">
      <section className="console-rule-groups">
        {groupedRules.map((group) => (
          <article key={group.type} className="console-rule-group">
            <header
              className="console-rule-group__header"
              style={{ '--group-color': group.color } as CSSProperties}
            >
              <div>
                <p>{group.score}</p>
                <h3>{group.title}</h3>
              </div>

              <div className="console-rule-group__tools">
                <div className="console-rule-group__meta">
                  <span className="console-rule-group__count">{group.items.length} 条</span>
                </div>
                <Button type="button" variant="primary" size="sm" onClick={() => openCreate(group.type)}>
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </div>
            </header>

            <div className="console-rule-group__grid" role="list" aria-label={`${group.title} 规则列表`}>
              {group.items.length ? (
                group.items.map((rule) => {
                  const isDisabled = rule.status === 'DISABLED'
                  const pinTitle = '固定为系统基础家务标签，不可停用；普通标签支持停用与恢复。'

                  return (
                    <article
                      key={rule.id}
                      role="listitem"
                      className={`console-rule-card ${isDisabled ? 'is-disabled' : ''}`}
                      style={{ '--rule-accent': group.color } as CSSProperties}
                    >
                      <div className="console-rule-card__head">
                        <div className="console-rule-card__title">
                          <strong>{rule.label}</strong>
                          <p>排序 #{rule.sortOrder}</p>
                        </div>

                        <div className="console-rule-card__badges">
                          {rule.isPinned ? (
                            <span className="console-rule-lock" title={pinTitle} aria-label="固定标签">
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          ) : null}

                          <span className={`console-tier-badge console-tier-badge--${rule.taskType.toLowerCase()}`}>
                            +{rule.scoreDelta}
                          </span>
                        </div>
                      </div>

                      <div className="console-rule-card__spacer" />

                      <div className="console-rule-card__statusbar">
                        <span className={`console-rule-card__status ${isDisabled ? 'is-disabled' : 'is-active'}`}>
                          {isDisabled ? '已停用' : '启用中'}
                        </span>
                      </div>

                      <div className="console-rule-card__actions">
                        <Button type="button" variant="subtle" size="sm" onClick={() => openEdit(rule)}>
                          <Edit3 className="h-4 w-4" />
                          编辑
                        </Button>

                        {isDisabled ? (
                          <Button type="button" variant="primary" size="sm" onClick={() => onRestore(rule)}>
                            <RotateCcw className="h-4 w-4" />
                            恢复启用
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="subtle"
                            size="sm"
                            className="console-rule-card__pause"
                            onClick={() => onDisable(rule)}
                            disabled={rule.isPinned}
                            title={rule.isPinned ? '固定标签不可停用' : '停用后不会再出现在打卡列表中'}
                          >
                            <PauseCircle className="h-4 w-4" />
                            停用
                          </Button>
                        )}
                      </div>
                    </article>
                  )
                })
              ) : (
                <article className="console-empty-panel">
                  <strong>{group.title} 还没有规则</strong>
                  <p>点击右上角“添加”，为这个分值档位补充家务标签。</p>
                </article>
              )}
            </div>
          </article>
        ))}
      </section>

      <RuleModal
        open={Boolean(creatingType)}
        mode="create"
        title="新增规则"
        draft={draft}
        loading={loading}
        onClose={() => setCreatingType(null)}
        onDraftChange={onDraftChange}
        onTierChange={(nextType) => handleTierChange(nextType, draft, onDraftChange)}
        onSubmit={async (event) => {
          await onCreate(event)
          setCreatingType(null)
        }}
      />

      <RuleModal
        open={Boolean(editingRule)}
        mode="edit"
        title="编辑规则"
        draft={editDraft}
        loading={loading}
        onClose={() => {
          setEditingRule(null)
          setPendingTierConfirm(null)
        }}
        onDraftChange={setEditDraft}
        onTierChange={(nextType) => handleTierChange(nextType, editDraft, setEditDraft)}
        onSubmit={handleUpdateRule}
      />

      <DangerConfirmModal
        open={Boolean(pendingTierConfirm)}
        title={
          pendingTierConfirm
            ? `你已将【${pendingTierConfirm.originalLabel}】的档位从${pendingTierConfirm.fromGroup}修改为${pendingTierConfirm.toGroup}`
            : ''
        }
        description="本次修改仅影响未来的打卡记录，历史记录的分值不会变动，确认保存吗？"
        confirmLabel="确认保存"
        confirmVariant="primary"
        loading={loading}
        onCancel={() => setPendingTierConfirm(null)}
        onConfirm={handleConfirmTierSave}
      />
    </div>
  )
}

interface RuleModalProps {
  open: boolean
  mode: 'create' | 'edit'
  title: string
  draft: RuleDraft
  loading: boolean
  onClose: () => void
  onDraftChange: (draft: RuleDraft) => void
  onTierChange: (taskType: TaskType) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
}

function RuleModal({
  open,
  mode,
  title,
  draft,
  loading,
  onClose,
  onDraftChange,
  onTierChange,
  onSubmit,
}: RuleModalProps) {
  if (!open) {
    return null
  }

  const activeGroup = getGroupByTaskType(draft.taskType)
  const tierWarning =
    '⚠️ 温馨提示：修改档位仅影响未来的打卡记录，历史打卡记录的分值将按修改前的档位永久保存，不会因本次修改而变动。'

  return (
    <div className="console-modal">
      <div className="console-modal__backdrop" onClick={onClose} />
      <div className="console-modal__card">
        <form className="console-modal__form" onSubmit={onSubmit}>
          <header className="console-modal__header">
            <div>
              <h3>{title}</h3>
            </div>
          </header>

          <article
            className="console-rule-preview"
            style={{ '--group-color': activeGroup.color } as CSSProperties}
          >
            <div className="console-rule-preview__head">
              <span>{activeGroup.score}</span>
              <strong>{activeGroup.title}</strong>
            </div>
            <p>{activeGroup.description}</p>
          </article>

          <div className="console-field">
            <Label htmlFor={`${title}-label`}>事项名称</Label>
            <Input
              id={`${title}-label`}
              value={draft.label}
              placeholder="例如：倒垃圾"
              onChange={(event) => onDraftChange({ ...draft, label: event.target.value })}
              className="console-dark-input"
            />
          </div>

          <div className="console-field">
            <Label>档位选择</Label>
            <div className="console-tier-picker">
              {ruleGroups.map((group) => (
                <button
                  key={group.type}
                  type="button"
                  className={`console-tier-picker__item ${draft.taskType === group.type ? 'is-selected' : ''} ${draft.isPinned ? 'is-locked' : ''}`}
                  style={{ '--tier-color': group.color } as CSSProperties}
                  onClick={() => onTierChange(group.type)}
                  title={draft.isPinned ? '固定标签的档位不可修改' : `切换到${group.title}`}
                  aria-disabled={draft.isPinned}
                >
                  <span>{group.title}</span>
                </button>
              ))}
            </div>

            <div className="console-rule-modal__warning">
              <strong>温馨提示</strong>
              <p>{tierWarning}</p>
            </div>
          </div>

          <div className="console-field">
            <Label htmlFor={`${title}-order`}>排序号</Label>
            <Input
              id={`${title}-order`}
              type="number"
              value={draft.sortOrder}
              onChange={(event) =>
                onDraftChange({ ...draft, sortOrder: Number(event.target.value) || 0 })
              }
              className="console-dark-input"
            />
          </div>

          {mode === 'edit' ? (
            <div className="console-security-note console-security-note--soft">
              <strong>说明</strong>
              <span>修改名称、档位、排序号只影响未来使用规则的方式，历史打卡记录仍按快照数据保留。</span>
            </div>
          ) : null}

          <footer className="console-modal__footer">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              保存
            </Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
