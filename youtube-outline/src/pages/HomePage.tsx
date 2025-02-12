import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FeaturedSummaries } from '../components/FeaturedSummaries'

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const platforms = ['YouTube', 'MIT Lectures', 'Khan Academy', 'TED talks', 'Veritasium', 'SmarterEveryDay']
  const [currentPlatform, setCurrentPlatform] = useState(0)
  const [isBlurred, setIsBlurred] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setIsBlurred(true)
      setTimeout(() => {
        setCurrentPlatform((prev) => (prev + 1) % platforms.length)
        setIsBlurred(false)
      }, 400)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation Bar */}
      <nav className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-3xl font-bold">LectureTube</div>
          <div className="flex items-center space-x-6">
            <button className="text-lg text-gray-600 hover:text-gray-900">Go Pro</button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Increased the left column to span 9 columns (3/4 of 12) */}
          {/* Left side - Image */}
          <div 
            className="hidden lg:block lg:col-span-8 relative w-full aspect-video pl-12"
            style={{
              perspective: '1000px',
              transformStyle: 'preserve-3d'
            }}
          >
            <div 
              className="w-full h-full rounded-xl overflow-hidden shadow-2xl animate-[float_6s_ease-in-out_infinite] animate-[rotate3d_8s_ease-in-out_infinite] hover:shadow-3xl"
            >
            <style jsx>{`
              @keyframes rotate3d {
                0%, 100% { transform: rotateX(-4deg) rotateY(6deg); }
                50% { transform: rotateX(0deg) rotateY(0deg); }
              }
            `}</style>
              <img
                src="https://placehold.co/1920x1080/e2e8f0/64748b"
                alt="Video Summary Concept"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right side - Content */}
          <div className="lg:col-span-4 space-y-8">
            {/* Hero Section */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 text-left leading-tight">
                Learn from
                <div 
                  className="text-blue-600 mt-2 transition-all duration-600"
                  style={{
                    filter: isBlurred ? 'blur(8px)' : 'blur(0)',
                    opacity: isBlurred ? 0 : 1,
                    transform: isBlurred ? 'scale(0.95)' : 'scale(1)'
                  }}
                >
                  {platforms[currentPlatform]}
                </div>
                <div className="mt-2">10x faster</div>
              </h1>
              <p className="text-xl text-gray-600 text-left">
                Get a detailed summary of any YouTube video. Ask ChatGPT questions about the video and get quick answers. Generate flashcards and test yourself on the lecture material with auto-generated quizzes.
              </p>
            </div>

            {/* Input Section */}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Enter a youtube video url"
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-black text-white font-medium rounded-lg
                             hover:bg-gray-800 transition-colors duration-200
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                >
                  Summarize
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="mt-24">
          <FeaturedSummaries />
        </div>
      </div>
    </div>
  )
}
