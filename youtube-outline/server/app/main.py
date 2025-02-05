from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api import TranscriptsDisabled, NoTranscriptFound
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from typing import List
import os
from dotenv import load_dotenv
from pathlib import Path
import re
import logging

# Load environment variables from the root directory
env_path = Path(__file__).parents[2] / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TranscriptRequest(BaseModel):
    url: str

class OutlinePoint(BaseModel):
    text: str
    start: float

class OutlineResponse(BaseModel):
    points: List[OutlinePoint]

app = FastAPI(
    title="YouTube Outline API",
    description="API for YouTube video outline generation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    model="gpt-4o",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

@app.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        # Extract video ID from URL
        video_id = extract_video_id(request.url)
        logger.info(f"Processing transcript request for URL: {request.url} (Video ID: {video_id})")
        
        if not video_id:
            logger.warning(f"Invalid YouTube URL received: {request.url}")
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
            
        # Get transcript
        logger.debug(f"Fetching transcript for video ID: {video_id}")
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        logger.info(f"Successfully retrieved transcript for video ID: {video_id}")
        return {"transcript": transcript}
        
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        logger.error(f"Transcript not available for video ID {video_id}: {str(e)}")
        raise HTTPException(status_code=404, detail="Transcript not available")
    except Exception as e:
        logger.error(f"Error processing transcript request for video ID {video_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary(transcript: dict):
    try:
        logger.info("Received request to generate summary")
        logger.info(f"Transcript received with {len(transcript.get('transcript', []))} entries")
        
        # Convert transcript to a format suitable for the model
        text_content = " ".join([f"[{entry['start']}s] {entry['text']}" for entry in transcript.get("transcript", [])])
        logger.info(f"Processed transcript length: {len(text_content)} characters")
    

        # Generate summary using the LLM
        logger.info("Sending request to OpenAI API...")
        prompt = f"""Given a YouTube video transcript with timestamps, create a concise outline of the main points.
            Each point should include the exact timestamp from the original transcript where that point begins.
            
            Format your response as a JSON array where each item has 'text' and 'start' fields.
            The 'text' field should be a string describing the point.
            The 'start' field should be a number indicating the timestamp in seconds.
            
            Example format:
            [
                {{"text": "Introduction to the topic", "start": 0.0}},
                {{"text": "First main point discussed", "start": 45.2}},
                {{"text": "Second main point with example", "start": 128.5}}
            ]
            
            Transcript with timestamps:
            {text_content}
            
            Extract main points that capture the key moments and ideas from the video (there should be at least 1 for every 5 minutes of the video but potentially more). Use the exact timestamps from the transcript.
            
            Remember to respond ONLY with the JSON array, no additional text or explanation.
            """
        logger.info(f"Prompt being sent to OpenAI:\n{prompt}")
        result = llm.invoke(
            prompt)
        
        logger.info(f"Generated {result} points")
        return {"outline": result}
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to YouTube Outline API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
