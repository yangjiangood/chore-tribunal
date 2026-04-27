import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTribunal } from '../../app/use-tribunal'
import type { TaskType, VerdictPayload } from '../../lib/api'
import { BoardHeader } from './components/BoardHeader'
import { LogStrip } from './components/LogStrip'
import { MemberGrid } from './components/MemberGrid'
import { RuleStrip } from './components/RuleStrip'
import { UndoToast } from './components/UndoToast'
import { VerdictModal, type VerdictModalPreview } from './components/VerdictModal'
import { playBoardSuccessSound, playBoardTapSound, primeBoardAudio } from './board-sound'
import { resolveSoundEnabledPreference } from '@/lib/sound-preference'

export function BoardScreen() {
  const navigate = useNavigate()
  const {
    session,
    bootstrap,
    loading,
    logout,
    createScoreEvent,
    undoLastEvent,
    undoState,
    generateVerdictStream,
    getLatestVerdict,
  } = useTribunal()

  const [armedMemberId, setArmedMemberId] = useState<string | null>(null)
  const [armedTaskType, setArmedTaskType] = useState<TaskType | null>(null)
  const [verdictOpen, setVerdictOpen] = useState(false)
  const [verdictLoading, setVerdictLoading] = useState(false)
  const [verdict, setVerdict] = useState<VerdictPayload | null>(null)
  const [verdictPreview, setVerdictPreview] = useState<VerdictModalPreview | null>(null)
  const verdictAnimationKeyRef = useRef(0)

  const rankingMap = useMemo(
    () => new Map((bootstrap?.currentBoardSnapshot.rankings ?? []).map((item) => [item.memberId, item])),
    [bootstrap],
  )

  const activeMembers = useMemo(() => {
    const members = (bootstrap?.members ?? []).filter((member) => member.status === 'ACTIVE')

    return [...members].sort((left, right) => {
      const leftRanking = rankingMap.get(left.id)
      const rightRanking = rankingMap.get(right.id)

      if ((rightRanking?.score ?? 0) !== (leftRanking?.score ?? 0)) {
        return (rightRanking?.score ?? 0) - (leftRanking?.score ?? 0)
      }

      return left.sortOrder - right.sortOrder
    })
  }, [bootstrap, rankingMap])

  const currentMember = useMemo(
    () => activeMembers.find((member) => member.id === armedMemberId) ?? null,
    [activeMembers, armedMemberId],
  )

  const visibleTaskRules = useMemo(() => {
    if (!armedTaskType) {
      return []
    }

    return (bootstrap?.taskRules ?? [])
      .filter((rule) => rule.status === 'ACTIVE' && rule.taskType === armedTaskType)
      .sort((left, right) => {
        if (left.isPinned !== right.isPinned) {
          return left.isPinned ? -1 : 1
        }

        return left.sortOrder - right.sortOrder
      })
  }, [armedTaskType, bootstrap])

  const soundEnabled = useMemo(() => {
    if (!bootstrap?.preferences) {
      return true
    }

    return resolveSoundEnabledPreference(bootstrap.preferences.soundEnabled)
  }, [bootstrap])

  function nextVerdictAnimationKey() {
    verdictAnimationKeyRef.current += 1
    return verdictAnimationKeyRef.current
  }

  function syncPreviewWithVerdict(payload: VerdictPayload, animationKey = nextVerdictAnimationKey()) {
    setVerdictPreview({
      weekId: payload.weekId,
      content: payload.content,
      source: payload.source,
      generatedAt: payload.generatedAt,
      isStreaming: false,
      animationKey,
    })
  }

  async function startVerdictStream(currentWeekId: string) {
    const animationKey = nextVerdictAnimationKey()

    setVerdict(null)
    setVerdictPreview({
      weekId: currentWeekId,
      content: '',
      source: null,
      generatedAt: null,
      isStreaming: true,
      animationKey,
    })

    const created = await generateVerdictStream(
      {
        weekId: currentWeekId,
      },
      {
        onMeta: (event) => {
          setVerdictPreview((current) => ({
            weekId: event.weekId,
            content: current?.content ?? '',
            source: current?.source ?? null,
            generatedAt: current?.generatedAt ?? null,
            isStreaming: true,
            animationKey: current?.animationKey ?? animationKey,
          }))
        },
        onDelta: (event) => {
          setVerdictPreview((current) => ({
            weekId: current?.weekId ?? currentWeekId,
            content: event.content,
            source: event.source,
            generatedAt: current?.generatedAt ?? null,
            isStreaming: true,
            animationKey: current?.animationKey ?? animationKey,
          }))
        },
        onReplace: (event) => {
          const replaceAnimationKey = nextVerdictAnimationKey()
          setVerdictPreview((current) => ({
            weekId: current?.weekId ?? currentWeekId,
            content: event.content,
            source: event.source,
            generatedAt: current?.generatedAt ?? null,
            isStreaming: false,
            animationKey: replaceAnimationKey,
          }))
        },
      },
    )

    setVerdict(created)
    setVerdictPreview((current) => ({
      weekId: created.weekId,
      content: created.content,
      source: created.source,
      generatedAt: created.generatedAt,
      isStreaming: false,
      animationKey: current?.animationKey ?? animationKey,
    }))
  }

  if (!session) {
    return null
  }

  async function openVerdict() {
    const currentWeekId = bootstrap?.family.currentWeekId

    if (!currentWeekId) {
      return
    }

    if (verdict?.weekId === currentWeekId) {
      if (!verdictPreview) {
        syncPreviewWithVerdict(verdict)
      }
      setVerdictOpen(true)
      return
    }

    setVerdictOpen(true)
    setVerdictLoading(true)

    try {
      const latest = await getLatestVerdict(currentWeekId)
      if (latest) {
        setVerdict(latest)
        syncPreviewWithVerdict(latest)
      } else {
        await startVerdictStream(currentWeekId)
      }
    } finally {
      setVerdictLoading(false)
    }
  }

  async function regenerateVerdict() {
    const currentWeekId = bootstrap?.family.currentWeekId

    if (!currentWeekId) {
      return
    }

    setVerdictLoading(true)

    try {
      await startVerdictStream(currentWeekId)
    } finally {
      setVerdictLoading(false)
    }
  }

  function handleArmMember(memberId: string, taskType: TaskType) {
    setArmedMemberId(memberId)
    setArmedTaskType(taskType)

    if (soundEnabled) {
      primeBoardAudio()
      playBoardTapSound()
    }
  }

  async function handleSelectRule(rule: (typeof visibleTaskRules)[number]) {
    if (!currentMember) {
      return
    }

    if (soundEnabled) {
      primeBoardAudio()
    }

    await createScoreEvent(currentMember.id, rule, currentMember.nickname)

    if (soundEnabled) {
      playBoardSuccessSound()
    }

    setArmedMemberId(null)
    setArmedTaskType(null)
  }

  return (
    <main className="ios-board">
      <BoardHeader
        bootstrap={bootstrap}
        loading={loading}
        onOpenConsole={() => navigate('/console')}
        onOpenVerdict={() => void openVerdict()}
        onLogout={() => void logout()}
      />

      <section className="ios-board-main">
        <MemberGrid
          members={activeMembers}
          rankingMap={rankingMap}
          armedMemberId={armedMemberId}
          onArmMember={handleArmMember}
        />
      </section>

      <LogStrip
        logs={bootstrap?.currentBoardSnapshot.recentLogs ?? []}
        members={bootstrap?.members ?? []}
      />

      <RuleStrip
        currentMemberName={currentMember?.nickname ?? null}
        armedTaskType={armedTaskType}
        rules={visibleTaskRules}
        onSelectRule={(rule) => {
          void handleSelectRule(rule)
        }}
        onClose={() => {
          setArmedMemberId(null)
          setArmedTaskType(null)
        }}
      />

      {undoState ? (
        <UndoToast
          memberNickname={undoState.memberNickname}
          taskLabel={undoState.taskLabel}
          onUndo={() => void undoLastEvent()}
        />
      ) : null}

      <VerdictModal
        open={verdictOpen}
        loading={verdictLoading}
        preview={verdictPreview}
        onClose={() => setVerdictOpen(false)}
        onRegenerate={() => void regenerateVerdict()}
      />
    </main>
  )
}
