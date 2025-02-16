import json
import os
import re
import boto3
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from pydantic import BaseModel

class TranscriptRequest(BaseModel):
    url: str

def extract_video_id(url: str) -> Optional[str]:
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)',
        r'youtube\.com\/shorts\/([A-Za-z0-9_-]+)'
    ]
    for pattern in patterns:
        if match := re.search(pattern, url):
            return match.group(1)
    return None

def get_cached_transcript(video_id: str) -> Optional[list]:
    try:
        s3 = boto3.client('s3')
        response = s3.get_object(Bucket='youtube-transcripts-cache-v2', Key=f"{video_id}.json")
        data = json.loads(response['Body'].read().decode('utf-8'))
        print(f"Cache hit for video ID: {video_id}")
        return data['transcript']
    except s3.exceptions.NoSuchKey:
        print(f"Cache miss for video ID: {video_id}")
        return None
    except Exception as e:
        print(f"S3 error getting transcript: {str(e)}")
        return None

def cache_transcript(video_id: str, transcript: list):
    try:
        s3 = boto3.client('s3')
        s3.put_object(
            Bucket='youtube-transcripts-cache-v2',
            Key=f"{video_id}.json",
            Body=json.dumps({'transcript': transcript}),
            ContentType='application/json'
        )
        print(f"Cached transcript for video ID: {video_id}")
    except Exception as e:
        print(f"Error caching transcript: {str(e)}")

def lambda_handler(event, context):

    try:
        # Parse request body
        body = json.loads(event['body'])
        request = TranscriptRequest(**body)
        
        # Extract video ID
        video_id = extract_video_id(request.url)
        print(f"Processing transcript request for URL: {request.url} (Video ID: {video_id})")
        
        if not video_id:
            print(f"Invalid YouTube URL received: {request.url}")
            return {
                'statusCode': 400,
                'body': json.dumps({'detail': 'Invalid YouTube URL'})
            }
        
        # Check cache first
        cached_transcript = get_cached_transcript(video_id)
        if cached_transcript:
            return {
                'statusCode': 200,
                'body': json.dumps({'transcript': cached_transcript})
            }
        
        # Setup proxy configuration
        proxy_user = os.getenv('PROXY_USER')
        proxy_pass = os.getenv('PROXY_PASS')
        
        proxy = None
        if proxy_user and proxy_pass:
            proxy = {
                'http': f'http://{proxy_user}:{proxy_pass}@gate.smartproxy.com:10000',
                'https': f'https://{proxy_user}:{proxy_pass}@gate.smartproxy.com:10000'
            }
            print("Using proxy configuration")
        
        # Get transcript
        print(f"Fetching transcript for video ID: {video_id}")
        transcript = YouTubeTranscriptApi.get_transcript(
            video_id,
            languages=['en-US', 'en', 'en-GB', 'en-CA', 'en-AU', 'en-IN'],
            proxies=proxy
        )
        print(f"Successfully retrieved transcript for video ID: {video_id}")
        
        # Cache the transcript
        cache_transcript(video_id, transcript)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'transcript': transcript})
        }
        
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        print(f"Transcript not available for video ID {video_id}: {str(e)}")
        return {
            'statusCode': 404,
            'headers': headers,
            'body': json.dumps({'detail': 'Transcript not available'})
        }
    except Exception as e:
        print(f"Error processing transcript request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'detail': str(e)})
        }
