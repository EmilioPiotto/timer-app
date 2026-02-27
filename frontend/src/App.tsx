import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/shared/Header'
import HomePage from './components/Home/HomePage'
import MacroBuilderPage from './components/Macro/MacroBuilderPage'
import MacroLibraryPage from './components/Macro/MacroLibraryPage'
import TimerEditorPage from './components/Timer/TimerEditorPage'
import TimerRunnerPage from './components/Timer/TimerRunnerPage'

function AppInner() {
  const { pathname } = useLocation()
  const isRunner = pathname.endsWith('/run')
  return (
    <>
      {!isRunner && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/timers/new" element={<TimerEditorPage />} />
        <Route path="/timers/:id" element={<TimerEditorPage />} />
        <Route path="/timers/:id/run" element={<TimerRunnerPage />} />
        <Route path="/macros" element={<MacroLibraryPage />} />
        <Route path="/macros/new" element={<MacroBuilderPage />} />
        <Route path="/macros/:id" element={<MacroBuilderPage />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
