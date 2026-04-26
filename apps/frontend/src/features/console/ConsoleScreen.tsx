import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  History,
  RefreshCw,
  Settings2,
  Shield,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { pickPreferenceDraft } from '@/app/tribunal-store'
import { useTribunal } from '@/app/use-tribunal'
import type { Member, TaskRule, TaskType } from '@/lib/api'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { DangerConfirmModal } from './components/DangerConfirmModal'
import { HistoryPanel } from './components/HistoryPanel'
import { MembersPanel } from './components/MembersPanel'
import { PreferencesPanel } from './components/PreferencesPanel'
import { RulesPanel } from './components/RulesPanel'

type ControlTab = 'analytics' | 'members' | 'rules' | 'history' | 'settings'

type DangerAction =
  | { kind: 'disable-member'; memberId: string; memberName: string }
  | { kind: 'delete-member'; memberId: string; memberName: string }
  | { kind: 'disable-rule'; ruleId: string; ruleLabel: string }
  | { kind: 'restore-rule'; ruleId: string; ruleLabel: string }

const defaultPreferenceDraft = {
  verdictPersona: '无情开麦裁判长',
  verdictToxicityLevel: 5,
  allowAttack: true,
  allowHumiliation: false,
  allowLabeling: true,
}

const tabMeta: Array<{
  value: ControlTab
  label: string
  subtitle: string
  icon: typeof BarChart3
}> = [
  { value: 'analytics', label: '分析', subtitle: '总览与趋势', icon: BarChart3 },
  { value: 'members', label: '成员', subtitle: '角色与状态', icon: Users },
  { value: 'rules', label: '规则', subtitle: '档位与事项', icon: Shield },
  { value: 'history', label: '历史', subtitle: '记录与筛选', icon: History },
  { value: 'settings', label: '设置', subtitle: '偏好与安全', icon: Settings2 },
]

export function ConsoleScreen() {
  const navigate = useNavigate()
  const {
    bootstrap,
    loading,
    notice,
    dismissNotice,
    refreshBootstrap,
    listMembers,
    listTaskRules,
    createMember,
    updateMember,
    disableMember,
    restoreMember,
    deleteMember,
    createTaskRule,
    updateTaskRule,
    disableTaskRule,
    restoreTaskRule,
    savePreferences,
    changePassword,
  } = useTribunal()

  const [tab, setTab] = useState<ControlTab>('analytics')
  const [memberDraft, setMemberDraft] = useState({
    nickname: '',
    avatarValue: '👤',
    cardColor: 'archive-blue',
  })
  const [consoleMembers, setConsoleMembers] = useState<Member[]>([])
  const [consoleRules, setConsoleRules] = useState<TaskRule[]>([])
  const [ruleDraft, setRuleDraft] = useState({
    label: '',
    taskType: 'CORE' as TaskType,
    scoreDelta: 3,
    sortOrder: 10,
    isPinned: false,
  })
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null)
  const [dirtyPreferenceDraft, setDirtyPreferenceDraft] = useState<null | typeof defaultPreferenceDraft>(
    null,
  )

  const preferenceDraft =
    dirtyPreferenceDraft ??
    (bootstrap?.preferences ? pickPreferenceDraft(bootstrap.preferences) : defaultPreferenceDraft)

  const rankingMap = useMemo(
    () => new Map((bootstrap?.currentBoardSnapshot.rankings ?? []).map((item) => [item.memberId, item])),
    [bootstrap],
  )

  const activeTab = tabMeta.find((item) => item.value === tab)

  async function refreshConsoleMembers() {
    const nextMembers = await listMembers()
    setConsoleMembers(
      nextMembers.filter((member) => member.status === 'ACTIVE' || member.status === 'DISABLED'),
    )
  }

  async function refreshConsoleRules() {
    const nextRules = await listTaskRules()
    setConsoleRules(nextRules)
  }

  async function handleCreateMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!memberDraft.nickname.trim()) {
      return
    }

    await createMember(memberDraft)
    await refreshConsoleMembers()
    setMemberDraft({
      nickname: '',
      avatarValue: '👤',
      cardColor: 'archive-blue',
    })
  }

  async function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ruleDraft.label.trim()) {
      return
    }

    await createTaskRule({
      taskType: ruleDraft.taskType,
      label: ruleDraft.label,
      sortOrder: ruleDraft.sortOrder,
    })
    await refreshConsoleRules()
    setRuleDraft((current) => ({ ...current, label: '', sortOrder: current.sortOrder + 10 }))
  }

  async function handleSavePreferences(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await savePreferences(preferenceDraft)
    setDirtyPreferenceDraft(null)
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await changePassword(passwordDraft)
    setPasswordDraft({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  async function handleUpdateMember(memberId: string, payload: {
    nickname?: string
    avatarValue?: string
    cardColor?: string
  }) {
    await updateMember(memberId, payload)
    await refreshConsoleMembers()
  }

  async function handleDisableMember(memberId: string) {
    await disableMember(memberId)
    await refreshConsoleMembers()
  }

  async function handleRestoreMember(memberId: string) {
    await restoreMember(memberId)
    await refreshConsoleMembers()
  }

  async function handleDeleteMember(memberId: string) {
    await deleteMember(memberId)
    await refreshConsoleMembers()
  }

  async function handleUpdateRule(ruleId: string, payload: {
    status?: TaskRule['status']
    taskType?: TaskRule['taskType']
    label?: string
    scoreDelta?: number
    sortOrder?: number
  }) {
    await updateTaskRule(ruleId, payload)
    await refreshConsoleRules()
  }

  async function handleDisableRule(ruleId: string) {
    await disableTaskRule(ruleId)
    await refreshConsoleRules()
  }

  async function handleRestoreRule(ruleId: string) {
    await restoreTaskRule(ruleId)
    await refreshConsoleRules()
  }

  async function handleConfirmDangerAction() {
    if (!dangerAction) {
      return
    }

    if (dangerAction.kind === 'disable-member') {
      await handleDisableMember(dangerAction.memberId)
      setDangerAction(null)
      return
    }

    if (dangerAction.kind === 'delete-member') {
      await handleDeleteMember(dangerAction.memberId)
      setDangerAction(null)
      return
    }

    if (dangerAction.kind === 'disable-rule') {
      await handleDisableRule(dangerAction.ruleId)
      setDangerAction(null)
      return
    }

    await handleRestoreRule(dangerAction.ruleId)
    setDangerAction(null)
  }

  function openDisableMemberConfirm(member: Member) {
    setDangerAction({
      kind: 'disable-member',
      memberId: member.id,
      memberName: member.nickname,
    })
  }

  function openDeleteMemberConfirm(member: Member) {
    setDangerAction({
      kind: 'delete-member',
      memberId: member.id,
      memberName: member.nickname,
    })
  }

  function openDisableRuleConfirm(rule: TaskRule) {
    setDangerAction({
      kind: 'disable-rule',
      ruleId: rule.id,
      ruleLabel: rule.label,
    })
  }

  function openRestoreRuleConfirm(rule: TaskRule) {
    setDangerAction({
      kind: 'restore-rule',
      ruleId: rule.id,
      ruleLabel: rule.label,
    })
  }

  function getDangerConfirmCopy(action: DangerAction | null) {
    if (!action) {
      return null
    }

    if (action.kind === 'disable-member') {
      return {
        title: `确定停用成员「${action.memberName}」吗？`,
        description: '停用后，该成员会从打卡等日常操作中隐藏，但历史数据会保留。',
        warning: '停用会立即影响当前家庭的可用成员列表，请确认不是误触。',
        confirmLabel: '确认停用',
        confirmVariant: 'danger' as const,
      }
    }

    if (action.kind === 'delete-member') {
      return {
        title: `确定删除成员「${action.memberName}」吗？`,
        description: '删除后该成员将从当前界面移除，且无法直接恢复。',
        warning: '这是高风险操作，如果只是暂时不用，建议优先选择停用。',
        confirmLabel: '确认删除',
        confirmVariant: 'danger' as const,
      }
    }

    if (action.kind === 'disable-rule') {
      return {
        title: `确定停用「${action.ruleLabel}」吗？`,
        description: '停用后该标签将不再出现在打卡列表中，但历史打卡记录不受影响。',
        warning: '系统固定标签不可停用，自定义标签停用后可在当前列表中恢复启用。',
        confirmLabel: '确认停用',
        confirmVariant: 'danger' as const,
      }
    }

    return {
      title: `确定恢复「${action.ruleLabel}」吗？`,
      description: '恢复后该标签将重新出现在打卡列表中。',
      confirmLabel: '确认恢复',
      confirmVariant: 'primary' as const,
    }
  }

  const dangerConfirmCopy = getDangerConfirmCopy(dangerAction)

  async function handleRefresh() {
    await refreshBootstrap('控制台数据已刷新')

    if (tab === 'members') {
      await refreshConsoleMembers()
    }

    if (tab === 'rules') {
      await refreshConsoleRules()
    }
  }

  function handleTabChange(value: string) {
    const nextTab = value as ControlTab
    setTab(nextTab)

    if (nextTab === 'members') {
      void refreshConsoleMembers()
    }

    if (nextTab === 'rules') {
      void refreshConsoleRules()
    }
  }

  return (
    <main className="console-v2">
      <Tabs value={tab} onValueChange={handleTabChange} className="console-v2__tabs">
        <header className="console-v2__topbar">
          <div className="console-v2__brand">
            <button type="button" className="console-v2__back" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="console-v2__title">
              <strong>家庭控制台</strong>
              <span>{activeTab?.subtitle ?? '控制台'}</span>
            </div>
          </div>

          <div className="console-v2__nav">
            <TabsList className="console-v2__tablist">
              {tabMeta.map((item) => {
                const Icon = item.icon

                return (
                  <TabsTrigger key={item.value} value={item.value} className="console-v2__tab">
                    <Icon className="h-4 w-4" />
                    <div className="console-v2__tab-copy">
                      <span>{item.label}</span>
                      <small>{item.subtitle}</small>
                    </div>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>
        </header>

        <section className="console-v2__body">
          <div className="console-v2__headerline">
            <div className="console-v2__headline console-v2__headline--inline">
              <p className="console-v2__eyebrow">家庭中控</p>
              <h1>{activeTab?.label ?? '控制台'}</h1>
            </div>

            <Button
              type="button"
              variant="subtle"
              className="console-v2__refresh"
              onClick={() => void handleRefresh()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
          </div>

          {notice ? (
            <div className={`console-v2__notice ${notice.type === 'error' ? 'is-error' : ''}`}>
              <span>{notice.message}</span>
              <button type="button" onClick={dismissNotice}>
                收起
              </button>
            </div>
          ) : null}

          <TabsContent value="analytics" className="console-v2__panel">
            <AnalyticsPanel />
          </TabsContent>

          <TabsContent value="members" className="console-v2__panel">
            <MembersPanel
              members={consoleMembers}
              rankingMap={rankingMap}
              loading={loading}
              draft={memberDraft}
              onDraftChange={setMemberDraft}
              onCreate={handleCreateMember}
              onUpdate={(memberId, payload) => void handleUpdateMember(memberId, payload)}
              onDisable={openDisableMemberConfirm}
              onRestore={(memberId) => void handleRestoreMember(memberId)}
              onDelete={openDeleteMemberConfirm}
            />
          </TabsContent>

          <TabsContent value="rules" className="console-v2__panel">
            <RulesPanel
              rules={consoleRules}
              loading={loading}
              draft={ruleDraft}
              onDraftChange={setRuleDraft}
              onCreate={handleCreateRule}
              onUpdate={(ruleId, payload) => void handleUpdateRule(ruleId, payload)}
              onDisable={openDisableRuleConfirm}
              onRestore={openRestoreRuleConfirm}
            />
          </TabsContent>

          <TabsContent value="history" className="console-v2__panel">
            <HistoryPanel members={bootstrap?.members ?? []} />
          </TabsContent>

          <TabsContent value="settings" className="console-v2__panel">
            <PreferencesPanel
              loading={loading}
              preferenceDraft={preferenceDraft}
              passwordDraft={passwordDraft}
              onPreferenceChange={setDirtyPreferenceDraft}
              onPasswordChange={setPasswordDraft}
              onSavePreferences={handleSavePreferences}
              onChangePassword={handleChangePassword}
            />
          </TabsContent>
        </section>
      </Tabs>

      <DangerConfirmModal
        open={Boolean(dangerAction && dangerConfirmCopy)}
        title={dangerConfirmCopy?.title ?? ''}
        description={dangerConfirmCopy?.description ?? ''}
        warning={dangerConfirmCopy?.warning}
        confirmLabel={dangerConfirmCopy?.confirmLabel}
        confirmVariant={dangerConfirmCopy?.confirmVariant}
        loading={loading}
        onCancel={() => setDangerAction(null)}
        onConfirm={handleConfirmDangerAction}
      />
    </main>
  )
}
