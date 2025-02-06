import React from 'react';
import { TranscriptSegment } from '../types/types';
import { formatTime } from '../utils/utils';

interface TranscriptContentProps {
  transcript: TranscriptSegment[];
  segmentElementsRef: React.MutableRefObject<(HTMLElement | null)[]>;
  playerRef: React.MutableRefObject<any>;
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
  );
};

export default TranscriptContent;
