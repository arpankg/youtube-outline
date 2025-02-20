import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { FeaturedSummaries } from '../components/FeaturedSummaries'
import { useAuth } from '../contexts/AuthContext'

type WatchedVideo = {
  video_id: string
  thumbnail: string
  title: string
  watch_date: string
}

export const DashboardPage = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [watchedVideos, setWatchedVideos] = useState<WatchedVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { session } = useAuth()

  useEffect(() => {
    const fetchWatchHistory = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const { data: profile, error: dbError } = await supabase
          .from('profiles')
          .select('watched_videos')
          .single()

        if (dbError) throw dbError
        setWatchedVideos(profile?.watched_videos || [])
      } catch (e) {
        console.error('Error fetching watch history:', e)
        setError('Failed to load watch history')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWatchHistory()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

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
            <Link to="/upgrade" className="text-lg text-gray-600 hover:text-gray-900">Go Pro</Link>
            <button 
              onClick={handleSignOut}
              className="rounded-lg bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left side - Form */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Welcome back, {session?.user?.email}!
              </h1>
              <p className="text-xl text-gray-600">
                Generate summaries and outlines for your favorite educational videos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Paste YouTube URL here"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Generate Outline
              </button>
            </form>

            {error && (
              <div className="rounded-lg bg-red-100 p-4 text-red-700">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : watchedVideos.length > 0 ? (
              <div className="mt-8">
                <h2 className="mb-4 text-xl font-semibold">Recently Watched</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {watchedVideos.slice(0, 12).map((video) => (
                    <div
                      key={video.video_id}
                      onClick={() => navigate(`/watch?v=${video.video_id}`)}
                      className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 transition-all hover:opacity-80"
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="aspect-video w-full object-cover"
                      />
                      <div className="p-3">
                        <h3 className="line-clamp-2 font-medium">{video.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(video.watch_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right side - Featured Summaries */}
          <div className="lg:col-span-6">
            <FeaturedSummaries />
          </div>
        </div>
      </div>
    </div>
  )
}
