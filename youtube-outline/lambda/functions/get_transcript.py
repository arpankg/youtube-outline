import json
from shared.models import TranscriptRequest
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api import TranscriptsDisabled, NoTranscriptFound
import re

def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r'(?:v=|/v/|youtu\.be/|/embed/)([^&?/]+)',
        r'youtube.com/shorts/([^&?/]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def handler(event, context):
    try:
        # Parse request
        body = json.loads(event['body'])
        request = TranscriptRequest(**body)
        
        # Extract video ID
        video_id = extract_video_id(request.url)
        if not video_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid YouTube URL'})
            }
            
        # Get transcript
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
        except (TranscriptsDisabled, NoTranscriptFound) as e:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Transcript not available'})
            }
            
        return {
            'statusCode': 200,
            'body': json.dumps(transcript),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
