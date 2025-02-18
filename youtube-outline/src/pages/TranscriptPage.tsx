import { useSearchParams } from 'react-router-dom'
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube'
import { useEffect, useState, useRef } from 'react'
import { TranscriptSegment } from '../types/types'
import TranscriptContent, { TranscriptContentHandle } from '../components/TranscriptContent'
import OutlineView from '../components/OutlineView'
import ChatView from '../components/ChatView'
import QuizView from '../components/QuizView'
import { parseYouTubeUrl, fetchTranscript } from '../utils/utils'
import { DocumentTextIcon, BookOpenIcon, ChatBubbleLeftRightIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useViews } from '../contexts/ViewsContext'




export default function TranscriptPage() {
  const [searchParams] = useSearchParams()
  const url = searchParams.toString() ? `https://youtube.com/watch?${searchParams.toString()}` : ''
  const parsedUrl = parseYouTubeUrl(url)
  const videoId = parsedUrl?.videoId
  const [currentView, setCurrentView] = useState<'transcript' | 'outline' | 'chat' | 'quiz'>('transcript')
  const { setOutline, transcript, setTranscript } = useViews()
  const playerRef = useRef<any>(null)
  const segmentElementsRef = useRef<(HTMLElement | null)[]>([])
  const transcriptContentRef = useRef<TranscriptContentHandle>(null)

  useEffect(() => {
    // Clear outline and transcript when videoId changes
    setOutline([]);
    if (videoId) {
      setTranscript([]);
      const getTranscript = async () => {
        const newTranscript = await fetchTranscript(videoId);
        setTranscript(newTranscript);
      };
      getTranscript();
    }
  }, [videoId])

  console.log('[TranscriptPage] Rendering', { currentView });

  const [inputUrl, setInputUrl] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const parsed = parseYouTubeUrl(inputUrl)
    if (!parsed) {
      setError('Please enter a valid YouTube URL')
      return
    }
    
    const params = new URLSearchParams()
    params.set('v', parsed.videoId)
    if (parsed.timestamp) params.set('t', parsed.timestamp.toString())
    if (parsed.playlistId) params.set('list', parsed.playlistId)
    
    window.location.search = params.toString()
  }

  return (
    <div id="transcript-page-container" className="!h-screen overflow-hidden bg-gray-100">
      <div className="bg-white shadow-sm py-4 md:mb-6">
        <div className="container mx-auto px-4">
          <form onSubmit={handleSubmit} className="flex gap-4 items-center">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter YouTube URL"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Summarize 
            </button>
          </form>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
      <div id="content-wrapper" className="mx-auto lg:px-8 overflow-hidden pb-20 md:pb-0">
        <div id="layout-container" className="flex flex-col md:flex-row md:gap-6 max-h-screen md:h-auto">
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
                  onReady={(event: YouTubeEvent<YouTubePlayer>) => {
                    playerRef.current = event.target;
                  }}
                  onStateChange={(event: YouTubeEvent<YouTubePlayer>) => {
                    const playerState = event.data;
                    const currentTime = event.target.getCurrentTime();
                    
                    if (playerState === 1) { // Playing
                      transcriptContentRef.current?.startHighlightInterval();
                      transcriptContentRef.current?.jumpToTime(currentTime);
                    } else { // Any other state (paused, ended, etc)
                      transcriptContentRef.current?.stopHighlightInterval();
                    }
                  }}
                />
            </div>
          </div>
          
          <div id="transcript-sidebar" className="w-full lg:w-[600px] bg-white shadow-sm rounded-lg flex-1 max-h-100 lg:flex-none">
            <div id="view-toggle-section" className="hidden md:block p-4 border-b">
              <div className="container mx-auto px-2">
                <div id="toggle-buttons" className="flex space-x-4">
                  <button 
                    id="transcript-view-button"
                    className={`flex items-center gap-2 px-6 py-3 ${currentView === 'transcript' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50'} rounded-lg hover:bg-gray-100`}
                    onClick={() => {
                      console.log('[TranscriptPage] About to set currentView', {
                        oldView: currentView,
                        newView: 'transcript',
                        stack: new Error().stack
                      });
                      setCurrentView('transcript');
                    }}
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                    <span>Transcript</span>
                  </button>
                  <button 
                    id="outline-view-button"
                    className={`flex items-center gap-2 px-6 py-3 ${currentView === 'outline' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50'} rounded-lg hover:bg-gray-100`}
                    onClick={() => {
                      console.log('[TranscriptPage] About to set currentView', {
                        oldView: currentView,
                        newView: 'outline',
                        stack: new Error().stack
                      });
                      setCurrentView('outline');
                    }}
                  >
                    <BookOpenIcon className="w-5 h-5" />
                    <span>Outline</span>
                  </button>
                  <button 
                    id="chat-view-button"
                    className={`flex items-center gap-2 px-6 py-3 ${currentView === 'chat' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50'} rounded-lg hover:bg-gray-100`}
                    onClick={() => {
                      console.log('[TranscriptPage] About to set currentView', {
                        oldView: currentView,
                        newView: 'chat',
                        stack: new Error().stack
                      });
                      setCurrentView('chat');
                    }}
                  >
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    <span>Chat</span>
                  </button>
                  <button 
                    id="quiz-view-button"
                    className={`flex items-center gap-2 px-6 py-3 ${currentView === 'quiz' ? 'bg-blue-100 text-blue-700' : 'bg-gray-50'} rounded-lg hover:bg-gray-100`}
                    onClick={() => {
                      console.log('[TranscriptPage] About to set currentView', {
                        oldView: currentView,
                        newView: 'quiz',
                        stack: new Error().stack
                      });
                      setCurrentView('quiz');
                    }}
                  >
                    <QuestionMarkCircleIcon className="w-5 h-5" />
                    <span>Quiz</span>
                  </button>
                </div>

              </div>
            </div>
            
            <div id="content-view-container" className="p-4 lg:p-6 h-[calc(100vh-200px)] overflow-y-auto">
              {currentView === 'transcript' ? (
                <TranscriptContent
                  ref={transcriptContentRef}
                  segmentElementsRef={segmentElementsRef}
                  playerRef={playerRef}
                  videoId={videoId || ''}
                />
              ) : currentView === 'outline' ? (
                console.log('[TranscriptPage] Rendering OutlineView', {
                  currentView,
                  transcriptLength: transcript.length
                }) || 
                <OutlineView
                  transcript={transcript}
                  playerRef={playerRef}
                />
              ) : currentView === 'chat' ? (
                <ChatView
                  playerRef={playerRef}
                  videoId={videoId || ''}
                />
              ) : (
                <QuizView transcript={transcript} />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden z-10">
        <div className="flex justify-around py-4 px-2">
          <button 
            onClick={() => setCurrentView('transcript')}
            className={`p-3 rounded-lg ${currentView === 'transcript' ? 'text-blue-700' : 'text-gray-600'}`}
          >
            <DocumentTextIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setCurrentView('outline')}
            className={`p-3 rounded-lg ${currentView === 'outline' ? 'text-blue-700' : 'text-gray-600'}`}
          >
            <BookOpenIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setCurrentView('chat')}
            className={`p-3 rounded-lg ${currentView === 'chat' ? 'text-blue-700' : 'text-gray-600'}`}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setCurrentView('quiz')}
            className={`p-3 rounded-lg ${currentView === 'quiz' ? 'text-blue-700' : 'text-gray-600'}`}
          >
            <QuestionMarkCircleIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
