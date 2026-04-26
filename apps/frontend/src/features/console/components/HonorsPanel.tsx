import { LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTribunal } from '@/app/use-tribunal'
import type { HonorsHallPayload } from '@/lib/api'
import { HONOR_CATALOG } from './honor-visuals'
import { HonorsCatalogSection } from './honors/HonorsCatalogSection'
import { HonorsDetailModal } from './honors/HonorsDetailModal'
import { HonorsMemberProfileModal } from './honors/HonorsMemberProfileModal'
import { HonorsMembersSection } from './honors/HonorsMembersSection'
import { HonorsPosterModal } from './honors/HonorsPosterModal'
import { HonorsTimelineSection } from './honors/HonorsTimelineSection'
import { HonorsWeeklyPosterModal } from './honors/HonorsWeeklyPosterModal'
import {
  buildHonorDetailPayload,
  buildHonorRaritySummary,
  buildHonorsSummary,
  buildMemberProfilePayload,
  buildPosterSvg,
  buildWeeklyFamilyPosterSvg,
} from './honors/honors-panel.helpers'

export function HonorsPanel() {
  const { getHonorsHall, bootstrap } = useTribunal()
  const [hall, setHall] = useState<HonorsHallPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [selectedHonorId, setSelectedHonorId] = useState<string | null>(null)
  const [selectedPosterMemberId, setSelectedPosterMemberId] = useState<string | null>(null)
  const [posterDownloading, setPosterDownloading] = useState(false)
  const [posterFeedback, setPosterFeedback] = useState<string | null>(null)
  const [selectedWeekPosterId, setSelectedWeekPosterId] = useState<string | null>(null)
  const [weeklyPosterDownloading, setWeeklyPosterDownloading] = useState(false)
  const [weeklyPosterFeedback, setWeeklyPosterFeedback] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const payload = await getHonorsHall()
        if (!cancelled) {
          setHall(payload)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '荣誉殿堂加载失败。')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [getHonorsHall])

  const summary = useMemo(() => (hall ? buildHonorsSummary(hall) : null), [hall])
  const raritySummary = useMemo(() => (summary ? buildHonorRaritySummary(summary) : []), [summary])
  const memberLookup = useMemo(
    () => new Map((bootstrap?.members ?? []).map((member) => [member.id, member])),
    [bootstrap],
  )

  const selectedMemberProfile = useMemo(
    () => (hall && selectedMemberId ? buildMemberProfilePayload(hall, selectedMemberId) : null),
    [hall, selectedMemberId],
  )

  const selectedPosterProfile = useMemo(
    () => (hall && selectedPosterMemberId ? buildMemberProfilePayload(hall, selectedPosterMemberId) : null),
    [hall, selectedPosterMemberId],
  )

  const selectedHonorDetail = useMemo(
    () => (hall && summary && selectedHonorId ? buildHonorDetailPayload(hall, summary, selectedHonorId) : null),
    [hall, selectedHonorId, summary],
  )
  const selectedWeekPoster = useMemo(
    () => hall?.weeklyHonorRolls.find((item) => item.weekId === selectedWeekPosterId) ?? null,
    [hall, selectedWeekPosterId],
  )

  function openPoster(memberId: string) {
    setPosterFeedback(null)
    setSelectedPosterMemberId(memberId)
  }

  function openWeekPoster(weekId: string) {
    setWeeklyPosterFeedback(null)
    setSelectedWeekPosterId(weekId)
  }

  function openMember(memberId: string) {
    setSelectedHonorId(null)
    setSelectedMemberId(memberId)
  }

  async function handleDownloadPoster() {
    if (!selectedPosterProfile) {
      return
    }

    setPosterDownloading(true)
    setPosterFeedback(null)

    let objectUrl: string | null = null

    try {
      const svg = buildPosterSvg(selectedPosterProfile)
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      objectUrl = URL.createObjectURL(svgBlob)

      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('POSTER_IMAGE_LOAD_FAILED'))
        image.src = objectUrl as string
      })

      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1520
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('POSTER_CANVAS_CONTEXT_FAILED')
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `honor-poster-${selectedPosterProfile.member.memberNickname}.png`
      document.body.append(link)
      link.click()
      link.remove()

      setPosterFeedback('海报已开始下载，可以直接发到群里或作为比赛展示截图。')
    } catch {
      setPosterFeedback('海报生成失败了，请稍后再试一次。')
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      setPosterDownloading(false)
    }
  }

  async function handleDownloadWeeklyPoster() {
    if (!selectedWeekPoster) {
      return
    }

    setWeeklyPosterDownloading(true)
    setWeeklyPosterFeedback(null)

    let objectUrl: string | null = null

    try {
      const svg = buildWeeklyFamilyPosterSvg(selectedWeekPoster)
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      objectUrl = URL.createObjectURL(svgBlob)

      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('WEEKLY_POSTER_IMAGE_LOAD_FAILED'))
        image.src = objectUrl as string
      })

      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1520
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('WEEKLY_POSTER_CANVAS_CONTEXT_FAILED')
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = `weekly-honor-poster-${selectedWeekPoster.weekId}.png`
      document.body.append(link)
      link.click()
      link.remove()

      setWeeklyPosterFeedback('本周荣誉海报已开始下载，可以直接放到周报或比赛展示里。')
    } catch {
      setWeeklyPosterFeedback('本周海报生成失败了，请稍后再试一次。')
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      setWeeklyPosterDownloading(false)
    }
  }

  return (
    <div className="console-page-stack">
      <section className="console-analytics-toolbar console-honors-hero">
        <div className="console-analytics-toolbar__copy">
          <strong>荣誉殿堂</strong>
          <span>这里专门看长期积累的称号、徽章和人物画像。点开任意荣誉卡片，还可以继续查看解锁条件、收藏榜和历史获得记录。</span>
        </div>
      </section>

      {summary ? (
        <section className="console-analytics-overview-strip">
          <article className="console-analytics-pill">
            <span>已解锁图鉴</span>
            <strong>{summary.unlockedCatalogCount}/{HONOR_CATALOG.length}</strong>
            <p>
              {summary.unlockedCatalogCount >= HONOR_CATALOG.length
                ? '已经全图鉴解锁。'
                : `还差 ${HONOR_CATALOG.length - summary.unlockedCatalogCount} 项即可全解锁。`}
            </p>
          </article>

          <article className="console-analytics-pill">
            <span>累计荣誉次数</span>
            <strong>{summary.totalTitles + summary.totalBadges} 次</strong>
            <p>包含周称号与成员徽章，是整段历史里沉淀下来的荣誉总量。</p>
          </article>

          <article className="console-analytics-pill">
            <span>荣誉榜领先</span>
            <strong>{summary.leader?.memberNickname ?? '暂无'}</strong>
            <p>
              {summary.leader
                ? `已累计 ${summary.leader.totalTitleEarned + summary.leader.totalBadgeEarned} 次荣誉。`
                : '完成更多打卡后，这里会出现收藏领先者。'}
            </p>
          </article>
        </section>
      ) : null}

      {loading ? (
        <article className="console-empty-panel">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <strong>正在加载荣誉殿堂</strong>
          <p>系统正在整理历史称号、成员徽章和个人荣誉画像。</p>
        </article>
      ) : error ? (
        <article className="console-empty-panel">
          <strong>荣誉殿堂暂时不可用</strong>
          <p>{error}</p>
        </article>
      ) : hall && summary ? (
        <>
          <HonorsTimelineSection
            weeklyHonorRolls={hall.weeklyHonorRolls}
            onSelectHonor={setSelectedHonorId}
            onOpenWeekPoster={openWeekPoster}
          />

          <HonorsMembersSection
            memberHall={hall.memberHall}
            memberLookup={memberLookup}
            onOpenMember={setSelectedMemberId}
            onOpenPoster={openPoster}
            onSelectHonor={setSelectedHonorId}
          />

          <HonorsCatalogSection
            summary={summary}
            raritySummary={raritySummary}
            onSelectHonor={setSelectedHonorId}
          />

          <HonorsMemberProfileModal
            profile={selectedMemberProfile}
            memberRecord={selectedMemberProfile ? memberLookup.get(selectedMemberProfile.member.memberId) ?? null : null}
            onClose={() => setSelectedMemberId(null)}
            onSelectHonor={setSelectedHonorId}
            onOpenPoster={openPoster}
          />

          <HonorsPosterModal
            profile={selectedPosterProfile}
            feedback={posterFeedback}
            downloading={posterDownloading}
            onClose={() => setSelectedPosterMemberId(null)}
            onDownload={() => void handleDownloadPoster()}
          />

          <HonorsWeeklyPosterModal
            week={selectedWeekPoster}
            feedback={weeklyPosterFeedback}
            downloading={weeklyPosterDownloading}
            onClose={() => setSelectedWeekPosterId(null)}
            onDownload={() => void handleDownloadWeeklyPoster()}
          />

          <HonorsDetailModal
            detail={selectedHonorDetail}
            onClose={() => setSelectedHonorId(null)}
            onOpenMember={openMember}
          />
        </>
      ) : (
        <article className="console-empty-panel">
          <strong>暂无荣誉，完成打卡解锁更多徽章吧！</strong>
          <p>先去打卡面板累积本周记录，系统会在这里同步生成时间线、成员荣誉册和荣誉图鉴。</p>
        </article>
      )}
    </div>
  )
}
