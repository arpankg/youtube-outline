import { useSearchParams, Link } from 'react-router-dom'
import YouTube from 'react-youtube'
import { useEffect, useState, useRef } from 'react'

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export default function TranscriptPage() {
  const [searchParams] = useSearchParams()
  const videoId = searchParams.get('v')
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const playerRef = useRef<any>(null)

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
      console.log('Full transcript data:', data.transcript)
      console.log('Transcript stats:', {
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
                  onReady={(event) => {
                    playerRef.current = event.target;
                  }}
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
            <div className="p-4 lg:p-6 h-[calc(100vh-200px)] overflow-y-auto">
              {transcript.length === 0 ? (
                <p className="text-gray-600">Loading transcript...</p>
              ) : (
                <div className="space-y-2">
                  {transcript.map((segment, index) => (
                    <p
                      key={index}
                      onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.seekTo(segment.start);
                        }
                      }}
                      className="cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors flex gap-2"
                    >
                      <span className="text-gray-500 whitespace-nowrap">
                        [{Math.floor(segment.start)}s - {Math.floor(segment.start + segment.duration)}s]
                      </span>
                      <span>{segment.text}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
