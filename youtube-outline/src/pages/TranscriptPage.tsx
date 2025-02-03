import { useSearchParams, Link } from 'react-router-dom'
import YouTube from 'react-youtube'

export default function TranscriptPage() {
  const [searchParams] = useSearchParams()
  const videoId = searchParams.get('v')

  return (
    <div className="min-h-screen bg-gray-100 lg:py-6">
      
      {/* Main content */}
      <div className="max-w-screen-2xl mx-auto lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Video section - full width on mobile, half on desktop */}
          <div className="lg:w-1/2">
            <div className="w-full">
                <YouTube 
                  videoId={videoId || ''}
                  opts={{
                    width: '100%',
                    height: '240',
                    playerVars: {
                      autoplay: 0,
                    },
                  }}
                  className="w-full"
                />
            </div>
            
            {/* Video title - only visible on mobile */}
            <div className="p-4 bg-white lg:hidden">
              <h1 className="text-lg font-bold text-gray-900">
                Video: {videoId}
              </h1>
            </div>
          </div>
          
          {/* Transcript section */}
          <div className="lg:w-1/2 bg-white lg:shadow-sm lg:rounded-lg">
            {/* Desktop title */}
            <div className="hidden lg:block p-6 border-b">
              <h1 className="text-2xl font-bold text-gray-900">
                Transcript for Video: {videoId}
              </h1>
            </div>
            
            {/* Transcript content */}
            <div className="p-4 lg:p-6">
              {/* TODO: Add actual transcript content */}
              <p className="text-gray-600">
                Loading transcript...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
