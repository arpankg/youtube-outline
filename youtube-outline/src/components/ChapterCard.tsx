import React, { useState } from 'react';
import { OutlineSegment } from '../types/types';
import { formatTime } from '../utils/utils';

interface ChapterCardProps {
  chapter: OutlineSegment;
  onChapterClick: (timestamp: number) => void;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onChapterClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow">
      {/* Chapter Header - Clickable */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => onChapterClick(chapter.start)}
      >
        <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600">
          {chapter.text}
        </h3>
        <span className="text-sm text-gray-500">
          {formatTime(chapter.start)}
        </span>
      </div>

      {/* Bullet Points */}
      <ul className="mt-3 space-y-2">
        {chapter.bullet_points.map((point, index) => (
          <li 
            key={index}
            className="text-sm text-gray-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
          >
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChapterCard;
