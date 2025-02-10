import React, { useState, useEffect } from 'react';
import { TranscriptSegment } from '../types/types';
import { formatTime } from '../utils/utils';

interface OutlineViewProps {
  transcript: TranscriptSegment[];
  playerRef: React.MutableRefObject<any>;
}

const OutlineView: React.FC<OutlineViewProps> = ({
  transcript,
  playerRef,
}) => {
  const [outline, setOutline] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOutline = async () => {
    if (!transcript.length) return;
    
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
      setOutline(data.points || []);
    } catch (error) {
      console.error('Error generating outline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (transcript.length > 0 && !isLoading) {
      fetchOutline();
    }
  }, []); // Empty dependency array = only run on mount

  return isLoading ? (
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

export default OutlineView;
