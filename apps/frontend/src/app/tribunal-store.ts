import { createContext } from 'react'
import type {
  AnalyticsOverviewPayload,
  AnalyticsRange,
  BootstrapPayload,
  EventListPayload,
  EventStatus,
  Member,
  MemberStatus,
  Preferences,
  SessionState,
  TaskRule,
  TaskRuleStatus,
  TaskType,
  VerdictPayload,
} from '../lib/api'

export type Notice = { type: 'success' | 'error'; message: string }

export type UndoState = {
  serverEventId: string
  clientEventId: string
  status: 'PENDING' | 'CONFIRMED' | 'REVERTED'
  undoToken: string
  undoExpiresAt: string
  memberNickname: string
  taskLabel: string
}

export type PreferenceDraft = Pick<
  Preferences,
  'verdictPersona' | 'verdictToxicityLevel' | 'allowAttack' | 'allowHumiliation' | 'allowLabeling'
>

export interface TribunalContextValue {
  session: SessionState | null
  bootstrap: BootstrapPayload | null
  loading: boolean
  notice: Notice | null
  undoState: UndoState | null
  isAuthenticated: boolean
  login: (accountName: string, password: string) => Promise<void>
  registerAndLogin: (accountName: string, password: string, familyName: string) => Promise<void>
  logout: () => Promise<void>
  createScoreEvent: (memberId: string, rule: TaskRule, memberNickname: string) => Promise<void>
  undoLastEvent: () => Promise<void>
  listEvents: (query?: {
    memberId?: string
    taskType?: TaskType
    taskLabel?: string
    status?: EventStatus
    page?: number
    pageSize?: number
  }) => Promise<EventListPayload>
  getAnalyticsOverview: (range?: AnalyticsRange) => Promise<AnalyticsOverviewPayload>
  generateVerdict: (payload?: {
    weekId?: string
    persona?: string
    toxicityLevel?: number
    allowAttack?: boolean
    allowHumiliation?: boolean
    allowLabeling?: boolean
  }) => Promise<VerdictPayload>
  getLatestVerdict: (weekId?: string) => Promise<VerdictPayload | null>
  listMembers: (status?: MemberStatus) => Promise<Member[]>
  listTaskRules: (status?: TaskRuleStatus) => Promise<TaskRule[]>
  refreshBootstrap: (successMessage?: string) => Promise<void>
  createMember: (payload: { nickname: string; avatarValue: string; cardColor: string }) => Promise<void>
  updateMember: (memberId: string, payload: {
    status?: MemberStatus
    nickname?: string
    avatarValue?: string
    cardColor?: string
  }) => Promise<void>
  disableMember: (memberId: string) => Promise<void>
  restoreMember: (memberId: string) => Promise<void>
  deleteMember: (memberId: string) => Promise<void>
  createTaskRule: (payload: {
    taskType: TaskRule['taskType']
    label: string
    sortOrder: number
  }) => Promise<void>
  updateTaskRule: (ruleId: string, payload: {
    status?: TaskRuleStatus
    taskType?: TaskRule['taskType']
    label?: string
    scoreDelta?: number
    sortOrder?: number
  }) => Promise<void>
  disableTaskRule: (ruleId: string) => Promise<void>
  restoreTaskRule: (ruleId: string) => Promise<void>
  savePreferences: (payload: PreferenceDraft) => Promise<void>
  changePassword: (payload: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => Promise<void>
  dismissNotice: () => void
}

export function pickPreferenceDraft(preferences: Preferences): PreferenceDraft {
  return {
    verdictPersona: preferences.verdictPersona,
    verdictToxicityLevel: preferences.verdictToxicityLevel,
    allowAttack: preferences.allowAttack,
    allowHumiliation: preferences.allowHumiliation,
    allowLabeling: preferences.allowLabeling,
  }
}

export const TribunalContext = createContext<TribunalContextValue | null>(null)
