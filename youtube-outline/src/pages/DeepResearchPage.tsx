import { useState, useEffect, useRef } from 'react';
import { parseYouTubeUrl } from '../utils/utils';
import { connectDeepResearch, processStreamResult } from '../utils/deepResearch';
import { ShowNote } from '../types/deepResearch';
import { DocumentTextIcon, CheckCircleIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface StatusWindowProps {
  messages: string[];
  isComplete: boolean;
}

const StatusWindow: React.FC<StatusWindowProps> = ({ messages, isComplete }) => {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getRandomDelay = () => Math.floor(Math.random() * 100) + 100; // Random delay between 100-500ms

  const isNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return false;
    
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
  };

  const handleScroll = () => {
    setShouldAutoScroll(isNearBottom());
  };

  useEffect(() => {
    if (currentIndex < messages.length) {
      const currentMessage = messages[currentIndex];
      const hasMoreMessages = currentIndex + 1 < messages.length;
      
      // Only proceed if we have more messages or this is the final "Analysis complete!" message
      if (hasMoreMessages || currentMessage.includes("Analysis complete")) {
        const timer = setTimeout(() => {
          setDisplayedMessages(prev => [...prev, currentMessage]);
          setCurrentIndex(prev => prev + 1);
        }, getRandomDelay());
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, messages]);

  const renderMessage = (message: string, index: number) => {
    if (index >= displayedMessages.length + 4) return null; // Hide messages beyond next 4
    
    const isCompleted = index < displayedMessages.length;
    const isCurrent = index === displayedMessages.length;
    const isFuture = index > displayedMessages.length;

    return (
      <div key={index} className="flex items-center space-x-2">
        {isCompleted ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : isCurrent ? (
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-gray-400 ml-1.5" />
        )}
        <span className={`${isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>
          {message}
        </span>
      </div>
    );
  };

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current && displayedMessages.length > 0) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [displayedMessages, shouldAutoScroll]);

  useEffect(() => {
    if (isComplete) {
      setIsMinimized(true);
    }
  }, [isComplete]);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold">DeepSearch</h3>
        <button 
          onClick={() => setIsMinimized(!isMinimized)} 
          className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
          aria-label={isMinimized ? 'Expand' : 'Minimize'}
        >
          {isMinimized ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isMinimized ? 'h-0' : 'h-[300px]'}`}
      >
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overscroll-contain p-4 space-y-2"
        >
          {messages.map((message, index) => renderMessage(message, index))}
        </div>
      </div>
    </div>
  );
};

const timeToSeconds = (time: string): number => {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

export default function DeepResearchPage() {
  const [inputUrl, setInputUrl] = useState('');
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState<ShowNote[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);

  const handleTimestampClick = (timestamp: string) => {
    const seconds = timeToSeconds(timestamp);
    videoRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds]
      }),
      '*'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessages(['Starting deep research process...', 'Analyzing YouTube URL...']);
    setShowNotes([]);
    setIsComplete(false);

    const parsed = parseYouTubeUrl(inputUrl);
    if (!parsed) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    setVideoId(parsed.videoId);

    setIsLoading(true);

    const ws = connectDeepResearch(
      inputUrl,
      (result) => {
        switch (result.type) {
          case 'status':
            console.log('Status update:', result);
            setStatusMessages(prev => [...prev, result.data.message || '']);
            break;
          case 'segment_result':
            console.log('Segment result:', result);
            if (result.data.show_notes) {
              setShowNotes(prev => [...prev, ...result.data.show_notes]);
            }
            break;
          case 'complete':
            console.log('Complete:', result);
            if (result.data.show_notes) {
              setShowNotes(result.data.show_notes);
            }
            setStatusMessages(prev => [...prev, 'Analysis complete!']);
            setIsComplete(true);
            setIsLoading(false);
            break;
          case 'error':
            console.error('Error:', result);
            setError(result.data.error || result.data.message || 'An error occurred');
            break;
        }
      },
      (error) => {
        setError(error);
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  };

  return (
    <div className="container mx-auto px-4">
      <div className="sticky top-0 bg-white py-8 z-10">
        <div className="flex items-center gap-4">
        <h1 className="flex items-center gap-2 text-xl font-bold whitespace-nowrap">
          <DocumentTextIcon className="h-6 w-6" />
          Deep Research
        </h1>

        <form onSubmit={handleSubmit} className="flex-1">
          <div className="flex gap-4">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter YouTube URL"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 whitespace-nowrap"
            >
              {isLoading ? 'Processing...' : 'Analyze'}
            </button>
          </div>
        </form>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left side - Video */}
        {videoId && (
          <div className="w-1/2">
            <div className="sticky top-28">
              <div className="aspect-video">
                <iframe
                  ref={videoRef}
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                  className="w-full h-full rounded-lg"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          </div>
        )}

        {/* Right side - Status and Results */}
        <div className={videoId ? 'w-1/2' : 'w-full'}>
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {statusMessages.length > 0 && (
              <StatusWindow 
                key={inputUrl} 
                messages={statusMessages} 
                isComplete={isComplete} 
              />
          )}

          {showNotes.length > 0 && isComplete && (
            <div className="space-y-6">
              {[...showNotes]
                .sort((a, b) => timeToSeconds(a.timestamp) - timeToSeconds(b.timestamp))
                .map((note, index) => (
                <div key={index} className="p-6 bg-white rounded-lg shadow">
                  <h3 className="text-xl font-semibold mb-2">{note.name}</h3>
                  <p className="text-gray-600 mb-3">{note.context}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span 
                      onClick={() => handleTimestampClick(note.timestamp)}
                      className="cursor-pointer hover:text-blue-500"
                    >
                      Timestamp: {note.timestamp}
                    </span>
                    {note.url && (
                      <a
                        href={note.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Learn More
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
