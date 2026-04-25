import { useContext } from 'react'
import { TribunalContext } from './tribunal-store'

export function useTribunal() {
  const context = useContext(TribunalContext)

  if (!context) {
    throw new Error('useTribunal 必须在 TribunalProvider 内部使用。')
  }

  return context
}
