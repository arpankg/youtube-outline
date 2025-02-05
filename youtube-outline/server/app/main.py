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
from pprint import pformat

# Load environment variables from the root directory
env_path = Path(__file__).parents[2] / '.env'
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the prompt template for chapter generation
CHAPTER_GENERATION_PROMPT = """I have a transcript of a YouTube video provided by the YouTube API. Each transcript entry includes a start time, a duration, and the text spoken. Your task is to analyze this transcript and generate a list of chapters that cover all the important topics discussed in the video. Please follow these guidelines:

1. **Identify Natural Breaks:**  
   Analyze the transcript to pinpoint natural breakpoints—moments where the speaker transitions to a new subject or introduces a distinct topic. Use these points as the beginnings of new chapters.

2. **Cover All Major Topics:**  
   Ensure that every significant topic or section discussed in the video is represented by its own chapter. Avoid including chapters for minor pauses or insignificant changes in the discussion.

3. **Chapter Titles:**  
   For each chapter, create a concise and descriptive title that clearly reflects the subject or theme of that segment. The title should be intuitive and informative for viewers.

4. **Timestamps:**  
   Use the start times from the transcript entries to determine when each chapter begins. These timestamps will mark the exact moment in the video where the topic change occurs.

**Additional Considerations:**

- **Granularity:**  
  Avoid over-segmentation. Only select chapters for significant shifts in content rather than for every minor pause or change in tone.

- **Consistency:**  
  Maintain a consistent style and tone across all chapter titles. Ensure that they are easy to understand and reflect the overall structure of the video.

- **Accuracy:**  
  Double-check that the chapter titles accurately capture the essence of the topics discussed, and that the timestamps precisely match the transcript's start times for those segments.

Using these instructions, please analyze the provided transcript and generate the chapter list for the video. 

{text_content}

"""

class TranscriptRequest(BaseModel):
    url: str

class OutlinePoint(BaseModel):
    text: str
    start: float

class OutlineResponse(BaseModel):
    points: List[OutlinePoint]

class FinalizedOutlinePoint(BaseModel):
    text: str
    start: float
    duration: float

class FinalizedOutlineResponse(BaseModel):
    points: List[FinalizedOutlinePoint]

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
    

        # Generate summary using the LLM with structured output
        logger.info("Sending request to OpenAI API...")
        chain = llm.with_structured_output(OutlineResponse)
        result = chain.invoke(CHAPTER_GENERATION_PROMPT.format(text_content=text_content))
        
        logger.info(f"LLM Response:\n{pformat(result.dict(), indent=2)}")

        # Convert to finalized points with durations
        points = result.points
        transcript_entries = transcript.get('transcript', [])
        finalized_points = []

        for i in range(len(points)):
            point = points[i]
            duration = 0.0
            
            if i < len(points) - 1:
                # Duration is until next point
                duration = points[i + 1].start - point.start
            else:
                # For last point, duration is until end of transcript
                last_entry = transcript_entries[-1]
                duration = (last_entry['start'] + last_entry.get('duration', 0)) - point.start
            
            finalized_points.append(FinalizedOutlinePoint(
                text=point.text,
                start=point.start,
                duration=duration
            ))

        final_response = FinalizedOutlineResponse(points=finalized_points)
        logger.info(f"Finalized response with durations:\n{pformat(final_response.dict(), indent=2)}")
        return final_response
        
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
