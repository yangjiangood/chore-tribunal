import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import type { VerdictSource } from '../../../lib/api'

export interface VerdictModalPreview {
  weekId: string | null
  content: string
  source: VerdictSource | null
  generatedAt: string | null
  isStreaming: boolean
  animationKey: number
}

interface VerdictModalProps {
  open: boolean
  loading: boolean
  preview: VerdictModalPreview | null
  onClose: () => void
  onRegenerate: () => void
}

export function VerdictModal({
  open,
  loading,
  preview,
  onClose,
  onRegenerate,
}: VerdictModalProps) {
  const [visibleLength, setVisibleLength] = useState(0)

  const targetContent = preview?.content ?? ''
  const source = preview?.source ?? null
  const isStreaming = preview?.isStreaming ?? false
  const hasContent = targetContent.length > 0
  const renderedContent = useMemo(() => targetContent.slice(0, visibleLength), [targetContent, visibleLength])
  const showLoader = loading && !hasContent
  const showCursor = hasContent && (isStreaming || visibleLength < targetContent.length)
  const canSkipAnimation = hasContent && (isStreaming || visibleLength < targetContent.length)

  useEffect(() => {
    if (!open) {
      return
    }

    setVisibleLength(0)
  }, [open, preview?.animationKey])

  useEffect(() => {
    if (!open || !targetContent || visibleLength >= targetContent.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setVisibleLength((current) => Math.min(current + (isStreaming ? 10 : 18), targetContent.length))
    }, isStreaming ? 16 : 18)

    return () => window.clearTimeout(timer)
  }, [open, targetContent, visibleLength, isStreaming])

  if (!open) {
    return null
  }

  return (
    <div className="ios-verdict-modal" role="dialog" aria-modal="true" aria-label="家庭判决书">
      <div className="ios-verdict-modal__backdrop" onClick={onClose} />

      <section className="ios-verdict-modal__card">
        <button type="button" className="ios-verdict-modal__close" aria-label="关闭判决书" onClick={onClose}>
          <X size={18} />
        </button>

        <header className="ios-verdict-modal__header">
          <div>
            <span>家庭判决书</span>
            <h3>{preview?.weekId ? `${preview.weekId} 周结算` : '正在生成本周裁决'}</h3>
            <p>
              {source === 'AI'
                ? isStreaming
                  ? 'AI 正在逐段生成裁决内容，请稍候片刻。'
                  : '本次为 AI 正式裁决结果。'
                : source === 'FALLBACK_TEMPLATE'
                  ? '本次为系统自动降级生成的简版裁决。'
                  : '正在整理本周数据并生成可读的裁决文案。'}
            </p>
          </div>

          {source ? (
            <div className={`ios-verdict-modal__badge ${source === 'AI' ? 'is-ai' : 'is-fallback'}`}>
              <Sparkles size={14} />
              <strong>{source === 'AI' ? 'AI 裁决' : '降级模板'}</strong>
            </div>
          ) : null}
        </header>

        <div className="ios-verdict-modal__body">
          {showLoader ? (
            <article className="ios-verdict-modal__loading">
              <LoaderCircle size={20} className="animate-spin" />
              <strong>裁判正在翻卷宗</strong>
              <p>系统会优先尝试真实 AI 生成，失败时自动切换为本地降级模板。</p>
            </article>
          ) : preview ? (
            <article className="ios-verdict-modal__content">
              <small>
                {preview.generatedAt
                  ? `生成时间 ${new Intl.DateTimeFormat('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(preview.generatedAt))}`
                  : isStreaming
                    ? 'AI 正在输出中'
                    : '等待生成时间'}
              </small>
              <div className="ios-verdict-modal__copy">
                {renderedContent}
                {showCursor ? <span className="ios-verdict-modal__cursor" aria-hidden="true" /> : null}
              </div>
            </article>
          ) : (
            <article className="ios-verdict-modal__loading">
              <strong>当前还没有裁决结果</strong>
              <p>可以重新触发一次生成。</p>
            </article>
          )}
        </div>

        <footer className="ios-verdict-modal__footer">
          <button type="button" className="ios-verdict-modal__action" onClick={onClose}>
            关闭
          </button>
          <button
            type="button"
            className={`ios-verdict-modal__action ios-verdict-modal__action--secondary ${
              canSkipAnimation ? '' : 'is-hidden'
            }`}
            onClick={() => setVisibleLength(targetContent.length)}
            disabled={!canSkipAnimation}
            aria-hidden={!canSkipAnimation}
            tabIndex={canSkipAnimation ? 0 : -1}
          >
            跳过动画
          </button>
          <button
            type="button"
            className="ios-verdict-modal__action ios-verdict-modal__action--primary"
            onClick={onRegenerate}
            disabled={loading}
          >
            <RotateCcw size={16} />
            重新生成
          </button>
        </footer>
      </section>
    </div>
  )
}
