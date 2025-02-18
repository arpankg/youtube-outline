import { Routes, Route, Navigate } from 'react-router-dom'
import { ViewsProvider } from './contexts/ViewsContext'
import HomePage from './pages/HomePage'
import TranscriptPage from './pages/TranscriptPage'
import { SignInPage } from './pages/SignInPage'
import { DashboardPage } from './pages/DashboardPage'
import { UpgradePage } from './pages/UpgradePage'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppRoutes() {
  const { session } = useAuth()
  console.log('[App] Rendering', { session })
  
  return (
    <ViewsProvider>
      <Routes>
        <Route path="/" element={session ? <DashboardPage /> : <HomePage />} />
        <Route path="/watch" element={<TranscriptPage />} />
        <Route path="/signin" element={session ? <Navigate to="/" /> : <SignInPage />} />
        <Route path="/upgrade" element={<UpgradePage />} />
      </Routes>
    </ViewsProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
