import { Routes, Route } from 'react-router-dom'
import { ViewsProvider } from './contexts/ViewsContext'
import HomePage from './pages/HomePage'
import TranscriptPage from './pages/TranscriptPage'

function App() {
  return (
    <ViewsProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch" element={<TranscriptPage />} />
      </Routes>
    </ViewsProvider>
  )
}

export default App
