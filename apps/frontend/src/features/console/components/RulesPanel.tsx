import { useMemo, useState, type CSSProperties } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { TaskRule, TaskType } from '@/lib/api'

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
  onUpdate: (ruleId: string, payload: Partial<RuleDraft>) => void
  onDisable: (ruleId: string) => void
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
] as const

export function RulesPanel({
  rules,
  loading,
  draft,
  onDraftChange,
  onCreate,
  onUpdate,
  onDisable,
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

  const groupedRules = useMemo(
    () =>
      ruleGroups.map((group) => ({
        ...group,
        items: rules
          .filter((rule) => rule.taskType === group.type)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      })),
    [rules],
  )

  function openCreate(type: TaskType) {
    setCreatingType(type)
    onDraftChange({
      label: '',
      taskType: type,
      scoreDelta: type === 'LIGHT' ? 1 : type === 'CORE' ? 3 : 5,
      sortOrder: 10,
      isPinned: true,
    })
  }

  function openEdit(rule: TaskRule) {
    setEditingRule(rule)
    setEditDraft({
      label: rule.label,
      taskType: rule.taskType,
      scoreDelta: rule.scoreDelta,
      sortOrder: rule.sortOrder,
      isPinned: rule.isPinned,
    })
  }

  async function handleUpdateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingRule || !editDraft.label.trim()) {
      return
    }

    await onUpdate(editingRule.id, editDraft)
    setEditingRule(null)
  }

  return (
    <div className="console-page-stack">
      <section className="console-rule-groups">
        {groupedRules.map((group) => (
          <article key={group.type} className="console-rule-group">
            <header className="console-rule-group__header" style={{ '--group-color': group.color } as CSSProperties}>
              <div>
                <p>{group.score}</p>
                <h3>{group.title}</h3>
              </div>

              <div className="console-rule-group__tools">
                <span className="console-rule-group__count">{group.items.length} 条</span>
                <Button type="button" variant="primary" size="sm" onClick={() => openCreate(group.type)}>
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </div>
            </header>

            <div className="console-rule-group__grid">
              {group.items.length ? (
                group.items.map((rule) => (
                  <article key={rule.id} className="console-rule-card">
                    <div className="console-rule-card__head">
                      <div>
                        <strong>{rule.label}</strong>
                        <p>排序 #{rule.sortOrder}</p>
                      </div>
                      <div className="console-rule-card__badges">
                        <span className={`console-rule-pin ${rule.isPinned ? 'is-pinned' : ''}`}>
                          {rule.isPinned ? '固定' : '普通'}
                        </span>
                        <span className={`console-tier-badge console-tier-badge--${rule.taskType.toLowerCase()}`}>
                          +{rule.scoreDelta}
                        </span>
                      </div>
                    </div>

                    <div className="console-rule-card__meta">
                      <span>{rule.status === 'ACTIVE' ? '启用中' : '已停用'}</span>
                      <span>#{rule.sortOrder}</span>
                    </div>

                    <div className="console-rule-card__actions">
                      <Button type="button" variant="subtle" size="sm" onClick={() => openEdit(rule)}>
                        <Edit3 className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => onDisable(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                        停用
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <article className="console-empty-panel">
                  <strong>{group.title} 还没有规则</strong>
                  <p>先添加几条任务项。</p>
                </article>
              )}
            </div>
          </article>
        ))}
      </section>

      <RuleModal
        open={Boolean(creatingType)}
        title="新增规则"
        draft={draft}
        loading={loading}
        onClose={() => setCreatingType(null)}
        onDraftChange={onDraftChange}
        onSubmit={async (event) => {
          await onCreate(event)
          setCreatingType(null)
        }}
      />

      <RuleModal
        open={Boolean(editingRule)}
        title="编辑规则"
        draft={editDraft}
        loading={loading}
        onClose={() => setEditingRule(null)}
        onDraftChange={setEditDraft}
        onSubmit={handleUpdateRule}
      />
    </div>
  )
}

interface RuleModalProps {
  open: boolean
  title: string
  draft: RuleDraft
  loading: boolean
  onClose: () => void
  onDraftChange: (draft: RuleDraft) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>
}

function RuleModal({
  open,
  title,
  draft,
  loading,
  onClose,
  onDraftChange,
  onSubmit,
}: RuleModalProps) {
  if (!open) {
    return null
  }

  const activeGroup = ruleGroups.find((group) => group.type === draft.taskType) ?? ruleGroups[1]

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
              placeholder="例如：洗碗"
              onChange={(event) => onDraftChange({ ...draft, label: event.target.value })}
              className="console-dark-input"
            />
          </div>

          <div className="console-field">
            <Label>档位</Label>
            <div className="console-tier-picker">
              {ruleGroups.map((group) => (
                <button
                  key={group.type}
                  type="button"
                  className={`console-tier-picker__item ${draft.taskType === group.type ? 'is-selected' : ''}`}
                  onClick={() =>
                    onDraftChange({
                      ...draft,
                      taskType: group.type,
                      scoreDelta: Number(group.score.replace('+', '')),
                    })
                  }
                >
                  <span>{group.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="console-form-inline">
            <div className="console-field">
              <Label htmlFor={`${title}-score`}>分值</Label>
              <Input
                id={`${title}-score`}
                type="number"
                value={draft.scoreDelta}
                onChange={(event) =>
                  onDraftChange({ ...draft, scoreDelta: Number(event.target.value) || 0 })
                }
                className="console-dark-input"
              />
            </div>

            <div className="console-field">
              <Label htmlFor={`${title}-order`}>排序</Label>
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
          </div>

          <label className="console-switch-item console-switch-item--compact">
            <div>
              <strong>固定显示</strong>
            </div>
            <Switch
              checked={draft.isPinned}
              onCheckedChange={(checked) => onDraftChange({ ...draft, isPinned: checked })}
            />
          </label>

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
