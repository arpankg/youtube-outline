import { Routes, Route } from 'react-router-dom'
import { ViewsProvider } from './contexts/ViewsContext'
import HomePage from './pages/HomePage'
import TranscriptPage from './pages/TranscriptPage'
import { SignInPage } from './pages/SignInPage'

function App() {
  console.log('[App] Rendering');
  return (
    <ViewsProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch" element={<TranscriptPage />} />
        <Route path="/signin" element={<SignInPage />} />
      </Routes>
    </ViewsProvider>
  )
}

export default App
