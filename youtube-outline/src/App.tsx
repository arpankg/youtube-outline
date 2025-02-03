import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import TranscriptPage from './pages/TranscriptPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/watch" element={<TranscriptPage />} />
    </Routes>
  )
}

export default App
