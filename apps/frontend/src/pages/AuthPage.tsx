import { Navigate } from 'react-router-dom'
import { useTribunal } from '../app/use-tribunal'
import { AuthStage } from '../features/auth/AuthStage'

export function AuthPage() {
  const { isAuthenticated } = useTribunal()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="auth-page-shell relative z-10 mx-auto flex min-h-[100dvh] max-w-[1520px] box-border items-center px-5 py-5 md:py-6">
      <AuthStage />
    </main>
  )
}
