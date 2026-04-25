import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  ApiError,
  api,
  type AnalyticsRange,
  type AuthPayload,
  type BootstrapPayload,
  type Member,
  type MemberStatus,
  type SessionState,
  type TaskRule,
  type VerdictPayload,
} from '../lib/api'
import { createClientId } from '../lib/id'
import { clearSession, loadSession, saveSession } from '../lib/session'
import {
  TribunalContext,
  type Notice,
  type PreferenceDraft,
  type UndoState,
} from './tribunal-store'

function buildSession(auth: AuthPayload): SessionState {
  return {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    familyId: auth.family.id,
    familyName: auth.family.name,
  }
}

export function TribunalProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState | null>(() => loadSession())
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)

  function resetState() {
    setBootstrap(null)
    setUndoState(null)
  }

  function applyBootstrap(data: BootstrapPayload) {
    startTransition(() => {
      setBootstrap(data)
    })
  }

  function patchBoardSnapshot(nextBoardSnapshot: BootstrapPayload['currentBoardSnapshot']) {
    setBootstrap((current) => (current ? { ...current, currentBoardSnapshot: nextBoardSnapshot } : current))
  }

  function handleApiError(error: unknown) {
    if (error instanceof ApiError && error.code === 'UNAUTHORIZED') {
      clearSession()
      resetState()
      setSession(null)
    }

    setNotice({
      type: 'error',
      message: error instanceof Error ? error.message : '操作失败，请稍后再试。',
    })
  }

  async function authorize<T>(activeSession: SessionState, work: (accessToken: string) => Promise<T>) {
    try {
      return await work(activeSession.accessToken)
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'UNAUTHORIZED') {
        throw error
      }

      try {
        const refreshed = await api.refresh(activeSession.refreshToken)
        const nextSession = buildSession(refreshed)
        saveSession(nextSession)
        setSession(nextSession)
        return await work(nextSession.accessToken)
      } catch (refreshError) {
        clearSession()
        resetState()
        setSession(null)
        throw refreshError
      }
    }
  }

  async function withSession<T>(work: (accessToken: string) => Promise<T>) {
    if (!session) {
      throw new ApiError('当前会话已失效，请重新登录。', 'UNAUTHORIZED')
    }

    return authorize(session, work)
  }

  const initializeBoard = useEffectEvent(async (activeSession: SessionState) => {
    setLoading(true)
    try {
      const nextBootstrap = await authorize(activeSession, (accessToken) => api.bootstrap(accessToken))
      applyBootstrap(nextBootstrap)
    } catch (error) {
      handleApiError(error)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (!undoState) {
      return undefined
    }

    const timeout = Math.max(new Date(undoState.undoExpiresAt).getTime() - Date.now(), 0)
    const timer = window.setTimeout(() => setUndoState(null), timeout)
    return () => window.clearTimeout(timer)
  }, [undoState])

  useEffect(() => {
    if (!session) {
      return
    }

    const timer = window.setTimeout(() => {
      void initializeBoard(session)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [session])

  async function login(accountName: string, password: string) {
    setLoading(true)
    try {
      const nextSession = buildSession(await api.login(accountName.trim(), password))
      saveSession(nextSession)
      setSession(nextSession)
      setNotice({ type: 'success', message: '公屏看板恢复在线。' })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function registerAndLogin(accountName: string, password: string, familyName: string) {
    setLoading(true)
    try {
      await api.register(accountName.trim(), password, familyName.trim())
      const nextSession = buildSession(await api.login(accountName.trim(), password))
      saveSession(nextSession)
      setSession(nextSession)
      setNotice({ type: 'success', message: '家庭档案已创建，审判报已经挂上墙。' })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    const activeSession = session
    if (!activeSession) {
      return
    }

    setLoading(true)
    try {
      await api.logout(activeSession.refreshToken)
    } catch (error) {
      void error
    } finally {
      clearSession()
      resetState()
      setSession(null)
      setLoading(false)
      setNotice({ type: 'success', message: '当前家庭会话已退出。' })
    }
  }

  async function refreshBootstrap(successMessage?: string) {
    setLoading(true)
    try {
      const nextBootstrap = await withSession((accessToken) => api.bootstrap(accessToken))
      applyBootstrap(nextBootstrap)
      if (successMessage) {
        setNotice({ type: 'success', message: successMessage })
      }
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function createScoreEvent(memberId: string, rule: TaskRule, memberNickname: string) {
    setLoading(true)
    try {
      const payload = await withSession((accessToken) =>
        api.createEvent(accessToken, {
          memberId,
          taskRuleId: rule.id,
          clientEventId: createClientId(),
          timestamp: new Date().toISOString(),
        }),
      )

      patchBoardSnapshot(payload.boardSnapshot)
      setUndoState({
        ...payload.event,
        memberNickname,
        taskLabel: rule.label,
      })
      setNotice({ type: 'success', message: `${memberNickname} 已记上一笔「${rule.label}」。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function undoLastEvent() {
    if (!undoState) {
      return
    }

    setLoading(true)
    try {
      const payload = await withSession((accessToken) =>
        api.revertEvent(accessToken, undoState.serverEventId, undoState.undoToken),
      )

      patchBoardSnapshot(payload.boardSnapshot)
      setNotice({
        type: 'success',
        message: `${undoState.memberNickname} 的「${undoState.taskLabel}」已撤销。`,
      })
      setUndoState(null)
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function listEvents(query?: {
    memberId?: string
    taskType?: TaskRule['taskType']
    taskLabel?: string
    status?: 'PENDING' | 'CONFIRMED' | 'REVERTED'
    page?: number
    pageSize?: number
  }) {
    return withSession((accessToken) => api.listEvents(accessToken, query))
  }

  async function getAnalyticsOverview(range?: AnalyticsRange) {
    return withSession((accessToken) => api.getAnalyticsOverview(accessToken, range))
  }

  async function generateVerdict(payload?: {
    weekId?: string
    persona?: string
    toxicityLevel?: number
    allowAttack?: boolean
    allowHumiliation?: boolean
    allowLabeling?: boolean
  }): Promise<VerdictPayload> {
    try {
      return await withSession((accessToken) => api.generateVerdict(accessToken, payload))
    } catch (error) {
      handleApiError(error)
      throw error
    }
  }

  async function getLatestVerdict(weekId?: string): Promise<VerdictPayload | null> {
    try {
      return await withSession((accessToken) => api.getLatestVerdict(accessToken, weekId))
    } catch (error) {
      handleApiError(error)
      throw error
    }
  }

  async function listMembers(status?: MemberStatus): Promise<Member[]> {
    return withSession((accessToken) => api.listMembers(accessToken, status))
  }

  async function createMember(payload: { nickname: string; avatarValue: string; cardColor: string }) {
    setLoading(true)
    try {
      const created = await withSession((accessToken) =>
        api.createMember(accessToken, {
          nickname: payload.nickname.trim(),
          avatarType: 'emoji',
          avatarValue: payload.avatarValue.trim() || 'M',
          cardColor: payload.cardColor,
        }),
      )
      await refreshBootstrap()
      setNotice({ type: 'success', message: `新成员「${created.nickname}」已加入庭审名单。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function disableMember(memberId: string) {
    setLoading(true)
    try {
      const disabled = await withSession((accessToken) => api.disableMember(accessToken, memberId))
      await refreshBootstrap()
      setNotice({ type: 'success', message: `成员「${disabled.nickname}」已退席。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function updateMember(memberId: string, payload: {
    status?: MemberStatus
    nickname?: string
    avatarValue?: string
    cardColor?: string
  }) {
    setLoading(true)
    try {
      const updated = await withSession((accessToken) =>
        api.updateMember(accessToken, memberId, {
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.nickname ? { nickname: payload.nickname.trim() } : {}),
          ...(payload.avatarValue ? { avatarType: 'emoji', avatarValue: payload.avatarValue } : {}),
          ...(payload.cardColor ? { cardColor: payload.cardColor } : {}),
        }),
      )
      await refreshBootstrap()
      setNotice({ type: 'success', message: `成员「${updated.nickname}」已更新。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function restoreMember(memberId: string) {
    setLoading(true)
    try {
      const restored = await withSession((accessToken) =>
        api.updateMember(accessToken, memberId, {
          status: 'ACTIVE',
        }),
      )
      await refreshBootstrap()
      setNotice({ type: 'success', message: `成员「${restored.nickname}」已恢复启用。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function deleteMember(memberId: string) {
    setLoading(true)
    try {
      await withSession((accessToken) => api.deleteMember(accessToken, memberId))
      await refreshBootstrap()
      setNotice({ type: 'success', message: '成员已从控制台移除。' })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function createTaskRule(payload: {
    taskType: TaskRule['taskType']
    label: string
    scoreDelta: number
    sortOrder: number
    isPinned: boolean
  }) {
    setLoading(true)
    try {
      const created = await withSession((accessToken) =>
        api.createTaskRule(accessToken, {
          ...payload,
          label: payload.label.trim(),
        }),
      )
      await refreshBootstrap()
      setNotice({ type: 'success', message: `规则「${created.label}」已加入判例库。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function disableTaskRule(ruleId: string) {
    setLoading(true)
    try {
      const disabled = await withSession((accessToken) => api.disableTaskRule(accessToken, ruleId))
      await refreshBootstrap()
      setNotice({ type: 'success', message: `规则「${disabled.label}」已停用。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function updateTaskRule(ruleId: string, payload: {
    taskType?: TaskRule['taskType']
    label?: string
    scoreDelta?: number
    sortOrder?: number
    isPinned?: boolean
  }) {
    setLoading(true)
    try {
      const updated = await withSession((accessToken) =>
        api.updateTaskRule(accessToken, ruleId, {
          ...payload,
          ...(payload.label ? { label: payload.label.trim() } : {}),
        }),
      )
      await refreshBootstrap()
      setNotice({ type: 'success', message: `规则「${updated.label}」已更新。` })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function savePreferences(payload: PreferenceDraft) {
    setLoading(true)
    try {
      const nextPreferences = await withSession((accessToken) =>
        api.updatePreferences(accessToken, payload),
      )

      setBootstrap((current) => (current ? { ...current, preferences: nextPreferences } : current))
      setNotice({ type: 'success', message: '裁判风格偏好已保存。' })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function changePassword(payload: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) {
    setLoading(true)
    try {
      await withSession((accessToken) => api.changePassword(accessToken, payload))
      setNotice({ type: 'success', message: '密码已修改，当前设备会话保持在线。' })
    } catch (error) {
      handleApiError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <TribunalContext.Provider
      value={{
        session,
        bootstrap,
        loading,
        notice,
        undoState,
        isAuthenticated: Boolean(session),
        login,
        registerAndLogin,
        logout,
        createScoreEvent,
        undoLastEvent,
        listEvents,
        getAnalyticsOverview,
        generateVerdict,
        getLatestVerdict,
        listMembers,
        refreshBootstrap,
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
        dismissNotice: () => setNotice(null),
      }}
    >
      {children}
    </TribunalContext.Provider>
  )
}
