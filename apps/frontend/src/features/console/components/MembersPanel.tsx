import { useMemo, useState, type CSSProperties } from 'react'
import { Edit3, Plus, RotateCcw, Trash2, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BootstrapPayload, Member } from '@/lib/api'

const avatarPresets = ['👩', '👨', '🧒', '👧', '🧑', '👴', '🐱', '🐶', '🦊'] as const

const memberPalette = [
  {
    value: 'archive-blue',
    label: '档案蓝',
    color: '#60a5fa',
    tint: 'linear-gradient(180deg, rgba(96, 165, 250, 0.44), rgba(37, 99, 235, 0.26))',
    glow: 'rgba(59, 130, 246, 0.34)',
    border: 'rgba(96, 165, 250, 0.68)',
  },
  {
    value: 'violet-iris',
    label: '鸢尾紫',
    color: '#8b5cf6',
    tint: 'linear-gradient(180deg, rgba(167, 139, 250, 0.44), rgba(124, 58, 237, 0.26))',
    glow: 'rgba(139, 92, 246, 0.34)',
    border: 'rgba(167, 139, 250, 0.68)',
  },
  {
    value: 'moss-green',
    label: '苔绿色',
    color: '#34d399',
    tint: 'linear-gradient(180deg, rgba(52, 211, 153, 0.42), rgba(5, 150, 105, 0.24))',
    glow: 'rgba(16, 185, 129, 0.32)',
    border: 'rgba(16, 185, 129, 0.64)',
  },
  {
    value: 'mint-teal',
    label: '薄荷青',
    color: '#2dd4bf',
    tint: 'linear-gradient(180deg, rgba(45, 212, 191, 0.44), rgba(13, 148, 136, 0.26))',
    glow: 'rgba(20, 184, 166, 0.32)',
    border: 'rgba(45, 212, 191, 0.64)',
  },
  {
    value: 'gold-amber',
    label: '金琥珀',
    color: '#f59e0b',
    tint: 'linear-gradient(180deg, rgba(251, 191, 36, 0.44), rgba(245, 158, 11, 0.28))',
    glow: 'rgba(245, 158, 11, 0.34)',
    border: 'rgba(251, 191, 36, 0.68)',
  },
  {
    value: 'sunset-orange',
    label: '落日橙',
    color: '#fb923c',
    tint: 'linear-gradient(180deg, rgba(251, 146, 60, 0.44), rgba(234, 88, 12, 0.26))',
    glow: 'rgba(249, 115, 22, 0.34)',
    border: 'rgba(251, 146, 60, 0.68)',
  },
  {
    value: 'verdict-red',
    label: '裁决红',
    color: '#fb7185',
    tint: 'linear-gradient(180deg, rgba(248, 113, 113, 0.42), rgba(225, 29, 72, 0.24))',
    glow: 'rgba(244, 63, 94, 0.32)',
    border: 'rgba(251, 113, 133, 0.64)',
  },
  {
    value: 'rose-pink',
    label: '玫瑰粉',
    color: '#f472b6',
    tint: 'linear-gradient(180deg, rgba(244, 114, 182, 0.44), rgba(219, 39, 119, 0.26))',
    glow: 'rgba(244, 114, 182, 0.34)',
    border: 'rgba(244, 114, 182, 0.68)',
  },
  {
    value: 'slate-indigo',
    label: '石板靛',
    color: '#818cf8',
    tint: 'linear-gradient(180deg, rgba(129, 140, 248, 0.42), rgba(79, 70, 229, 0.24))',
    glow: 'rgba(99, 102, 241, 0.32)',
    border: 'rgba(129, 140, 248, 0.64)',
  },
  {
    value: 'lime-pop',
    label: '青柠绿',
    color: '#84cc16',
    tint: 'linear-gradient(180deg, rgba(132, 204, 22, 0.42), rgba(101, 163, 13, 0.24))',
    glow: 'rgba(132, 204, 22, 0.32)',
    border: 'rgba(163, 230, 53, 0.64)',
  },
] as const

type MemberDraft = {
  nickname: string
  avatarValue: string
  cardColor: string
}

interface MembersPanelProps {
  members: Member[]
  rankingMap: Map<string, BootstrapPayload['currentBoardSnapshot']['rankings'][number]>
  loading: boolean
  draft: MemberDraft
  onDraftChange: (draft: MemberDraft) => void
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void
  onUpdate: (memberId: string, payload: Partial<MemberDraft>) => void
  onDisable: (memberId: string) => void
  onRestore: (memberId: string) => void
  onDelete: (memberId: string) => void
}

function getMemberTone(cardColor: string) {
  return memberPalette.find((item) => item.value === cardColor) ?? memberPalette[0]
}

export function MembersPanel({
  members,
  rankingMap,
  loading,
  draft,
  onDraftChange,
  onCreate,
  onUpdate,
  onDisable,
  onRestore,
  onDelete,
}: MembersPanelProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editDraft, setEditDraft] = useState<MemberDraft>({
    nickname: '',
    avatarValue: '👩',
    cardColor: 'archive-blue',
  })

  const visibleMembers = useMemo(
    () => members.filter((member) => member.status === 'ACTIVE' || member.status === 'DISABLED'),
    [members],
  )

  const sortedMembers = useMemo(
    () =>
      [...visibleMembers].sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'ACTIVE' ? -1 : 1
        }

        const leftScore = rankingMap.get(left.id)?.score ?? 0
        const rightScore = rankingMap.get(right.id)?.score ?? 0
        return rightScore - leftScore || left.sortOrder - right.sortOrder
      }),
    [visibleMembers, rankingMap],
  )

  function resetCreateDraft() {
    onDraftChange({
      nickname: '',
      avatarValue: '👩',
      cardColor: 'archive-blue',
    })
  }

  function openEdit(member: Member) {
    setEditingMember(member)
    setEditDraft({
      nickname: member.nickname,
      avatarValue: member.avatarValue ?? '👩',
      cardColor: member.cardColor,
    })
  }

  async function handleUpdateMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingMember || !editDraft.nickname.trim()) {
      return
    }

    await onUpdate(editingMember.id, editDraft)
    setEditingMember(null)
  }

  return (
    <div className="console-page-stack">
      <section className="console-panel-tools">
        <Button
          type="button"
          variant="primary"
          className="console-cta-button"
          onClick={() => {
            setIsCreateOpen(true)
            resetCreateDraft()
          }}
        >
          <Plus className="h-4 w-4" />
          添加成员
        </Button>
      </section>

      <section className="console-members-grid">
        {sortedMembers.length ? (
          sortedMembers.map((member) => {
            const ranking = rankingMap.get(member.id)
            const tone = getMemberTone(member.cardColor)
            const isDisabled = member.status === 'DISABLED'
            const cardStyle = {
              '--member-tone': tone.color,
            } as CSSProperties

            return (
              <article
                key={member.id}
                className={`console-member-card ${isDisabled ? 'is-disabled' : ''}`}
                style={cardStyle}
              >
                <div className="console-member-card__toolbar">
                  <div className="console-member-card__identity">
                    <div
                      className="console-member-card__avatar"
                      style={{
                        background: tone.tint,
                        boxShadow: `0 16px 32px ${tone.glow}`,
                        borderColor: tone.border,
                      }}
                    >
                      <span>{member.avatarValue ?? '🧑'}</span>
                    </div>

                    <div className="console-member-card__body">
                      <strong>{member.nickname}</strong>
                      <p>本周累计积分</p>
                    </div>
                  </div>

                  <div className="console-member-card__actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="console-member-card__icon-action"
                      aria-label={`编辑${member.nickname}`}
                      title={`编辑${member.nickname}`}
                      onClick={() => openEdit(member)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="console-member-card__icon-action console-member-card__icon-action--danger"
                      aria-label={`删除${member.nickname}`}
                      title={`删除${member.nickname}`}
                      onClick={() => onDelete(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="console-member-card__stats">
                  <div className="console-member-card__score">
                    <strong>{isDisabled ? '—' : (ranking?.score ?? 0)}</strong>
                    <span>分</span>
                  </div>
                  <span className="console-member-card__tone-pill">
                    <i className="console-member-card__tone-dot" />
                    {tone.label}
                  </span>
                </div>

                <div className="console-member-card__footer">
                  <span className={`console-member-state ${isDisabled ? 'is-disabled' : 'is-active'}`}>
                    {isDisabled ? '已停用' : '启用中'}
                  </span>
                  {isDisabled ? (
                    <div className="console-member-card__footer-actions">
                      <span className="console-member-card__hint">已从打卡页隐藏</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="console-member-card__restore"
                        onClick={() => onRestore(member.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        恢复启用
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="console-member-card__disable"
                      onClick={() => onDisable(member.id)}
                    >
                      <UserX className="h-4 w-4" />
                      停用
                    </Button>
                  )}
                </div>
              </article>
            )
          })
        ) : (
          <article className="console-empty-panel">
            <strong>当前还没有成员</strong>
            <p>添加成员后，这里会显示启用中和已停用的全部成员卡片。</p>
          </article>
        )}
      </section>

      <MemberModal
        open={isCreateOpen}
        title="添加成员"
        subtitle="新成员"
        draft={draft}
        loading={loading}
        submitLabel="添加"
        onClose={() => {
          setIsCreateOpen(false)
          resetCreateDraft()
        }}
        onDraftChange={onDraftChange}
        onSubmit={async (event) => {
          await onCreate(event)
          setIsCreateOpen(false)
        }}
      />

      <MemberModal
        open={Boolean(editingMember)}
        title="编辑成员"
        subtitle="修改成员信息"
        draft={editDraft}
        loading={loading}
        submitLabel="保存"
        onClose={() => setEditingMember(null)}
        onDraftChange={setEditDraft}
        onSubmit={handleUpdateMember}
      />
    </div>
  )
}

interface MemberModalProps {
  open?: boolean
  title: string
  subtitle: string
  draft: MemberDraft
  loading: boolean
  submitLabel: string
  onClose: () => void
  onDraftChange: (draft: MemberDraft) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

function MemberModal({
  open = false,
  title,
  subtitle,
  draft,
  loading,
  submitLabel,
  onClose,
  onDraftChange,
  onSubmit,
}: MemberModalProps) {
  if (!open) {
    return null
  }

  const activeTone = getMemberTone(draft.cardColor)

  return (
    <div className="console-modal">
      <div className="console-modal__backdrop" onClick={onClose} />
      <div className="console-modal__card">
        <form className="console-modal__form" onSubmit={onSubmit}>
          <header className="console-modal__header">
            <div>
              <p>{title}</p>
              <h3>{subtitle}</h3>
            </div>
          </header>

          <article className="console-member-preview">
            <div
              className="console-member-preview__avatar"
              style={{
                background: activeTone.tint,
                boxShadow: `0 20px 40px ${activeTone.glow}`,
                borderColor: activeTone.border,
              }}
            >
              {draft.avatarValue || '🧑'}
            </div>
            <div className="console-member-preview__body">
              <strong>{draft.nickname || '新成员'}</strong>
              <p>{activeTone.label}</p>
            </div>
          </article>

          <div className="console-field">
            <Label htmlFor={`${title}-nickname`}>成员名</Label>
            <Input
              id={`${title}-nickname`}
              value={draft.nickname}
              placeholder="例如：爸爸"
              onChange={(event) => onDraftChange({ ...draft, nickname: event.target.value })}
              className="console-dark-input"
            />
          </div>

          <div className="console-field">
            <div className="console-field__split">
              <Label>角色图标</Label>
              <span>选择更直观的家庭角色</span>
            </div>
            <div className="console-avatar-picker">
              {avatarPresets.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  className={`console-avatar-picker__item ${draft.avatarValue === avatar ? 'is-selected' : ''}`}
                  onClick={() => onDraftChange({ ...draft, avatarValue: avatar })}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <div className="console-field">
            <div className="console-field__split">
              <Label>卡片颜色</Label>
              <span>更丰富的颜色会同步到首页成员卡</span>
            </div>
            <div className="console-color-picker console-color-picker--rich">
              {memberPalette.map((palette) => (
                <button
                  key={palette.value}
                  type="button"
                  className={`console-color-picker__item ${draft.cardColor === palette.value ? 'is-selected' : ''}`}
                  style={{
                    background: palette.tint,
                    borderColor: palette.border,
                    color: palette.color,
                    boxShadow:
                      draft.cardColor === palette.value
                        ? `0 0 0 2px rgba(255,255,255,0.94), 0 18px 34px ${palette.glow}`
                        : `0 10px 22px ${palette.glow}`,
                  }}
                  onClick={() => onDraftChange({ ...draft, cardColor: palette.value })}
                  aria-label={palette.label}
                >
                  <span />
                  <small>{palette.label}</small>
                </button>
              ))}
            </div>
          </div>

          <footer className="console-modal__footer">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {submitLabel}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
