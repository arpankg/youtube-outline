import { Routes, Route, Navigate } from 'react-router-dom'
import { ViewsProvider } from './contexts/ViewsContext'
import HomePage from './pages/HomePage'
import TranscriptPage from './pages/TranscriptPage'
import { SignInPage } from './pages/SignInPage'
import { DashboardPage } from './pages/DashboardPage'
import { UpgradePage } from './pages/UpgradePage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import DeepResearchPage from './pages/DeepResearchPage'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppRoutes() {
  const { session } = useAuth()
  console.log('[App] Rendering routes:', { 
    session: session ? {
      user: session.user.email,
      accessToken: session.access_token ? 'present' : 'missing',
      expiresAt: session.expires_at
    } : null,
    currentPath: window.location.pathname
  })
  
  return (
    <ViewsProvider>
      <Routes>
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <HomePage />} />
        <Route path="/dashboard" element={session ? <DashboardPage /> : <Navigate to="/signin" />} />
        <Route path="/watch" element={<TranscriptPage />} />
        <Route path="/signin" element={session ? <Navigate to="/dashboard" /> : <SignInPage />} />
        <Route path="/upgrade" element={<UpgradePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/deep-research" element={<DeepResearchPage />} />
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
