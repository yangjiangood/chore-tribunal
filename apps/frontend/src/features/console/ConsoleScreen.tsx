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
import type { Member, TaskType } from '@/lib/api'
import { pickPreferenceDraft } from '@/app/tribunal-store'
import { useTribunal } from '@/app/use-tribunal'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { MembersPanel } from './components/MembersPanel'
import { PreferencesPanel } from './components/PreferencesPanel'
import { RulesPanel } from './components/RulesPanel'

type ControlTab = 'analytics' | 'members' | 'rules' | 'history' | 'settings'

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
    createMember,
    updateMember,
    disableMember,
    restoreMember,
    deleteMember,
    createTaskRule,
    updateTaskRule,
    disableTaskRule,
    savePreferences,
    changePassword,
  } = useTribunal()

  const [tab, setTab] = useState<ControlTab>('analytics')
  const [memberDraft, setMemberDraft] = useState({
    nickname: '',
    avatarValue: '👨',
    cardColor: 'archive-blue',
  })
  const [consoleMembers, setConsoleMembers] = useState<Member[]>([])
  const [ruleDraft, setRuleDraft] = useState({
    label: '',
    taskType: 'CORE' as TaskType,
    scoreDelta: 3,
    sortOrder: 10,
    isPinned: true,
  })
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
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

  async function handleCreateMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!memberDraft.nickname.trim()) {
      return
    }

    await createMember(memberDraft)
    await refreshConsoleMembers()
    setMemberDraft({
      nickname: '',
      avatarValue: '👨',
      cardColor: 'archive-blue',
    })
  }

  async function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ruleDraft.label.trim()) {
      return
    }

    await createTaskRule(ruleDraft)
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

  async function handleRefresh() {
    await refreshBootstrap('控制台数据已刷新')
    if (tab === 'members') {
      await refreshConsoleMembers()
    }
  }

  function handleTabChange(value: string) {
    const nextTab = value as ControlTab
    setTab(nextTab)

    if (nextTab === 'members') {
      void refreshConsoleMembers()
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
            <div>
              <p className="console-v2__eyebrow">家庭中控</p>
              <h1>{activeTab?.label ?? '控制台'}</h1>
            </div>

            <Button
              type="button"
              variant="primary"
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
              onDisable={(memberId) => void handleDisableMember(memberId)}
              onRestore={(memberId) => void handleRestoreMember(memberId)}
              onDelete={(memberId) => void handleDeleteMember(memberId)}
            />
          </TabsContent>

          <TabsContent value="rules" className="console-v2__panel">
            <RulesPanel
              rules={bootstrap?.taskRules ?? []}
              loading={loading}
              draft={ruleDraft}
              onDraftChange={setRuleDraft}
              onCreate={handleCreateRule}
              onUpdate={(ruleId, payload) => void updateTaskRule(ruleId, payload)}
              onDisable={(ruleId) => void disableTaskRule(ruleId)}
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
    </main>
  )
}
