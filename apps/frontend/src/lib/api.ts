export type TaskType = 'LIGHT' | 'CORE' | 'EPIC'
export type EventStatus = 'PENDING' | 'CONFIRMED' | 'REVERTED'
export type MemberStatus = 'ACTIVE' | 'DISABLED' | 'LEFT'
export type TaskRuleStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED'
export type AnalyticsRange = '1w' | '4w' | '8w' | '12w'

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: Record<string, unknown>
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface FamilySummary {
  id: string
  name: string
  timezone: string
  currentWeekId: string
}

export interface Member {
  id: string
  familyId: string
  nickname: string
  avatarType: string
  avatarUrl: string | null
  avatarValue: string | null
  cardColor: string
  sortOrder: number
  status: MemberStatus
  joinedWeekId: string
  leftWeekId: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskRule {
  id: string
  familyId: string
  taskType: TaskType
  label: string
  scoreDelta: number
  sortOrder: number
  isPinned: boolean
  status: TaskRuleStatus
  createdAt: string
  updatedAt: string
}

export interface Preferences {
  id: string
  familyId: string
  defaultFullscreen: boolean
  soundEnabled: boolean
  motionEnabled: boolean
  fontScale: string
  themeStyle: string
  logSpeed: string
  cardDensity: string
  idleReminderEnabled: boolean
  verdictPersona: string
  verdictToxicityLevel: number
  allowAttack: boolean
  allowHumiliation: boolean
  allowLabeling: boolean
  updatedAt: string
}

export interface BoardSnapshot {
  rankings: Array<{
    memberId: string
    nickname: string
    avatarType: string
    avatarUrl: string | null
    avatarValue: string | null
    cardColor: string
    sortOrder: number
    score: number
    confirmedCount: number
    pendingCount: number
  }>
  recentLogs: Array<{
    eventId: string
    memberId: string
    memberNickname: string
    taskLabel: string
    taskType: TaskType
    scoreDelta: number
    status: EventStatus
    createdAt: string
  }>
  scoreSummary: {
    totalScore: number
    totalEvents: number
    confirmedEvents: number
    pendingEvents: number
    revertedEvents: number
  }
}

export interface BootstrapPayload {
  family: FamilySummary
  members: Member[]
  taskRules: TaskRule[]
  preferences: Preferences
  currentBoardSnapshot: BoardSnapshot
}

export interface AuthPayload {
  accessToken: string
  refreshToken: string
  expiresIn: number
  family: {
    id: string
    name: string
    currentWeekId: string
  }
}

export interface CreateEventPayload {
  event: {
    serverEventId: string
    clientEventId: string
    status: EventStatus
    undoToken: string
    undoExpiresAt: string
  }
  boardSnapshot: BoardSnapshot
}

export interface RevertEventPayload {
  reverted: boolean
  eventStatus: EventStatus
  boardSnapshot: BoardSnapshot
}

export interface EventHistoryItem {
  eventId: string
  memberId: string
  memberNickname: string
  taskLabel: string
  taskType: TaskType
  scoreDelta: number
  status: EventStatus
  weekId: string
  createdAt: string
  confirmedAt: string | null
  revertedAt: string | null
}

export interface EventListPayload {
  items: EventHistoryItem[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

export interface DeleteMemberPayload {
  deleted: boolean
  memberId: string
}

export interface DeleteTaskRulePayload {
  deleted: boolean
  ruleId: string
}

export interface AnalyticsOverviewPayload {
  range: AnalyticsRange
  referenceWeekId: string
  includedWeekIds: string[]
  overviewMetrics: {
    totalEvents: number
    totalScore: number
    activeMembers: number
    participatingMembers: number
    averageScorePerMember: number
    leaderNickname: string | null
    leaderScore: number
    scoreSpread: number
  }
  trendCharts: {
    weeklyTotals: Array<{
      weekId: string
      totalScore: number
      totalEvents: number
      confirmedEvents: number
      lightCount: number
      coreCount: number
      epicCount: number
    }>
    taskTypeDistribution: Array<{
      taskType: TaskType
      count: number
      totalScore: number
    }>
  }
  fairnessCharts: {
    memberScoreComparison: Array<{
      memberId: string
      nickname: string
      totalScore: number
      eventCount: number
      sharePercent: number
      averageScorePerEvent: number
    }>
    memberTaskTypeBreakdown: Array<{
      memberId: string
      nickname: string
      lightCount: number
      coreCount: number
      epicCount: number
    }>
  }
  fairnessInsight: {
    score: number
    level: 'excellent' | 'good' | 'watch' | 'risky'
    label: string
    summary: string
    dimensions: {
      participation: number
      balance: number
      rotation: number
    }
  }
  actionSuggestions: Array<{
    id: string
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    focusMemberNickname: string | null
    focusTaskType: TaskType | null
  }>
  weeklyReport: {
    title: string
    headline: string
    summary: string
    highlights: string[]
    closing: string
  }
  achievements: {
    weeklyTitles: Array<{
      id: string
      title: string
      description: string
      memberId: string | null
      memberNickname: string | null
      tone: 'gold' | 'violet' | 'teal' | 'rose'
    }>
    memberBadges: Array<{
      memberId: string
      memberNickname: string
      badges: Array<{
        id: string
        label: string
        description: string
        tone: 'gold' | 'violet' | 'teal' | 'rose'
      }>
    }>
  }
  systemSummary: {
    overall: string
    fairness: string
    trend: string
  }
}

export interface HonorsHallPayload {
  referenceWeekId: string
  trackedWeekIds: string[]
  weeklyHonorRolls: Array<{
    weekId: string
    totalScore: number
    totalEvents: number
    fairnessScore: number
    leaderNickname: string | null
    weeklyTitles: Array<{
      id: string
      title: string
      description: string
      memberId: string | null
      memberNickname: string | null
      tone: 'gold' | 'violet' | 'teal' | 'rose'
    }>
    memberBadges: Array<{
      memberId: string
      memberNickname: string
      badges: Array<{
        id: string
        label: string
        description: string
        tone: 'gold' | 'violet' | 'teal' | 'rose'
      }>
    }>
    memberSnapshots: Array<{
      memberId: string
      memberNickname: string
      totalScore: number
      eventCount: number
      lightCount: number
      coreCount: number
      epicCount: number
      titleIds: string[]
      badgeIds: string[]
    }>
  }>
  memberHall: Array<{
    memberId: string
    memberNickname: string
    totalBadgeEarned: number
    totalTitleEarned: number
    badgeCounts: Array<{
      id: string
      label: string
      tone: 'gold' | 'violet' | 'teal' | 'rose'
      count: number
      lastEarnedWeekId: string | null
    }>
    titleCounts: Array<{
      id: string
      label: string
      tone: 'gold' | 'violet' | 'teal' | 'rose'
      count: number
      lastEarnedWeekId: string | null
    }>
  }>
}

export type VerdictStatus = 'SUCCESS' | 'FAILED' | 'FALLBACK'
export type VerdictSource = 'AI' | 'FALLBACK_TEMPLATE'

export interface VerdictPayload {
  verdictId: string
  weekId: string
  status: VerdictStatus
  source: VerdictSource
  content: string
  generatedAt: string
  safetyStatus: string | null
}

export interface VerdictStreamMetaEvent {
  weekId: string
  persona: string
}

export interface VerdictStreamDeltaEvent {
  delta: string
  content: string
  source: 'AI'
}

export interface VerdictStreamReplaceEvent {
  content: string
  source: VerdictSource
  reason: string | null
}

export interface VerdictStreamHandlers {
  onMeta?: (event: VerdictStreamMetaEvent) => void
  onDelta?: (event: VerdictStreamDeltaEvent) => void
  onReplace?: (event: VerdictStreamReplaceEvent) => void
}

export interface SessionState {
  accessToken: string
  refreshToken: string
  familyId: string
  familyName: string
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  code: string
  details?: unknown

  constructor(message: string, code = 'HTTP_ERROR', details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

function makeUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue
    }
    query.set(key, String(value))
  }

  const text = query.toString()
  return text ? `?${text}` : ''
}

async function parseApiError(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as ApiSuccessResponse<unknown> | ApiErrorResponse

    if (!payload.success) {
      return new ApiError(payload.error.message, payload.error.code, payload.error.details)
    }
  }

  const fallbackMessage = (await response.text()) || response.statusText || 'Request failed'
  return new ApiError(fallbackMessage, 'HTTP_ERROR')
}

function parseEventStreamFrame(frame: string) {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of frame.split('\n')) {
    const normalized = line.trimEnd()
    if (normalized.startsWith('event:')) {
      event = normalized.slice(6).trim()
      continue
    }

    if (normalized.startsWith('data:')) {
      dataLines.push(normalized.slice(5).trimStart())
    }
  }

  if (!dataLines.length) {
    return null
  }

  return {
    event,
    data: dataLines.join('\n'),
  }
}

async function streamVerdictRequest(
  path: string,
  payload: Record<string, unknown>,
  accessToken: string,
  handlers: VerdictStreamHandlers = {},
) {
  const response = await fetch(makeUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  if (!response.body) {
    throw new ApiError('Stream body missing', 'STREAM_BODY_MISSING')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completedVerdict: VerdictPayload | null = null

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }).replace(/\r\n/g, '\n')

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const rawFrame = buffer.slice(0, boundary).trim()
      buffer = buffer.slice(boundary + 2)

      if (rawFrame) {
        const parsed = parseEventStreamFrame(rawFrame)
        if (parsed) {
          const payloadText = parsed.data.trim()
          const eventPayload = payloadText ? JSON.parse(payloadText) : null

          switch (parsed.event) {
            case 'meta':
              if (eventPayload) {
                handlers.onMeta?.(eventPayload as VerdictStreamMetaEvent)
              }
              break
            case 'delta':
              if (eventPayload) {
                handlers.onDelta?.(eventPayload as VerdictStreamDeltaEvent)
              }
              break
            case 'replace':
              if (eventPayload) {
                handlers.onReplace?.(eventPayload as VerdictStreamReplaceEvent)
              }
              break
            case 'complete':
              completedVerdict = (eventPayload as { verdict: VerdictPayload }).verdict
              break
            case 'error':
              throw new ApiError(
                (eventPayload as { message?: string }).message ?? 'Verdict stream failed',
                (eventPayload as { code?: string }).code ?? 'VERDICT_STREAM_FAILED',
              )
            default:
              break
          }
        }
      }

      boundary = buffer.indexOf('\n\n')
    }

    if (done) {
      break
    }
  }

  if (!completedVerdict) {
    throw new ApiError('Verdict stream ended before completion', 'VERDICT_STREAM_INCOMPLETE')
  }

  return completedVerdict
}

async function request<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(makeUrl(path), { ...init, headers })
  const data = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse

  if (!response.ok || !data.success) {
    const error = !data.success ? data.error : { code: 'HTTP_ERROR', message: response.statusText }
    throw new ApiError(error.message, error.code, error.details)
  }

  return data.data
}

export const api = {
  login(accountName: string, password: string) {
    return request<AuthPayload>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accountName, password, deviceLabel: 'web-board' }),
    })
  },

  register(accountName: string, password: string, familyName: string) {
    return request<{ familyId: string; accountName: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        accountName,
        password,
        confirmPassword: password,
        familyName,
        timezone: 'Asia/Shanghai',
      }),
    })
  },

  refresh(refreshToken: string) {
    return request<AuthPayload>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },

  logout(refreshToken: string) {
    return request<{ loggedOut: boolean }>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },

  changePassword(
    accessToken: string,
    payload: {
      currentPassword: string
      newPassword: string
      confirmPassword: string
    },
  ) {
    return request<{ changed: boolean }>(
      '/api/v1/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      accessToken,
    )
  },

  bootstrap(accessToken: string) {
    return request<BootstrapPayload>('/api/v1/families/me/bootstrap', {}, accessToken)
  },

  getPreferences(accessToken: string) {
    return request<Preferences>('/api/v1/preferences', {}, accessToken)
  },

  updatePreferences(accessToken: string, payload: Partial<Preferences>) {
    return request<Preferences>('/api/v1/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, accessToken)
  },

  createEvent(accessToken: string, payload: {
    memberId: string
    taskRuleId: string
    clientEventId: string
    timestamp: string
  }) {
    return request<CreateEventPayload>('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, accessToken)
  },

  revertEvent(accessToken: string, eventId: string, undoToken: string) {
    return request<RevertEventPayload>(`/api/v1/events/${eventId}/revert`, {
      method: 'POST',
      body: JSON.stringify({ undoToken }),
    }, accessToken)
  },

  listEvents(
    accessToken: string,
    query: {
      memberId?: string
      taskType?: TaskType
      taskLabel?: string
      status?: EventStatus
      page?: number
      pageSize?: number
    } = {},
  ) {
    const suffix = buildQuery(query)
    return request<EventListPayload>(`/api/v1/events${suffix}`, {}, accessToken)
  },

  getAnalyticsOverview(accessToken: string, range: AnalyticsRange = '4w', referenceWeekId?: string) {
    const suffix = buildQuery({ range, referenceWeekId })
    return request<AnalyticsOverviewPayload>(`/api/v1/analytics/overview${suffix}`, {}, accessToken)
  },

  getHonorsHall(accessToken: string) {
    return request<HonorsHallPayload>('/api/v1/analytics/honors', {}, accessToken)
  },

  generateVerdict(accessToken: string, payload: {
    weekId?: string
    persona?: string
    toxicityLevel?: number
    allowAttack?: boolean
    allowHumiliation?: boolean
    allowLabeling?: boolean
  } = {}) {
    return request<VerdictPayload>('/api/v1/verdicts/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, accessToken)
  },

  streamGenerateVerdict(
    accessToken: string,
    payload: {
      weekId?: string
      persona?: string
      toxicityLevel?: number
      allowAttack?: boolean
      allowHumiliation?: boolean
      allowLabeling?: boolean
    } = {},
    handlers: VerdictStreamHandlers = {},
  ) {
    return streamVerdictRequest('/api/v1/verdicts/generate/stream', payload, accessToken, handlers)
  },

  getLatestVerdict(accessToken: string, weekId?: string) {
    const suffix = buildQuery({ weekId })
    return request<VerdictPayload | null>(`/api/v1/verdicts/latest${suffix}`, {}, accessToken)
  },

  listMembers(accessToken: string, status?: MemberStatus) {
    const query = status ? `?status=${status}` : ''
    return request<Member[]>(`/api/v1/members${query}`, {}, accessToken)
  },

  createMember(accessToken: string, payload: {
    nickname: string
    avatarType: string
    avatarValue?: string
    cardColor: string
  }) {
    return request<Member>('/api/v1/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, accessToken)
  },

  disableMember(accessToken: string, memberId: string) {
    return request<Member>(`/api/v1/members/${memberId}/disable`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }, accessToken)
  },

  updateMember(accessToken: string, memberId: string, payload: {
    status?: MemberStatus
    nickname?: string
    avatarType?: string
    avatarUrl?: string
    avatarValue?: string
    cardColor?: string
  }) {
    return request<Member>(`/api/v1/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, accessToken)
  },

  deleteMember(accessToken: string, memberId: string) {
    return request<DeleteMemberPayload>(`/api/v1/members/${memberId}`, {
      method: 'DELETE',
    }, accessToken)
  },

  listTaskRules(accessToken: string, status?: TaskRuleStatus) {
    const query = status ? `?status=${status}` : ''
    return request<TaskRule[]>(`/api/v1/task-rules${query}`, {}, accessToken)
  },

  createTaskRule(accessToken: string, payload: {
    taskType: TaskType
    label: string
    sortOrder: number
  }) {
    return request<TaskRule>('/api/v1/task-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, accessToken)
  },

  disableTaskRule(accessToken: string, ruleId: string) {
    return request<TaskRule>(`/api/v1/task-rules/${ruleId}/disable`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }, accessToken)
  },

  deleteTaskRule(accessToken: string, ruleId: string) {
    return request<DeleteTaskRulePayload>(`/api/v1/task-rules/${ruleId}`, {
      method: 'DELETE',
    }, accessToken)
  },

  updateTaskRule(accessToken: string, ruleId: string, payload: {
    status?: TaskRuleStatus
    taskType?: TaskType
    label?: string
    scoreDelta?: number
    sortOrder?: number
  }) {
    return request<TaskRule>(`/api/v1/task-rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, accessToken)
  },
}
