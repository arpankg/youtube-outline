import { useSearchParams, Link } from 'react-router-dom'
import YouTube from 'react-youtube'
import { useEffect, useState } from 'react'

export default function TranscriptPage() {
  const [searchParams] = useSearchParams()
  const videoId = searchParams.get('v')
  const [transcript, setTranscript] = useState<any[]>([])

  useEffect(() => {
    const fetchTranscript = async () => {
      console.log('Starting transcript fetch for videoId:', videoId)
      if (!videoId) {
        console.log('No videoId provided, skipping fetch')
        return
      }

      try {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
        console.log('Fetching transcript for YouTube URL:', youtubeUrl)
        
        const response = await fetch('http://localhost:8000/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
        }),
      })
      if (!response.ok) {
        console.error('Server error:', response.status, response.statusText)
        return
      }

      const data = await response.json()
      console.log('Received transcript data:', {
        length: data.transcript?.length || 0,
        firstItem: data.transcript?.[0],
        lastItem: data.transcript?.[data.transcript?.length - 1]
      })
      
      setTranscript(data.transcript || [])
      } catch (error) {
        console.error('Error fetching transcript:', error)
      }
    }

    console.log('TranscriptPage mounted/updated with videoId:', videoId)
    fetchTranscript()
  }, [videoId])

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
              {transcript.length === 0 ? (
                <p className="text-gray-600">Loading transcript...</p>
              ) : (
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(transcript, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
