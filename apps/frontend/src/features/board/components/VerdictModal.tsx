import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import type { VerdictPayload } from '../../../lib/api'

interface VerdictModalProps {
  open: boolean
  loading: boolean
  verdict: VerdictPayload | null
  onClose: () => void
  onRegenerate: () => void
}

export function VerdictModal({
  open,
  loading,
  verdict,
  onClose,
  onRegenerate,
}: VerdictModalProps) {
  const [visibleLength, setVisibleLength] = useState(0)

  const content = verdict?.content ?? ''
  const isAnimating = !loading && visibleLength < content.length
  const renderedContent = useMemo(() => content.slice(0, visibleLength), [content, visibleLength])

  useEffect(() => {
    if (!open || loading) {
      return
    }

    setVisibleLength(0)
  }, [open, loading, content])

  useEffect(() => {
    if (!open || loading || !content || visibleLength >= content.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setVisibleLength((current) => Math.min(current + 18, content.length))
    }, 18)

    return () => window.clearTimeout(timer)
  }, [open, loading, content, visibleLength])

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
            <h3>{verdict ? `${verdict.weekId} 周结算` : '正在生成本周裁决'}</h3>
            <p>
              {verdict
                ? verdict.source === 'AI'
                  ? '本次为 AI 正式裁决结果。'
                  : '本次为系统自动降级生成的简版裁决。'
                : '正在整理本周数据并生成可朗读的裁决文案。'}
            </p>
          </div>

          {verdict ? (
            <div className={`ios-verdict-modal__badge ${verdict.source === 'AI' ? 'is-ai' : 'is-fallback'}`}>
              <Sparkles size={14} />
              <strong>{verdict.source === 'AI' ? 'AI 裁决' : '降级模板'}</strong>
            </div>
          ) : null}
        </header>

        <div className="ios-verdict-modal__body">
          {loading ? (
            <article className="ios-verdict-modal__loading">
              <LoaderCircle size={20} className="animate-spin" />
              <strong>裁判正在翻卷宗</strong>
              <p>会优先尝试真实 AI 生成，失败时自动切换为本地降级模板。</p>
            </article>
          ) : verdict ? (
            <article className="ios-verdict-modal__content">
              <small>
                生成时间{' '}
                {new Intl.DateTimeFormat('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(verdict.generatedAt))}
              </small>
              <div className="ios-verdict-modal__copy">{renderedContent}</div>
            </article>
          ) : (
            <article className="ios-verdict-modal__loading">
              <strong>当前还没有判决结果</strong>
              <p>可以重新触发一次生成。</p>
            </article>
          )}
        </div>

        <footer className="ios-verdict-modal__footer">
          <button type="button" className="ios-verdict-modal__action" onClick={onClose}>
            关闭
          </button>
          {verdict && isAnimating ? (
            <button
              type="button"
              className="ios-verdict-modal__action ios-verdict-modal__action--primary"
              onClick={() => setVisibleLength(content.length)}
            >
              跳过动画
            </button>
          ) : null}
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
