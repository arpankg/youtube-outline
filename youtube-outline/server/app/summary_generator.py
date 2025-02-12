from pydantic import BaseModel
from typing import List
from langchain_openai import ChatOpenAI
import logging
from pprint import pformat
from fastapi import HTTPException
import asyncio
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the prompt template for chapter generation
CHAPTER_SUMMARY_PROMPT = """I have a portion of a YouTube video transcript provided by the YouTube API. Each transcript entry includes a start time, a duration, and the text spoken. Your task is to analyze this segment and generate chapters that cover the important topics discussed in this portion. Please follow these guidelines:

1. **Even Spacing:**
    Ensure that the chapters cover an approximately even time range within this segment. It's okay if some chapters are a little longer than others but try to keep them similar.

2. **Identify Natural Breaks:**  
   Analyze the transcript to pinpoint natural breakpoints—moments where the speaker introduces a distinct topic. Use these points as the beginnings of new chapters.

3. **Cover All Major Topics:**  
   Ensure that every significant topic or section discussed in this segment is represented by its own chapter.

4. **Chapter Titles and Summaries:**  
   For each chapter:
   - Create a concise and descriptive title that clearly reflects the subject or theme
   - Provide 3-5 bullet points summarizing the key points discussed in the entire chapter <- these bullet points should not just be the first part of the chapter

5. **Timestamps:**  
   Use the start times from the transcript entries to determine when each chapter begins. These timestamps will mark the exact moment in the video where the topic change occurs.

**Additional Considerations:**

- **Granularity:**  
  Avoid over-segmentation. Only select chapters for significant shifts in content rather than for every minor pause or change in tone.

- **Consistency:**  
  Maintain a consistent style and tone across all chapter titles and bullet points. Ensure they are easy to understand and reflect the overall structure.

- **Accuracy:**  
  Double-check that the chapter titles and bullet points accurately capture the essence of the topics discussed, and that the timestamps precisely match the transcript's start times for those segments.

Using these instructions, please analyze the provided transcript segment and generate the chapter list with summaries.

Transcript segment:
{text_content}
"""

class OutlinePoint(BaseModel):
    text: str
    start: float

class OutlineResponse(BaseModel):
    points: List[OutlinePoint]

class FinalizedOutlinePoint(BaseModel):
    text: str
    start: float
    duration: float
    bullet_points: List[str]

class FinalizedOutlineResponse(BaseModel):
    points: List[FinalizedOutlinePoint]

def calculate_target_segments(total_duration: float) -> int:
    """
    Calculate number of segments based on video duration using a square root scale.
    
    Args:
        total_duration: Total duration in seconds
        
    Returns:
        Number of target segments (between 5 and 30)
    """
    minutes = total_duration / 60
    return min(100, max(5, math.floor(math.sqrt(minutes) * 2)))

def split_transcript(transcript_entries: List[dict], target_segments: int = 5) -> List[List[dict]]:
    """
    Split transcript into roughly equal time segments.
    
    Args:
        transcript_entries: List of transcript entries (each with 'start' and 'duration')
        target_segments: Number of segments to split into
        
    Returns:
        List of transcript segments
    """
    if not transcript_entries:
        return []
        
    # Calculate total duration
    last_entry = transcript_entries[-1]
    total_duration = last_entry['start'] + last_entry.get('duration', 0)
    
    # Calculate target segment duration
    segment_duration = total_duration / target_segments
    
    segments = []
    current_segment = []
    segment_start_time = 0
    
    for entry in transcript_entries:
        if entry['start'] >= segment_start_time + segment_duration:
            segments.append(current_segment)
            current_segment = []
            segment_start_time += segment_duration
        current_segment.append(entry)
    
    # Add the last segment if it has any entries
    if current_segment:
        segments.append(current_segment)
    
    return segments

async def process_segment(segment: List[dict], i: int, segments: List[List[dict]], llm: ChatOpenAI) -> FinalizedOutlinePoint:
    # Convert segment to text
    segment_text = " ".join([f"[{entry['start']}s] {entry['text']}" for entry in segment])
    
    # Get summary and bullet points for this segment
    logger.info(f"Generating summary for segment {i+1}")
    chain = llm.with_structured_output(FinalizedOutlinePoint)
    result = await chain.ainvoke(CHAPTER_SUMMARY_PROMPT.format(text_content=segment_text))
    
    # Calculate duration
    start_time = segment[0]['start']
    if i < len(segments) - 1:
        duration = segments[i+1][0]['start'] - start_time
    else:
        last_entry = segment[-1]
        duration = last_entry['start'] + last_entry.get('duration', 0) - start_time
    
    return FinalizedOutlinePoint(
        text=result.text,
        start=start_time,
        duration=duration,
        bullet_points=result.bullet_points
    )

async def generate_summary(transcript: dict):
    try:
        logger.info("Received request to generate summary")
        transcript_entries = transcript.get('transcript', [])
        logger.info(f"Transcript received with {len(transcript_entries)} entries")
        
        # Calculate total duration and target segments
        if transcript_entries:
            last_entry = transcript_entries[-1]
            total_duration = last_entry['start'] + last_entry.get('duration', 0)
            target_segments = calculate_target_segments(total_duration)
            logger.info(f"Video duration: {total_duration:.2f}s, Target segments: {target_segments}")
        else:
            target_segments = 5
        
        # Split transcript into segments
        segments = split_transcript(transcript_entries, target_segments)
        logger.info(f"Split transcript into {len(segments)} segments")
        
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        
        # Process all segments in parallel
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(process_segment(segment, i, segments, llm))
                for i, segment in enumerate(segments)
            ]
        
        # Get results in order
        finalized_points = [task.result() for task in tasks]
        
        final_response = FinalizedOutlineResponse(points=finalized_points)
        logger.info(f"Finalized response with summaries:\n{pformat(final_response.dict(), indent=2)}")
        return final_response
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))
