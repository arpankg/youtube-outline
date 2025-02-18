from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api import TranscriptsDisabled, NoTranscriptFound
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from typing import List, Optional, Dict
import os
from dotenv import load_dotenv
from pathlib import Path
import re
import logging
from pprint import pformat
from .rag.vector_db import VectorDB
from .chat_transcript import generate_chat_response
from .quiz_generator import generate_quiz_questions, QuizGenerationRequest
import asyncio
import boto3
from botocore.exceptions import ClientError
import time
import json

# Load environment variables from the root directory
env_path = Path(__file__).parents[2] / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize S3
s3 = boto3.client('s3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION')
)

# DynamoDB initialization (commented out)
# dynamodb = boto3.resource('dynamodb',
#     aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
#     aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
#     region_name=os.getenv('AWS_REGION')
# )
# table = dynamodb.Table('youtube-transcripts')

from .summary_generator import generate_summary, FinalizedOutlineResponse

class TranscriptRequest(BaseModel):
    url: str

class VectorDBUpload(BaseModel):
    text: str
    metadata: dict = None

# Get port from environment variable for Render deployment
port = int(os.getenv('PORT', 8000))

app = FastAPI(
    title="YouTube Outline API",
    description="API for YouTube video outline generation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://youtube-outline.vercel.app"  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def extract_video_id(url: str) -> str:
    # Handle both youtube.com and youtu.be URLs
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)',
        r'youtube\.com\/shorts\/([A-Za-z0-9_-]+)'
    ]
    for pattern in patterns:
        if match := re.search(pattern, url):
            return match.group(1)
    return None

# Initialize the LLM
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

async def get_cached_transcript(video_id: str):
    try:
        response = s3.get_object(Bucket='youtube-transcripts-cache', Key=f"{video_id}.json")
        data = json.loads(response['Body'].read().decode('utf-8'))
        logger.info(f"Cache hit for video ID: {video_id}")
        return data['transcript']
    except s3.exceptions.NoSuchKey:
        logger.info(f"Cache miss for video ID: {video_id}")
        return None
    except Exception as e:
        logger.error(f"S3 error getting transcript: {str(e)}")
        return None

# DynamoDB version (commented out)
# async def get_cached_transcript(video_id: str):
#     try:
#         response = table.get_item(Key={'video_id': video_id})
#         if 'Item' in response:
#             logger.info(f"Cache hit for video ID: {video_id}")
#             return json.loads(response['Item'].get('transcript'))
#         logger.info(f"Cache miss for video ID: {video_id}")
#         return None
#     except ClientError as e:
#         logger.error(f"DynamoDB error getting transcript: {str(e)}")
#         return None

async def cache_transcript(video_id: str, transcript: list):
    try:
        s3.put_object(
            Bucket='youtube-transcripts-cache',
            Key=f"{video_id}.json",
            Body=json.dumps({
                'transcript': transcript,
                'cached_at': int(time.time())
            })
        )
        logger.info(f"Cached transcript for video ID: {video_id}")
    except Exception as e:
        logger.error(f"S3 error caching transcript: {str(e)}")

# DynamoDB version (commented out)
# async def cache_transcript(video_id: str, transcript: list):
#     try:
#         table.put_item(Item={
#             'video_id': video_id,
#             'transcript': json.dumps(transcript),
#             'cached_at': int(time.time())
#         })
#         logger.info(f"Cached transcript for video ID: {video_id}")
#     except ClientError as e:
#         logger.error(f"DynamoDB error caching transcript: {str(e)}")

@app.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        # Extract video ID from URL
        video_id = extract_video_id(request.url)
        logger.info(f"Processing transcript request for URL: {request.url} (Video ID: {video_id})")
        
        if not video_id:
            logger.warning(f"Invalid YouTube URL received: {request.url}")
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Check cache first
        cached_transcript = await get_cached_transcript(video_id)
        if cached_transcript:
            return {"transcript": cached_transcript}
        
        # Setup proxy configuration
        proxy_user = os.getenv('PROXY_USER')
        proxy_pass = os.getenv('PROXY_PASS')
        
        if not (proxy_user and proxy_pass):
            logger.warning("Proxy credentials not set in environment variables")
            proxy = None
        else:
            http_proxy = f"http://{proxy_user}:{proxy_pass}@gate.smartproxy.com:10000"
            https_proxy = f"https://{proxy_user}:{proxy_pass}@gate.smartproxy.com:10000"
            logger.info(f"HTTP PROXY URL: {http_proxy}")
            logger.info(f"HTTPS PROXY URL: {https_proxy}")
            
        # Get transcript with proxy
        logger.info(f"Fetching transcript for video ID: {video_id}")
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en-US', 'en', 'en-GB', 'en-CA', 'en-AU', 'en-IN'], proxies={"http": http_proxy, "https": https_proxy} if proxy_user else None)
        logger.info(f"Successfully retrieved transcript for video ID: {video_id}")
        
        # Cache the new transcript asynchronously
        asyncio.create_task(cache_transcript(video_id, transcript))
        
        # Upload transcript to vector db asynchronously
        # vector_db = VectorDB()
        # asyncio.create_task(vector_db.upload_transcript(transcript, video_id))  # Properly schedule the coroutine
        logger.info(f"Started async upload to vector db for video ID: {video_id}")
        
        return {"transcript": transcript}
        
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        logger.error(f"Transcript not available for video ID {video_id}: {str(e)}")
        raise HTTPException(status_code=404, detail="Transcript not available")
    except Exception as e:
        logger.error(f"Error processing transcript request for video ID {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary_endpoint(transcript: dict):
    return await generate_summary(transcript)

@app.post("/generate-quiz")
async def generate_quiz(transcript: dict):
    try:
        logger.info("Received request to generate quiz questions")
        request = QuizGenerationRequest(transcript=transcript.get("transcript", []))
        questions = await generate_quiz_questions(request)
        return {"questions": [q.dict() for q in questions]}
        
    except Exception as e:
        logger.error(f"Error generating quiz: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to YouTube Outline API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/chat")
async def chat(request: dict):
    print("Received chat request:", request)
    
    messages = request.get('messages', [])
    video_id = request.get('video_id')
    
    print("Extracted data:", {
        "messages": messages,
        "video_id": video_id
    })
    
    if not video_id:
        print("Error: Missing video_id")
        raise HTTPException(status_code=400, detail="video_id is required")
    
    try:
        # If no messages, start a new conversation
        if not messages:
            response = await generate_chat_response("Hi! I'm ready to help you understand this video.", video_id, [])
        else:
            response = await generate_chat_response(messages[-1]['text'], video_id, messages[:-1])
            
        print("Generated response:", response)
        return {"answer": response}
    except Exception as e:
        print("Error generating response:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
