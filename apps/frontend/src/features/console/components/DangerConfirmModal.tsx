import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DangerConfirmModalProps {
  open: boolean
  title: string
  description: string
  warning?: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function DangerConfirmModal({
  open,
  title,
  description,
  warning,
  confirmLabel = '确认执行',
  confirmVariant = 'danger',
  loading = false,
  onCancel,
  onConfirm,
}: DangerConfirmModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="console-modal" role="dialog" aria-modal="true" aria-labelledby="console-danger-title">
      <div className="console-modal__backdrop" onClick={loading ? undefined : onCancel} />

      <div className="console-modal__card console-modal__card--confirm">
        <div className="console-modal__confirm">
          <header className="console-modal__confirm-header">
            <span className="console-modal__confirm-icon" aria-hidden="true">
              <AlertTriangle className="h-5 w-5" />
            </span>

            <div className="console-modal__confirm-copy">
              <p>操作确认</p>
              <h3 id="console-danger-title">{title}</h3>
            </div>
          </header>

          <div className="console-modal__confirm-body">
            <p>{description}</p>
            {warning ? <p className="console-modal__confirm-warning">{warning}</p> : null}
          </div>

          <footer className="console-modal__footer console-modal__footer--confirm">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
              取消
            </Button>
            <Button type="button" variant={confirmVariant} onClick={() => void onConfirm()} disabled={loading}>
              {confirmLabel}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  )
}
