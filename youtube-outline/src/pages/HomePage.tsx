import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = new URL(youtubeUrl)
      navigate(`${url.pathname}${url.search}`)
    } catch (error) {
      console.error('Invalid URL:', error)
      // TODO: Show error to user
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">YouTube Transcript</h1>
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex gap-4 justify-center">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="enter a youtube url ..."
                className="flex-1 max-w-xl px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
