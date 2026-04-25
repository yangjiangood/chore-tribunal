import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import type { TaskRule, TaskType } from '../../../lib/api'
import { typeMeta } from '../constants'

interface RuleStripProps {
  currentMemberName: string | null
  armedTaskType: TaskType | null
  rules: TaskRule[]
  onSelectRule: (rule: TaskRule) => void
  onClose: () => void
}

type RuleFilter = 'all' | 'pinned' | 'regular'

type RuleSection = {
  key: RuleFilter
  title: string
  description: string
  rules: TaskRule[]
}

export function RuleStrip({
  currentMemberName,
  armedTaskType,
  rules,
  onSelectRule,
  onClose,
}: RuleStripProps) {
  const [activeFilter, setActiveFilter] = useState<RuleFilter>('all')

  const pinnedRules = useMemo(() => rules.filter((rule) => rule.isPinned), [rules])
  const regularRules = useMemo(() => rules.filter((rule) => !rule.isPinned), [rules])
  const sections = useMemo<RuleSection[]>(() => {
    if (activeFilter === 'pinned') {
      return [
        {
          key: 'pinned' as const,
          title: '常用标签',
          description: '优先展示高频打卡项',
          rules: pinnedRules,
        },
      ]
    }

    if (activeFilter === 'regular') {
      return [
        {
          key: 'regular' as const,
          title: '具体事项',
          description: '完整展开全部可选内容',
          rules: regularRules,
        },
      ]
    }

    return [
      {
        key: 'pinned' as const,
        title: '常用标签',
        description: '适合快速完成一次打卡',
        rules: pinnedRules,
      },
      {
        key: 'regular' as const,
        title: '具体事项',
        description: '按规则顺序展示完整列表',
        rules: regularRules,
      },
    ].filter((section) => section.rules.length > 0)
  }, [activeFilter, pinnedRules, regularRules])

  const visibleCount = sections.reduce((total, section) => total + section.rules.length, 0)

  useEffect(() => {
    setActiveFilter('all')
  }, [armedTaskType, currentMemberName])

  if (!currentMemberName || !armedTaskType) {
    return null
  }

  const meta = typeMeta[armedTaskType]
  const Icon = meta.icon

  return (
    <div className="ios-rule-modal" role="dialog" aria-modal="true" aria-label="选择具体打卡标签">
      <div className="ios-rule-modal__backdrop" onClick={onClose} />

      <section className="ios-rule-modal__card">
        <button type="button" className="ios-rule-modal__close" aria-label="关闭标签弹窗" onClick={onClose}>
          <X size={18} />
        </button>

        <header className="ios-rule-modal__header">
          <span>{meta.kicker}</span>
          <h3>{currentMemberName}</h3>
          <p>选一个具体标签就能立即完成本次打卡。</p>
        </header>

        <div className={`ios-rule-modal__type ${meta.accentClass}`}>
          <div className="ios-rule-modal__type-main">
            <div className="ios-rule-modal__type-icon">
              <Icon size={18} />
            </div>
            <div>
              <strong>{meta.label}</strong>
              <small>{meta.kicker}</small>
            </div>
          </div>
          <small>{meta.points}</small>
        </div>

        <div className="ios-rule-modal__filters" role="tablist" aria-label="标签筛选">
          <button
            type="button"
            role="tab"
            className={`ios-rule-filter ${activeFilter === 'all' ? 'is-active' : ''}`}
            aria-selected={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          >
            <span>全部</span>
            <strong>{rules.length}</strong>
          </button>
          <button
            type="button"
            role="tab"
            className={`ios-rule-filter ${activeFilter === 'pinned' ? 'is-active' : ''}`}
            aria-selected={activeFilter === 'pinned'}
            onClick={() => setActiveFilter('pinned')}
          >
            <span>常用</span>
            <strong>{pinnedRules.length}</strong>
          </button>
          <button
            type="button"
            role="tab"
            className={`ios-rule-filter ${activeFilter === 'regular' ? 'is-active' : ''}`}
            aria-selected={activeFilter === 'regular'}
            onClick={() => setActiveFilter('regular')}
          >
            <span>具体</span>
            <strong>{regularRules.length}</strong>
          </button>
        </div>

        <div className="ios-rule-modal__list-wrap">
          <div className="ios-rule-modal__list-meta">
            <span>
              {activeFilter === 'all'
                ? '已按常用优先分组展示'
                : activeFilter === 'pinned'
                  ? '当前只显示常用标签'
                  : '当前只显示具体事项'}
            </span>
            <strong>{visibleCount} 个可选</strong>
          </div>

          <div className="ios-rule-modal__list">
            {visibleCount ? (
              sections.map((section) => (
                <section key={section.key} className={`ios-rule-section is-${section.key}`}>
                  <header className="ios-rule-section__header">
                    <div>
                      <strong>{section.title}</strong>
                      <span>{section.description}</span>
                    </div>
                    <em>{section.rules.length}</em>
                  </header>

                  <div className="ios-rule-section__items">
                    {section.rules.map((rule) => (
                      <button
                        key={rule.id}
                        type="button"
                        className="ios-rule-option"
                        data-pinned={rule.isPinned ? 'true' : 'false'}
                        onClick={() => onSelectRule(rule)}
                      >
                        <div className="ios-rule-option__body">
                          <div className="ios-rule-option__meta">
                            <small>{rule.isPinned ? '常用标签' : '具体事项'}</small>
                            {rule.isPinned ? <span className="ios-rule-option__badge">推荐</span> : null}
                          </div>
                          <strong>{rule.label}</strong>
                        </div>
                        <div className="ios-rule-option__tail">
                          <em>+{rule.scoreDelta}</em>
                          <span className="ios-rule-option__arrow" aria-hidden="true">
                            <ArrowUpRight size={14} />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="ios-rule-modal__empty">
                {rules.length
                  ? '当前筛选下还没有标签，可以切换到其他分类继续查看。'
                  : '这个档位还没有启用可选标签，请先去控制台补充规则。'}
              </div>
            )}
          </div>
        </div>

        <button type="button" className="ios-rule-modal__cancel" onClick={onClose}>
          取消
        </button>
      </section>
    </div>
  )
}
