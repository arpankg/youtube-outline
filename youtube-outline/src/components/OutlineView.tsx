import React, { useState, useEffect } from 'react';
import { useViews } from '../contexts/ViewsContext';
import { TranscriptSegment, OutlineSegment } from '../types/types';
import ChapterCard from './ChapterCard';

interface OutlineViewProps {
  transcript: TranscriptSegment[];
  playerRef: React.MutableRefObject<any>;
}

const OutlineView: React.FC<OutlineViewProps> = ({
  transcript,
  playerRef,
}) => {
  console.log('[OutlineView] Component mounted/updated', {
    transcriptLength: transcript.length,
  });

  const { outline, setOutline, isFetchingOutline, setIsFetchingOutline } = useViews();
  const [isLoading, setIsLoading] = useState(false);

  const fetchOutline = async () => {
    console.log('[OutlineView] Starting fetchOutline', {
      isFetchingOutline,
      isLoading,
      outlineLength: outline.length,
      transcriptLength: transcript.length
    });
    
    if (isFetchingOutline) {
      console.log('[OutlineView] Skipping fetch - already in progress');
      return;
    }

    console.log('[OutlineView] fetchOutline dependencies', {
      transcriptLength: transcript.length,
      outlineLength: outline.length,
      isLoadingState: isLoading,
      isFetchingOutline
    });
    console.log('[OutlineView] fetchOutline called');
    if (!transcript.length) {
      console.log('[OutlineView] No transcript available, skipping');
      return;
    }
    
    console.log('[OutlineView] Setting loading state', {
      newLoadingState: true,
      currentOutlineLength: outline.length
    });
    setIsFetchingOutline(true);
    setIsLoading(true);
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
      console.log('[OutlineView] Received response data:', {
        hasPoints: Boolean(data.points),
        pointsLength: data.points?.length,
        firstPoint: data.points?.[0],
        raw: data
      });
      setOutline(data.points || []);
      console.log('[OutlineView] Set outline complete');
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setIsLoading(false);
      setIsFetchingOutline(false);
    }
  };

  useEffect(() => {
    console.log('[OutlineView] Making API call', {
      timestamp: Date.now(),
      transcriptLength: transcript.length
    });
    console.log('[OutlineView] Effect triggered', {
      transcriptLength: transcript.length,
      outlineLength: outline.length,
      isLoading
    });
    if (transcript.length > 0 && !isLoading && !isFetchingOutline && outline.length === 0) {
      console.log('[OutlineView] Starting outline generation');
      fetchOutline();
    }
    return () => {
      console.log('[OutlineView] Effect cleanup running', {
        transcriptLength: transcript.length,
        outlineLength: outline.length
      });
    };
  }, []); // Empty dependency array = only run on mount

  console.log('[OutlineView] Rendering with state:', {
    isLoading,
    outlineLength: outline.length,
    firstChapter: outline[0],
    isFetchingOutline
  });

  return isLoading ? (
    <p id="outline-loading" className="text-gray-600">Generating outline...</p>
  ) : outline.length === 0 ? (
    <p id="outline-empty" className="text-gray-600">No outline available</p>
  ) : (
    <div id="outline-content" className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Video Summary</h2>
      <div className="space-y-4">
        {outline.map((chapter, index) => (
          <ChapterCard
            key={index}
            chapter={chapter}
            onChapterClick={(timestamp) => {
              if (playerRef.current) {
                playerRef.current.seekTo(timestamp);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default OutlineView;
