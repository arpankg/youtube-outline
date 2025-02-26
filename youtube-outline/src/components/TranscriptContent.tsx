import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { formatTime } from '../utils/utils';
import { useViews } from '../contexts/ViewsContext';

export interface TranscriptContentHandle {
  startHighlightInterval: () => void;
  stopHighlightInterval: () => void;
  jumpToTime: (time: number) => void;
}

interface TranscriptContentProps {
  segmentElementsRef: React.MutableRefObject<(HTMLElement | null)[]>;
  playerRef: React.MutableRefObject<any>;
  videoId?: string;
}

const TranscriptContent = forwardRef(function TranscriptContent(
  { segmentElementsRef, playerRef, videoId }: TranscriptContentProps,
  ref: React.ForwardedRef<TranscriptContentHandle>
) {
  console.log('Component rendering');  // Log when component renders
  const autoScrollEnabledRef = useRef(true);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const container = document.getElementById('content-view-container');
    if (!container) {
      console.log('Container not found!');
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting && autoScrollEnabledRef.current) {
          console.log('🚫 DISABLING AUTO-SCROLL: HIGHLIGHTED SEGMENT SCROLLED OUT OF VIEW 🚫');
          autoScrollEnabledRef.current = false;
        }
      },
      {
        root: container,
        threshold: 0.5 // Trigger when 50% of the element is visible
      }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const { transcript } = useViews();
  const activeSegmentRef = useRef<number>(-1);
  const intervalRef = useRef<number | null>(null);


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
    console.log('Starting highlight interval');
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const currentTime = playerRef.current.getCurrentTime();
        if (activeSegmentRef.current === -1) {
          activeSegmentRef.current = findInitialSegment(currentTime);
          
          if (activeSegmentRef.current !== -1) {
            segmentElementsRef.current[activeSegmentRef.current]?.classList.add('text-red-500');
          }
        } else {
          const currentSegmentStart = transcript[activeSegmentRef.current].start;
          
          if (Math.abs(currentTime - currentSegmentStart) > 2) {
            segmentElementsRef.current[activeSegmentRef.current]?.classList.remove('text-red-500');
            
            activeSegmentRef.current = findInitialSegment(currentTime);
            
            if (activeSegmentRef.current !== -1) {
              const element = segmentElementsRef.current[activeSegmentRef.current];
              element?.classList.add('text-red-500');
              if (autoScrollEnabledRef.current) {
                element?.scrollIntoView({ behavior: 'auto', block: 'center' });
                // Update observer to watch new highlighted element
                observerRef.current?.disconnect();
                observerRef.current?.observe(element);
              }
            }
          } else if (activeSegmentRef.current < transcript.length - 1 && 
              transcript[activeSegmentRef.current + 1].start <= currentTime) {
            segmentElementsRef.current[activeSegmentRef.current]?.classList.remove('text-red-500');
            
            activeSegmentRef.current++;
            const element = segmentElementsRef.current[activeSegmentRef.current];
            element?.classList.add('text-red-500');
            if (autoScrollEnabledRef.current) {
              element?.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
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

  const jumpToTime = (time: number) => {
    // Remove highlight from current segment if it exists
    if (activeSegmentRef.current !== -1) {
      segmentElementsRef.current[activeSegmentRef.current]?.classList.remove('text-red-500');
    }

    // Find new segment
    const newSegmentIndex = findInitialSegment(time);
    activeSegmentRef.current = newSegmentIndex;

    if (newSegmentIndex !== -1) {
      // Add highlight to new segment
      const element = segmentElementsRef.current[newSegmentIndex];
      element?.classList.add('text-red-500');

      // Re-enable auto-scroll
      autoScrollEnabledRef.current = true;

      // Scroll to new segment
      element?.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  };

  useImperativeHandle(ref, () => ({
    startHighlightInterval,
    stopHighlightInterval,
    jumpToTime
  }));

  // Check initial player state when component mounts or transcript changes
  useEffect(() => {
    if (playerRef.current && transcript.length > 0) {
      try {
        // Get current player state and time
        const playerState = playerRef.current.getPlayerState();
        const currentTime = playerRef.current.getCurrentTime();
        const initialSegment = findInitialSegment(currentTime);

        // Scroll to current segment if found
        if (initialSegment !== -1) {
          console.log('Scrolling to current segment:', initialSegment);
          segmentElementsRef.current[initialSegment]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }

        // Start highlight interval if playing
        if (playerState === 1) {
          console.log('Video is playing, starting highlight interval');
          startHighlightInterval();
        }
      } catch (error) {
        console.error('Error checking player state:', error);
      }
    }
  }, [transcript]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => stopHighlightInterval();
  }, []);


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
  );
});

export default TranscriptContent;
