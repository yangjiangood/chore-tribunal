import { LockKeyhole, UserRoundPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AuthMode } from '../types'

type AuthModeSwitchProps = {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

export function AuthModeSwitch({ mode, onModeChange }: AuthModeSwitchProps) {
  return (
    <div className="auth-mode-switch" role="tablist" aria-label="认证方式切换">
      <Button
        type="button"
        variant={mode === 'login' ? 'primary' : 'subtle'}
        size="lg"
        className="auth-mode-switch__button"
        aria-pressed={mode === 'login'}
        data-active={mode === 'login' ? 'true' : 'false'}
        onClick={() => onModeChange('login')}
      >
        <LockKeyhole size={16} strokeWidth={2.1} />
        登录
      </Button>
      <Button
        type="button"
        variant={mode === 'register' ? 'primary' : 'subtle'}
        size="lg"
        className="auth-mode-switch__button"
        aria-pressed={mode === 'register'}
        data-active={mode === 'register' ? 'true' : 'false'}
        onClick={() => onModeChange('register')}
      >
        <UserRoundPlus size={16} strokeWidth={2.1} />
        注册
      </Button>
    </div>
  )
}
