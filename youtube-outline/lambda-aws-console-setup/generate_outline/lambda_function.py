from pydantic import BaseModel
from typing import List, Optional
from langchain_openai import ChatOpenAI
import logging
from pprint import pformat
import asyncio
import math
import json
import boto3

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

class NamedEntity(BaseModel):
    name: str    # The entity itself (e.g., "Python", "Euler's Formula", "John von Neumann")
    type: str    # The type/category (e.g., "programming_language", "theorem", "person")

class OutlinePoint(BaseModel):
    text: str
    bullet_points: List[str]

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

6. **Named Entity Recognition:**
   Identify any named entities in this segment. Examples of named entities include people, organizations, tools, mathematical concepts, books, papers, algorithms, governments, governmental agencies, medicines, etc. This is not an exhaustive list, there are many, many more types of named entities.
   
   For each entity, provide both the entity name and its type/category. Be specific with the type 
   (e.g., use "programming_language" instead of just "technology").

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
    entities: List[NamedEntity] = []

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
        bullet_points=result.bullet_points,
        entities=result.entities
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
        return None

async def get_cached_outline(video_id: str) -> Optional[FinalizedOutlineResponse]:
    """Try to get cached outline from S3"""
    try:
        s3_client = boto3.client('s3')
        logger.info(f"Checking S3 cache for video_id: {video_id}")
        
        response = s3_client.get_object(
            Bucket='youtube-outline-summaries-cache',
            Key=f'outlines/{video_id}.json'
        )
        data = json.loads(response['Body'].read())
        logger.info(f"Found cached outline for video_id: {video_id}")
        return FinalizedOutlineResponse(**data)
    except s3_client.exceptions.NoSuchKey:
        logger.info(f"No cached outline found for video_id: {video_id}")
        return None
    except Exception as e:
        logger.error(f"Error retrieving cached outline: {str(e)}")
        return None

async def cache_outline(video_id: str, outline: FinalizedOutlineResponse):
    """Cache outline in S3"""
    try:
        s3_client = boto3.client('s3')
        logger.info(f"Caching outline for video_id: {video_id}")
        
        s3_client.put_object(
            Bucket='youtube-outline-summaries-cache',
            Key=f'outlines/{video_id}.json',
            Body=json.dumps(outline.dict()),
            ContentType='application/json'
        )
        logger.info(f"Successfully cached outline for video_id: {video_id}")
    except Exception as e:
        logger.error(f"Failed to cache outline: {str(e)}")

async def _handle_async(event, context):
    try:
        # Parse the event body if it's a string
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)
            
        # Get video ID from request
        video_id = body.get('video_id')
        if not video_id:
            logger.error("No video_id provided in request")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'video_id is required'})
            }

        # Try to get cached outline
        cached_outline = await get_cached_outline(video_id)
        if cached_outline:
            return {
                'statusCode': 200,
                'body': json.dumps(cached_outline.dict())
            }

        # Generate new outline if not cached
        result = await generate_summary(body)
        if result is None:
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Failed to generate summary'})
            }
            
        # Cache the new outline
        await cache_outline(video_id, result)

        return {
            'statusCode': 200,
            'body': json.dumps(result.dict())
        }

    except Exception as e:
        logger.error(f"Error in lambda handler: {str(e)}")
        logger.exception("Full traceback:")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def lambda_handler(event, context):
    return asyncio.run(_handle_async(event, context))
