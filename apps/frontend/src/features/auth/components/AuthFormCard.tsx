import { LoaderCircle, LogIn, UserPlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FormEvent, ReactNode } from 'react'
import type { AuthMode } from '../types'
import { AuthModeSwitch } from './AuthModeSwitch'

type AuthFormCardProps = {
  mode: AuthMode
  loading: boolean
  submitError: string | null
  onModeChange: (mode: AuthMode) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}

const copy = {
  login: {
    eyebrow: '登录家庭空间',
    title: '继续进入控制台和打卡主屏',
    description: '使用当前家庭统一账号登录，数据会直接同步到你正在维护的家庭空间。',
    submitLabel: '进入家庭空间',
    submitIcon: LogIn,
  },
  register: {
    eyebrow: '创建家庭账号',
    title: '先创建账号，再直接进入系统',
    description: '注册成功后会自动登录，并创建你的默认家庭空间。',
    submitLabel: '创建并进入',
    submitIcon: UserPlus2,
  },
} as const

export function AuthFormCard({
  mode,
  loading,
  submitError,
  onModeChange,
  onSubmit,
  children,
}: AuthFormCardProps) {
  const currentCopy = copy[mode]
  const SubmitIcon = currentCopy.submitIcon

  return (
    <section className="auth-form-card" data-mode={mode}>
      <AuthModeSwitch mode={mode} onModeChange={onModeChange} />

      <header className="auth-form-card__header">
        <p>{currentCopy.eyebrow}</p>
        <h2>{currentCopy.title}</h2>
        <span>{currentCopy.description}</span>
      </header>

      {submitError ? <div className="auth-form-card__error">{submitError}</div> : null}

      <form className="auth-form-card__form" onSubmit={onSubmit}>
        <div className="auth-form-card__fields">{children}</div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="auth-form-card__submit"
        >
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <SubmitIcon size={18} />}
          {loading ? '处理中...' : currentCopy.submitLabel}
        </Button>
      </form>

      <footer className="auth-form-card__footer">
        <div>
          <span>演示账号</span>
          <strong>tribunal-demo / 123456</strong>
        </div>
        <div>
          <span>默认时区</span>
          <strong>Asia/Shanghai</strong>
        </div>
      </footer>
    </section>
  )
}
