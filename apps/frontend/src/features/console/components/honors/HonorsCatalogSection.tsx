import { LockKeyhole } from 'lucide-react'
import { HONOR_CATALOG, getHonorKindLabel, getHonorRarityLabel, getHonorToneClass } from '../honor-visuals'
import type { HonorRaritySummaryItem, HonorsSummary } from './honors-panel.helpers'

function renderCondition(condition: string) {
  const lines = condition
    .split(/[；;]/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line, index) => {
    const parts = line.split(/(\+\d|每周|累计|至少|\d+次|第一|解锁|本周|成员徽章|周称号)/g)

    return (
      <p key={`${condition}-${index}`}>
        {parts.map((part, partIndex) =>
          /(\+\d|每周|累计|至少|\d+次|第一|解锁|本周|成员徽章|周称号)/.test(part) ? (
            <strong key={`${part}-${partIndex}`}>{part}</strong>
          ) : (
            <span key={`${part}-${partIndex}`}>{part}</span>
          ),
        )}
      </p>
    )
  })
}

interface HonorsCatalogSectionProps {
  summary: HonorsSummary
  raritySummary: HonorRaritySummaryItem[]
  onSelectHonor: (honorId: string) => void
}

export function HonorsCatalogSection({
  summary,
  raritySummary,
  onSelectHonor,
}: HonorsCatalogSectionProps) {
  const progressPercent = Math.round((summary.unlockedCatalogCount / Math.max(HONOR_CATALOG.length, 1)) * 100)

  return (
    <article className="console-chart-card console-honor-catalog">
      <header className="console-chart-card__header console-chart-card__header--simple">
        <div>
          <p>荣誉图鉴</p>
          <h3>把整个荣誉体系做成可浏览的收藏册</h3>
          <small>这里适合比赛展示。它不仅告诉人“有什么荣誉”，还明确告诉人“如何解锁”和“是否已经有人拿到”。</small>
        </div>
      </header>

      <div className="console-honor-progress">
        <div className="console-honor-progress__meta">
          <strong>图鉴点亮进度</strong>
          <span>{summary.unlockedCatalogCount}/{HONOR_CATALOG.length} · {progressPercent}%</span>
        </div>
        <div className="console-honor-progress__track">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="console-honor-rarity-strip">
        {raritySummary.map((item) => (
          <article key={item.rarity} className={`console-honor-rarity-card is-${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.unlocked} / {item.count}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="console-honor-catalog-grid">
        {HONOR_CATALOG.map((item) => {
          const Icon = item.icon
          const unlocked =
            item.kind === 'badge'
              ? summary.unlockedBadgeIds.has(item.id)
              : summary.unlockedTitleIds.has(item.id) || summary.unlockedBadgeIds.has(item.id)

          return (
            <button
              key={item.id}
              type="button"
              className="console-honor-action"
              onClick={() => onSelectHonor(item.id)}
            >
              <div className={`console-honor-catalog-card is-${item.rarity} ${unlocked ? 'is-unlocked' : 'is-locked'}`}>
                <div className="console-honor-catalog-card__top">
                  <div className="console-honor-headline">
                    <div className={`console-honor-emblem ${getHonorToneClass(item.tone)} is-${item.rarity}`}>
                      <Icon className="h-5 w-5" />
                      <b>{item.emblem}</b>
                    </div>

                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.shortLabel}</p>
                    </div>
                  </div>

                  <div className="console-honor-catalog-card__badges">
                    <span>{getHonorRarityLabel(item.rarity)}</span>
                    <span>{getHonorKindLabel(item.kind)}</span>
                    <span>{unlocked ? '已点亮' : '待解锁'}</span>
                  </div>
                </div>

                <div className="console-honor-catalog-card__body">
                  <p>{item.flavor}</p>
                  {!unlocked ? (
                    <div className="console-honor-catalog-card__lock">
                      <LockKeyhole className="h-4 w-4" />
                      <span>未解锁</span>
                    </div>
                  ) : null}
                </div>

                <div className="console-honor-catalog-card__rule">
                  <span>解锁条件</span>
                  <div className="console-honor-catalog-card__rule-copy">{renderCondition(item.condition)}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </article>
  )
}
