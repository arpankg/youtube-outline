from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api import TranscriptsDisabled, NoTranscriptFound
from pydantic import BaseModel
import re

class TranscriptRequest(BaseModel):
    url: str

app = FastAPI(
    title="YouTube Outline API",
    description="API for YouTube video outline generation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your Vite.js frontend URL
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

@app.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        # Extract video ID from URL
        video_id = extract_video_id(request.url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
            
        # Get transcript
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return {"transcript": transcript}
        
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        raise HTTPException(status_code=404, detail="Transcript not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to YouTube Outline API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
