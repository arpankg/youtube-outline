import os
import sys
import json
from datetime import datetime
import tempfile
from urllib.parse import urlparse, parse_qs

import boto3
from deepgram import Deepgram
from dotenv import load_dotenv
from pytube import YouTube

# Load environment variables
load_dotenv()

# Initialize AWS DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
table = dynamodb.Table('youtube-transcripts')

# Initialize Deepgram
deepgram = Deepgram(os.getenv('DEEPGRAM_API_KEY'))

def get_video_id(url):
    """Extract video ID from YouTube URL."""
    query = urlparse(url).query
    return parse_qs(query)['v'][0]

def download_audio(url):
    """Download audio from YouTube video."""
    yt = YouTube(url)
    audio = yt.streams.filter(only_audio=True).first()
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_file = os.path.join(temp_dir, 'audio.mp4')
    
    # Download to temporary file
    audio.download(output_path=temp_dir, filename='audio.mp4')
    return temp_file

async def transcribe_audio(audio_file):
    """Transcribe audio file using Deepgram."""
    with open(audio_file, 'rb') as audio:
        source = {'buffer': audio, 'mimetype': 'audio/mp4'}
        response = await deepgram.transcription.prerecorded(
            source,
            {
                'smart_format': True,
                'punctuate': True,
            }
        )
        return response['results']['channels'][0]['alternatives'][0]['transcript']

def save_to_dynamodb(video_id, transcript):
    """Save transcript to DynamoDB."""
    table.put_item(
        Item={
            'videoID': video_id,
            'transcript': transcript,
            'created_at': datetime.utcnow().isoformat()
        }
    )

async def main():
    if len(sys.argv) != 2:
        print("Usage: python transcribe.py <youtube_url>")
        sys.exit(1)

    url = sys.argv[1]
    video_id = get_video_id(url)
    
    try:
        # Download audio
        print(f"Downloading audio from video {video_id}...")
        audio_file = download_audio(url)
        
        # Transcribe
        print("Transcribing audio...")
        transcript = await transcribe_audio(audio_file)
        
        # Save to DynamoDB
        print("Saving transcript to DynamoDB...")
        save_to_dynamodb(video_id, transcript)
        
        print("Done! Transcript saved successfully.")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
    finally:
        # Cleanup
        if 'audio_file' in locals():
            os.remove(audio_file)
            os.rmdir(os.path.dirname(audio_file))

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
