import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TribunalProvider } from './app/tribunal-context'
import { AuthPage } from './pages/AuthPage'
import { BoardPage } from './pages/BoardPage'
import { ConsolePage } from './pages/ConsolePage'

function App() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="board-shell relative overflow-hidden">
        <div className="board-noise" />
        <div className="board-grid" />

        <BrowserRouter>
          <TribunalProvider>
            <Routes>
              <Route path="/" element={<BoardPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/console" element={<ConsolePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TribunalProvider>
        </BrowserRouter>
      </div>
    </div>
  )
}

export default App
