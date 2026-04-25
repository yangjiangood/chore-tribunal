import { useState, type FormEvent } from 'react'
import { useTribunal } from '../../app/use-tribunal'
import { ApiError } from '../../lib/api'
import { AuthField } from './components/AuthField'
import { AuthFormCard } from './components/AuthFormCard'
import { AuthHeroPanel } from './components/AuthHeroPanel'
import type { AuthFormErrors, AuthFormState, AuthMode } from './types'

const initialForm: AuthFormState = {
  accountName: 'tribunal-demo',
  password: '123456',
  confirmPassword: '123456',
  familyName: '周末裁判所',
}

function validateForm(mode: AuthMode, form: AuthFormState): AuthFormErrors {
  const errors: AuthFormErrors = {}

  if (!form.accountName.trim()) {
    errors.accountName = '请输入账号'
  } else if (form.accountName.trim().length > 50) {
    errors.accountName = '账号长度不能超过 50 个字符'
  }

  if (form.password.length < 6 || form.password.length > 20) {
    errors.password = '密码长度需要在 6 到 20 位之间'
  }

  if (mode === 'register') {
    if (!form.familyName.trim()) {
      errors.familyName = '请输入家庭名称'
    } else if (form.familyName.trim().length > 80) {
      errors.familyName = '家庭名称长度不能超过 80 个字符'
    }

    if (form.confirmPassword !== form.password) {
      errors.confirmPassword = '两次输入的密码不一致'
    }
  }

  return errors
}

export function AuthStage() {
  const { loading, login, registerAndLogin } = useTribunal()
  const [mode, setMode] = useState<AuthMode>('login')
  const [form, setForm] = useState<AuthFormState>(initialForm)
  const [errors, setErrors] = useState<AuthFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  function patchField<K extends keyof AuthFormState>(key: K, value: AuthFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError(null)
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode)
    setErrors({})
    setSubmitError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateForm(mode, form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    try {
      if (mode === 'register') {
        await registerAndLogin(
          form.accountName.trim(),
          form.password,
          form.familyName.trim(),
        )
        return
      }

      await login(form.accountName.trim(), form.password)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : '认证失败，请稍后再试',
      )
    }
  }

  return (
    <section className="auth-portal">
      <AuthHeroPanel />

      <AuthFormCard
        mode={mode}
        loading={loading}
        submitError={submitError}
        onModeChange={handleModeChange}
        onSubmit={handleSubmit}
      >
        <AuthField
          id="accountName"
          label="统一账号"
          hint="6-20 位密码即可"
          value={form.accountName}
          placeholder="例如 tribunal-demo"
          autoComplete="username"
          error={errors.accountName}
          onChange={(value) => patchField('accountName', value)}
        />

        <AuthField
          id="password"
          type="password"
          label="密码"
          hint="当前产品不做邮箱验证"
          value={form.password}
          placeholder="请输入密码"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          error={errors.password}
          onChange={(value) => patchField('password', value)}
        />

        {mode === 'register' ? (
          <>
            <AuthField
              id="confirmPassword"
              type="password"
              label="确认密码"
              hint="需要与上方密码一致"
              value={form.confirmPassword}
              placeholder="再次输入密码"
              autoComplete="new-password"
              error={errors.confirmPassword}
              onChange={(value) => patchField('confirmPassword', value)}
            />

            <AuthField
              id="familyName"
              label="家庭名称"
              hint="注册后会作为家庭空间名称"
              value={form.familyName}
              placeholder="例如 周末裁判所"
              autoComplete="organization"
              error={errors.familyName}
              onChange={(value) => patchField('familyName', value)}
            />
          </>
        ) : null}
      </AuthFormCard>
    </section>
  )
}
