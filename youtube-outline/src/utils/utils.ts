import urlParser from 'js-video-url-parser';

import { TranscriptSegment } from '../types/types';

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface YouTubeUrlInfo {
  videoId: string;
  timestamp?: number;  // in seconds
  playlistId?: string;
}

/**``````````````````````````````````````````
 * Parses various formats of YouTube URLs and extracts video information
 * @param url The YouTube URL to parse
 * @returns YouTubeUrlInfo object if successful, null if invalid URL
 * 
 * Handles the following URL formats:
 * - Standard: https://www.youtube.com/watch?v=VIDEO_ID
 * - Shortened: https://youtu.be/VIDEO_ID
 * - With timestamp: ?t=1m30s or ?t=90
 * - With playlist: &list=PLAYLIST_ID
 * - Embedded: https://www.youtube.com/embed/VIDEO_ID
 * - Mobile: https://m.youtube.com/watch?v=VIDEO_ID
 */
export const fetchTranscript = async (videoId: string): Promise<TranscriptSegment[]> => {
  if (!videoId) {
    return [];
  }

  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Try up to 5 times with exponential backoff
    let retryCount = 0;
    let response;
    let data;
    
    while (retryCount < 5) {
      console.log("sending get transcript request to backend");
      response = await fetch('https://qczitkftpjbnvyrydrtpujruu40mxarz.lambda-url.us-east-1.on.aws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: youtubeUrl,
        }),
      });
      
      if (!response.ok) {
        if (response.status === 502 && retryCount < 4) {
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`Retry ${retryCount + 1}/5 after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }
        console.error('Server error:', response.status, response.statusText);
        return [];
      }
      
      data = await response.json();
      break;
    }
    
    return data?.transcript || [];
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return [];
  }
};

export function parseYouTubeUrl(url: string): YouTubeUrlInfo | null {
  try {
    // Basic input validation
    if (!url || typeof url !== 'string') {
      return null;
    }

    const parsed = urlParser.parse(url.trim());
    
    // Test parsing a youtu.be URL with playlist
    console.log('Test URL parsing:', {
      original: urlParser.parse('https://youtu.be/lZ3bPUKo5zc?list=PLUl4u3cNGP61-9PEhRognw5vryrSEVLPr'),
      current: parsed
    });
    
    // Validate it's a YouTube URL and has a video ID
    if (!parsed || parsed.provider !== 'youtube' || !parsed.id) {
      return null;
    }

    // Create result with required videoId
    const result: YouTubeUrlInfo = {
      videoId: parsed.id
    };

    // Add timestamp if present (convert to seconds)
    if (parsed.params?.start) {
      const timestamp = parseInt(parsed.params.start);
      if (!isNaN(timestamp)) {
        result.timestamp = timestamp;
      }
    }

    // Add playlist if present
    if (parsed.list) {
      result.playlistId = parsed.list;
    }

    return result;
  } catch (error) {
    return null;
  }
}
