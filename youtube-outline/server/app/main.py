from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api import TranscriptsDisabled, NoTranscriptFound
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
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
    model="deepseek/deepseek-r1:free",  # OpenRouter's identifier for GPT-4
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
    openai_api_key=os.getenv("OPEN_ROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "http://localhost:5173",  # Your local frontend URL
        "X-Title": "YouTube Outline Generator"  # Your app name
    }
)

@app.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        # Extract video ID from URL
        video_id = extract_video_id(request.url)
        print(f"Received request for video URL: {request.url} (ID: {video_id})")
        
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
            
        # Get transcript
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return {"transcript": transcript}
        
    except (TranscriptsDisabled, NoTranscriptFound) as e:
        raise HTTPException(status_code=404, detail="Transcript not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-summary")
async def generate_summary(transcript: dict):
    try:
        logger.info("Received request to generate summary")
        logger.info(f"Transcript received with {len(transcript.get('transcript', []))} entries")
        
        # Convert transcript to a format suitable for the model
        text_content = " ".join([entry["text"] for entry in transcript.get("transcript", [])])
        logger.info(f"Processed transcript length: {len(text_content)} characters")
        
        # Generate summary using the LLM
        logger.info("Sending request to OpenAI API...")
        response = llm.invoke([
            ("system", "You are an expert at analyzing and summarizing YouTube video transcripts. Provide a clear, well-structured summary."),
            ("human", f"""Please analyze this YouTube video transcript and provide:
            1. A concise summary of the main points
            2. Key topics discussed
            3. Important takeaways
            
            Transcript:
            {text_content}
            """)
        ])
        logger.info("Successfully received response from OpenAI API")
        logger.info(f"Generated summary length: {len(response.content)} characters")
        
        return {"summary": response.content}
        
    except KeyError as e:
        logger.error(f"Invalid transcript format: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid transcript format")
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
