import { Navigate } from 'react-router-dom'
import { useTribunal } from '../app/use-tribunal'
import { ConsoleScreen } from '../features/console/ConsoleScreen'

export function ConsolePage() {
  const { isAuthenticated } = useTribunal()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <ConsoleScreen />
}
