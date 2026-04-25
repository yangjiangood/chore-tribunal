import { Navigate } from 'react-router-dom'
import { useTribunal } from '../app/use-tribunal'
import { BoardScreen } from '../features/board/BoardScreen'

export function BoardPage() {
  const { isAuthenticated } = useTribunal()

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <BoardScreen />
}
