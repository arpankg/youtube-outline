import { useSearchParams, Link } from 'react-router-dom'
import YouTube from 'react-youtube'

export default function TranscriptPage() {
  const [searchParams] = useSearchParams()
  const videoId = searchParams.get('v')

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation bar */}
      <div className="bg-white shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-screen-2xl mx-auto">
          <Link 
            to="/"
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Video section */}
          <div className="lg:w-1/2 bg-white shadow-sm rounded-lg p-6">
            <YouTube 
              videoId={videoId || ''}
              opts={{
                width: '100%',
                height: '480',
                playerVars: {
                  autoplay: 0,
                },
              }}
            />
          </div>
          
          {/* Transcript section */}
          <div className="lg:w-1/2 bg-white shadow-sm rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Transcript for Video: {videoId}
            </h1>
            {/* TODO: Add actual transcript content */}
            <p className="text-gray-600">
              Loading transcript...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
