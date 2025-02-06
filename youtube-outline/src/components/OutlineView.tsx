import React, { useEffect } from 'react';
import { TranscriptSegment, OutlineSegment } from '../types/types';
import { formatTime } from '../utils/utils';

interface OutlineViewProps {
  transcript: TranscriptSegment[];
  playerRef: React.MutableRefObject<any>;
  outline: OutlineSegment[];
  isLoadingOutline: boolean;
  onGenerateOutline: () => Promise<void>;
}

const OutlineView: React.FC<OutlineViewProps> = ({
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

export default OutlineView;
