import urlParser from 'js-video-url-parser';

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

/**
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
export function parseYouTubeUrl(url: string): YouTubeUrlInfo | null {
  try {
    // Basic input validation
    if (!url || typeof url !== 'string') {
      return null;
    }

    const parsed = urlParser.parse(url.trim());
    
    console.log('Parsed YouTube URL:', JSON.stringify(parsed, null, 2));
    
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
