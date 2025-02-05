import { useSearchParams, Link } from 'react-router-dom'
import YouTube from 'react-youtube'
import { useEffect, useState, useRef } from 'react'
import { TranscriptSegment, OutlineSegment } from '../types/types'
import { formatTime } from '../utils/utils'

interface TranscriptContentProps {
  transcript: TranscriptSegment[]
  segmentElementsRef: React.MutableRefObject<(HTMLElement | null)[]>
  playerRef: React.MutableRefObject<any>
}

const TranscriptContent: React.FC<TranscriptContentProps> = ({
  transcript,
  segmentElementsRef,
  playerRef,
}) => {
  return transcript.length === 0 ? (
    <p id="transcript-loading" className="text-gray-600">Loading transcript...</p>
  ) : (
    <div id="transcript-content" className="space-y-2">
      {transcript.map((segment, index) => (
        <p
          key={index}
          id={`transcript-segment-${index}`}
          ref={el => segmentElementsRef.current[index] = el}
          onClick={() => {
            if (playerRef.current) {
              playerRef.current.seekTo(segment.start);
            }
          }}
          className="cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors flex gap-2"
        >
          <span className="text-gray-500 whitespace-nowrap">
            [{formatTime(segment.start)} - {formatTime(segment.start + segment.duration)}]
          </span>
          <span>{segment.text}</span>
        </p>
      ))}
    </div>
  )
}

interface OutlineViewProps {
  transcript: TranscriptSegment[]
  playerRef: React.MutableRefObject<any>
  outline: OutlineSegment[]
  isLoadingOutline: boolean
  onGenerateOutline: () => Promise<void>
}

const OutlineView: React.FC<OutlineViewProps> = ({
  transcript,
  playerRef,
  outline,
  isLoadingOutline,
  onGenerateOutline
}) => {
  useEffect(() => {
    if (outline.length === 0) {
      onGenerateOutline();
    }
  }, [outline.length, onGenerateOutline]);

  return isLoadingOutline ? (
    <p id="outline-loading" className="text-gray-600">Generating outline...</p>
  ) : outline.length === 0 ? (
    <p id="outline-empty" className="text-gray-600">No outline available</p>
  ) : (
    <div id="outline-content" className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Main Points</h2>
        {outline.map((segment, index) => {
          return (
            <p
              key={index}
              id={`outline-segment-${index}`}
              onClick={() => {
                if (playerRef.current) {
                  playerRef.current.seekTo(segment.start);
                }
              }}
              className="cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors flex gap-2"
            >
              <span className="text-gray-500 whitespace-nowrap">
                [{formatTime(segment.start)} - {formatTime(segment.start + segment.duration)}]
              </span>
              <span>{segment.text}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default function TranscriptPage() {
  const [searchParams] = useSearchParams()
  const videoId = searchParams.get('v')
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([])
  const [outline, setOutline] = useState<OutlineSegment[]>([])
  const [currentView, setCurrentView] = useState<'transcript' | 'outline'>('transcript')
  const [isLoadingOutline, setIsLoadingOutline] = useState(false)
  const playerRef = useRef<any>(null)
  const activeSegmentRef = useRef<number>(-1)
  const segmentElementsRef = useRef<(HTMLElement | null)[]>([])
  const intervalRef = useRef<number | null>(null)

  const findInitialSegment = (time: number): number => {
    let left = 0;
    let right = transcript.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (transcript[mid].start <= time && (mid === transcript.length - 1 || transcript[mid + 1].start > time)) {
        return mid;
      }
      if (transcript[mid].start > time) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    return -1;
  }

  const startHighlightInterval = () => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const currentTime = playerRef.current.getCurrentTime();
        console.log(`[Transcript Debug] Current video time: ${currentTime.toFixed(2)}s`);
        
        if (activeSegmentRef.current === -1) {
          console.log('[Transcript Debug] No active segment, finding initial segment...');
          activeSegmentRef.current = findInitialSegment(currentTime);
          console.log(`[Transcript Debug] Found initial segment index: ${activeSegmentRef.current}`);
          
          if (activeSegmentRef.current !== -1) {
            console.log(`[Transcript Debug] Highlighting initial segment with text: "${transcript[activeSegmentRef.current].text}"`);
            segmentElementsRef.current[activeSegmentRef.current]?.classList.add('text-red-500');
          }
        } else {
          const currentSegmentStart = transcript[activeSegmentRef.current].start;
          const currentSegmentEnd = currentSegmentStart + transcript[activeSegmentRef.current].duration;
          console.log(`[Transcript Debug] Current active segment: ${activeSegmentRef.current}`);
          console.log(`[Transcript Debug] Current segment time range: ${currentSegmentStart.toFixed(2)}s - ${currentSegmentEnd.toFixed(2)}s`);
          console.log(`[Transcript Debug] Current segment text: "${transcript[activeSegmentRef.current].text}"`);
          
          if (Math.abs(currentTime - currentSegmentStart) > 2) {
            console.log('[Transcript Debug] Detected significant time jump');
            console.log(`[Transcript Debug] Time difference: ${Math.abs(currentTime - currentSegmentStart).toFixed(2)}s`);
            
            console.log(`[Transcript Debug] Removing highlight from segment ${activeSegmentRef.current}`);
            segmentElementsRef.current[activeSegmentRef.current]?.classList.remove('text-red-500');
            
            const previousSegment = activeSegmentRef.current;
            activeSegmentRef.current = findInitialSegment(currentTime);
            console.log(`[Transcript Debug] Binary search found new segment: ${activeSegmentRef.current} (previous: ${previousSegment})`);
            
            if (activeSegmentRef.current !== -1) {
              console.log(`[Transcript Debug] Highlighting new segment with text: "${transcript[activeSegmentRef.current].text}"`);
              segmentElementsRef.current[activeSegmentRef.current]?.classList.add('text-red-500');
            }
          } else if (activeSegmentRef.current < transcript.length - 1 && 
              transcript[activeSegmentRef.current + 1].start <= currentTime) {
            console.log('[Transcript Debug] Moving to next segment linearly');
            console.log(`[Transcript Debug] Next segment start time: ${transcript[activeSegmentRef.current + 1].start.toFixed(2)}s`);
            
            console.log(`[Transcript Debug] Removing highlight from segment ${activeSegmentRef.current}`);
            segmentElementsRef.current[activeSegmentRef.current]?.classList.remove('text-red-500');
            
            activeSegmentRef.current++;
            console.log(`[Transcript Debug] Highlighting new segment ${activeSegmentRef.current} with text: "${transcript[activeSegmentRef.current].text}"`);
            segmentElementsRef.current[activeSegmentRef.current]?.classList.add('text-red-500');
          }
        }
      }, 100);
    }
  };

  const stopHighlightInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const fetchOutline = async () => {
    if (!transcript.length) return;
    
    setIsLoadingOutline(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript
        }),
      });
      
      if (!response.ok) {
        console.error('Error generating outline:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      setOutline(data.points || []);
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setIsLoadingOutline(false);
    }
  };

  useEffect(() => {
    return () => stopHighlightInterval();
  }, []);

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
        
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/transcript`, {
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
    <div id="transcript-page-container" className="min-h-screen bg-gray-100 lg:py-6">
      <div id="content-wrapper" className="mx-auto lg:px-8 overflow-hidden">
        <div id="layout-container" className="flex flex-col md:flex-row gap-6 h-screen md:h-auto max-h-screen">
          <div id="video-section" className="flex-none md:flex-1">
            <div id="video-player-container" className="w-full">
                <YouTube 
                  videoId={videoId || ''}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 0,
                    },
                  }}
                  className="w-full aspect-video"
                  onReady={(event) => {
                    console.log('[YouTube] Player ready event received');
                    playerRef.current = event.target;
                  }}
                  onStateChange={(event) => {
                    const playerState = event.data;
                    console.log('[YouTube] Player state changed to:', playerState);
                    
                    if (playerState === 1) { // Playing
                      console.log('[YouTube] Video started playing, starting highlight interval');
                      startHighlightInterval();
                    } else { // Any other state (paused, ended, etc)
                      console.log('[YouTube] Video stopped playing, stopping highlight interval');
                      stopHighlightInterval();
                    }
                  }}
                />
            </div>
            
            <div id="mobile-video-info" className="p-4 bg-white lg:hidden">
              <h1 className="text-lg font-bold text-gray-900">
                Video: {videoId}
              </h1>
            </div>
          </div>
          
          <div id="transcript-sidebar" className="w-full lg:w-[600px] bg-white shadow-sm rounded-lg flex-1 max-h-100 lg:flex-none">
            <div id="view-toggle-section" className="block p-4 border-b">
              <div className="container mx-auto px-2">
                <div id="toggle-buttons" className="flex space-x-4">
                  <button 
                    id="transcript-view-button"
                    className={`px-4 py-2 ${currentView === 'transcript' ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded hover:bg-blue-600`}
                    onClick={() => setCurrentView('transcript')}
                  >
                    Transcript View
                  </button>
                  <button 
                    id="outline-view-button"
                    className={`px-4 py-2 ${currentView === 'outline' ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded hover:bg-blue-600`}
                    onClick={() => {
                      setCurrentView('outline');
                      if (!outline.length) {
                        fetchOutline();
                      }
                    }}
                  >
                    Outline View
                  </button>
                </div>
                <h1 className="text-2xl font-bold mt-2">
                  {currentView === 'transcript' ? 'Transcript' : 'Outline'} for Video: {videoId}
                </h1>
              </div>
            </div>
            
            <div id="content-view-container" className="p-4 lg:p-6 h-[calc(100vh-200px)] overflow-y-auto">
              {currentView === 'transcript' ? (
                <TranscriptContent
                  transcript={transcript}
                  segmentElementsRef={segmentElementsRef}
                  playerRef={playerRef}
                />
              ) : (
                <OutlineView
                  transcript={transcript}
                  playerRef={playerRef}
                  outline={outline}
                  isLoadingOutline={isLoadingOutline}
                  onGenerateOutline={fetchOutline}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
