import json
import time
import math
import random
import requests
from fastapi import WebSocket
import os
import asyncio
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from langchain_openai import ChatOpenAI

ANALYSIS_MESSAGES = [
    "Analyzing: {}",
    "Searching for information on: {}",
    "Gathering data on: {}",
    "Investigating details about: {}",
    "Researching context for: {}",
    "Exploring topic: {}",
    "Examining key points about: {}",
    "Extracting insights about: {}",
    "Processing information for: {}",
    "Synthesizing information on: {}",
    "Compiling research on: {}"
]

def get_random_analysis_message(topic: str) -> str:
    template = random.choice(ANALYSIS_MESSAGES)
    return template.format(topic)
from dotenv import load_dotenv
from fastapi.responses import StreamingResponse

# Load environment variables from .env file
load_dotenv()



def retry_with_backoff(retries=10, backoff_in_seconds=1):
    def decorator(func):
        def wrapper(*args, **kwargs):
            x = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code != 429 or x == retries:
                        raise
                    sleep_time = (backoff_in_seconds * 2 ** x) + random.uniform(0, 1)
                    print(f"Rate limited. Retrying in {sleep_time:.2f} seconds...")
                    time.sleep(sleep_time)
                    x += 1
        return wrapper
    return decorator

# Get OpenAI API key from environment
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

TRANSCRIPT_LAMBDA_URL = 'https://qczitkftpjbnvyrydrtpujruu40mxarz.lambda-url.us-east-1.on.aws'

class StatusDetails(BaseModel):
    stage: str
    message: str
    details: Dict[str, Any]

def create_status_message(stage: str, message: str, details: Dict[str, Any] = None) -> Dict:
    return {
        "type": "status",
        "data": StatusDetails(
            stage=stage,
            message=message,
            details=details or {}
        ).dict()
    }

class ShowNoteItem(BaseModel):
    name: str  # The entity name
    search_query: str  # Google search query to find more info
    context: str  # Context where the entity was mentioned
    timestamp: str  # Timestamp from the transcript where this is discussed
    url: Optional[str] = None  # URL to additional information about this item

class UrlSelection(BaseModel):
    selected_url: str

class ShowNoteList(BaseModel):
    items: List[ShowNoteItem]

# Define the prompt template for NER analysis
DEEP_RESEARCH_PROMPT = """This is a portion of a YouTube video transcript. You need to help me create detailed show notes from this transcript. The show notes should list all the important books, papers, articles, people, organizations, software/tools, events, etc. 

Rules for extraction:
1. Only include entities that are relevant to the key topics or arguments
2. Skip common/obvious entities (like 'United States', 'Google', etc.) unless they're specifically important to the point being made
3. For people, include BOTH first and last names
4. The transcript will have spelling mistakes, so use your knowledge to correct the mistakes.


For each SIGNIFICANT entity found add them to the show notes in this format
- Name: Name as mentioned (or corrected if the transcript has an error)
- Search Query: Write a VERY DETAILED google search query that I can use to search the web and retrieve the URL for the book, the research paper, wikipedia article for the person, etc. Make sure this search query is detailed and includes context on the named entity so that the search results will be specific to that entity mentioned. If necessary, use context from the conversation as well to make this search query as accurate as possible.
- Context: Write 2 detailed sentences explaining the context of the transcript where this named entity was mentioned.
- Timestamp: Give the timestamp in HH:MM:SS format (e.g. 01:23:45) where this entity is discussed in the transcript. Use hours even for videos under an hour (e.g. use 00:05:30 not 5:30). Give the timestamp from the transcript of where this is discussed

Here's the transcript segment:
{text_content}"""

@retry_with_backoff(retries=10, backoff_in_seconds=1)
def search_google(query: str) -> List[str]:
    """Return top 10 URLs from Google search"""
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        'key': os.getenv('GOOGLE_SEARCH_API_KEY'),
        'cx': os.getenv('GOOGLE_SEARCH_CX'),
        'q': query,
        'num': 10,  # Get top 10 results
        'fields': 'items(link)'  # Only get the URLs
    }
    
    response = requests.get(url, params=params)
    try:
        response.raise_for_status()
        data = response.json()
        items = data.get('items', [])
        return [item['link'] for item in items] if items else []
    except Exception as e:
        if isinstance(e, requests.exceptions.HTTPError) and e.response.status_code == 429:
            raise  # Let the retry decorator handle 429s
        print(f"Search error for query '{query}': {str(e)}")
        return []

async def select_best_url(urls: List[str], query: str, context: str, name: str, llm: ChatOpenAI) -> str:
    """Select best URL using gpt-4o-mini with structured output"""
    if not urls:
        return None
        
    prompt = f""" You are given a list of URLs from a google search API call where we searched for the search query. I need you to look at the entity name, the context and the search query and pick the most relevant URL that matches the context and the search query.

    Entity Name: {name}
    Context: {context}
    Search Query Used: {query}

    URLs:
    {chr(10).join(f'- {url}' for url in urls)}

    Select the single most relevant URL from the list above."""

    chain = llm.with_structured_output(UrlSelection)
    try:
        result = await chain.ainvoke(prompt)
        return result.selected_url
    except Exception as e:
        print(f"URL selection error: {str(e)}")
        return urls[0]  # Fallback to first URL if selection fails

def calculate_target_segments(total_duration: float) -> int:
    """Calculate number of segments based on video duration using a square root scale."""
    minutes = total_duration / 60
    return min(30, max(5, math.floor(math.sqrt(minutes) * 2)))

async def split_transcript(transcript_entries: List[dict], target_segments: int = 5, websocket: WebSocket = None) -> List[List[dict]]:
    """Split transcript into roughly equal time segments."""
    if websocket:
        await websocket.send_json(create_status_message(
            stage="splitting_transcript",
            message="Splitting transcript into segments...",
            details={"target_segments": target_segments}
        ))
    
    if not transcript_entries:
        if websocket:
            await websocket.send_json(create_status_message(
                stage="segments_created",
                message="No transcript entries to split",
                details={"segment_count": 0}
            ))
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
    
    if websocket:
        await websocket.send_json(create_status_message(
            stage="segments_created",
            message=f"Split transcript into {len(segments)} segments",
            details={
                "segment_count": len(segments),
                "segments": [
                    {
                        "start_time": segment[0]["start"],
                        "end_time": segment[-1]["start"],
                        "word_count": sum(len(entry["text"].split()) for entry in segment)
                    }
                    for segment in segments
                ]
            }
        ))
    return segments

async def process_segment(segment: List[dict], i: int, segments: List[List[dict]], llm: ChatOpenAI, websocket: WebSocket) -> List[ShowNoteItem]:
    """Process a single transcript segment for deep research with NER analysis."""
    await websocket.send_json(create_status_message(
        stage="segment_start",
        message=f"Processing segment {i+1}/{len(segments)}",
        details={
            "segment": i+1,
            "total_segments": len(segments),
            "start_time": segment[0]["start"],
            "end_time": segment[-1]["start"]
        }
    ))
    
    # Convert segment to text
    segment_text = " ".join([f"[{entry['start']}s] {entry['text']}" for entry in segment])
    
    # Get insights for this segment
    chain = llm.with_structured_output(ShowNoteList)
    
    # Get OpenAI analysis
    await websocket.send_json(create_status_message(
        stage="gpt_analysis",
        message=f"Analyzing segment {i+1} content...",
        details={"segment": i+1}
    ))
    
    try:
        result = await chain.ainvoke(DEEP_RESEARCH_PROMPT.format(text_content=segment_text))
        
        await websocket.send_json(create_status_message(
            stage="topics_found",
            message=f"Found {len(result.items)} topics in segment {i+1}",
            details={
                "segment": i+1,
                "topics": [note.name for note in result.items]
            }
        ))
    except Exception as e:
        print(f"[DEBUG] LLM error: {str(e)}")
        print(f"[DEBUG] Error type: {type(e)}")
        raise
    
    # Print NER results
    print(f"\n[Segment {i+1}] Show Notes:")
    print("=" * 50)
    try:
        processed_notes = []
        for note in result.items:
            # Search and add URL first
            await websocket.send_json(create_status_message(
                stage="url_search",
                message=get_random_analysis_message(note.name),
                details={
                    "topic": note.name,
                    "segment": i+1
                }
            ))
            
            urls = search_google(note.search_query)
            selected_url = None
            if urls:
                selected_url = await select_best_url(
                    urls=urls,
                    query=note.search_query,
                    context=note.context,
                    name=note.name,
                    llm=llm
                )

            # Create new ShowNoteItem with all data including URL
            processed_note = ShowNoteItem(
                name=note.name,
                search_query=note.search_query,
                context=note.context,
                timestamp=note.timestamp,
                url=selected_url
            )
            processed_notes.append(processed_note)

            # Print all information together
            formatted_note = f"""Name: {processed_note.name}
Search Query: {processed_note.search_query}
Context: {processed_note.context}
Timestamp: {processed_note.timestamp}
URL: {processed_note.url if processed_note.url else 'No URL found'}
{'-' * 30}"""
            print(formatted_note)
    except Exception as e:
        print(f"[DEBUG] Error accessing show_notes: {str(e)}")
        raise
    
    return processed_notes

async def get_transcript(url: str, websocket: WebSocket):
    """Get transcript from the transcript lambda function with retries."""
    retry_count = 0
    max_retries = 5
    print(f"[DEBUG] Starting transcript retrieval for URL: {url}")

    while retry_count < max_retries:
        try:
            print(f"[DEBUG] Attempt {retry_count + 1}/{max_retries} to get transcript")
            
            print(f"[DEBUG] Making POST request to {TRANSCRIPT_LAMBDA_URL}")
            response = requests.post(
                TRANSCRIPT_LAMBDA_URL,
                json={"url": url},
                headers={"Content-Type": "application/json"}
            )
            print(f"[DEBUG] Response status code: {response.status_code}")
            print(f"[DEBUG] Response headers: {response.headers}")
            print(f"[DEBUG] Response content: {response.text[:500]}...")
            
            if response.status_code == 502 and retry_count < max_retries - 1:
                delay = 1000 * (2 ** retry_count) / 1000  # Convert to seconds
                print(f"[DEBUG] Got 502 error, will retry in {delay} seconds")
                await websocket.send_json({
                    'type': 'status',
                    'data': {'message': f'Retrying transcript fetch in {delay:.1f}s ({retry_count + 1}/{max_retries})'}
                })
                time.sleep(delay)
                retry_count += 1
                continue

            response.raise_for_status()
            response_json = response.json()
            print(f"[DEBUG] Successfully parsed response JSON: {str(response_json)[:500]}...")
            # Only print first 100 chars of transcript for debugging
            preview = str(response_json)[:100] + '...' if len(str(response_json)) > 100 else str(response_json)
            print(f"[DEBUG] Server sending response: {preview}")
            return response_json

        except requests.exceptions.RequestException as e:
            print(f"[DEBUG] Request exception: {type(e).__name__}: {str(e)}")
            if retry_count == max_retries - 1:
                print(f"[DEBUG] Max retries ({max_retries}) reached, raising error")
                await websocket.send_json({
                    'type': 'error',
                    'data': {'error': f"Failed to get transcript after {max_retries} attempts: {str(e)}"}
                })
                return None
            retry_count += 1
            delay = 1000 * (2 ** retry_count) / 1000
            print(f"[DEBUG] Will retry in {delay} seconds")
            time.sleep(delay)
    
    return None

async def process_deep_research(url: str, websocket: WebSocket):
    """Process YouTube video transcript with WebSocket response."""
    print(f"[DEBUG] Entering process_deep_research with URL: {url}")
    try:
        message = create_status_message(
            stage="started",
            message="Querying YouTube API",
            details={"url": url}
        )
        print(f"[DEBUG] Server sending message: {message}")
        await websocket.send_json(message)
        try:
            # Get transcript with status updates
            print(f"[DEBUG] Starting transcript retrieval in process_deep_research for URL: {url}")
            await websocket.send_json({
                "type": "status",
                "data": {
                    "stage": "transcript_request",
                    "message": "Retrieving transcript from YouTube...",
                    "details": {"url": url}
                }
            })
            # Get transcript directly
            transcript = await get_transcript(url, websocket)
            if transcript is None:
                print(f"[DEBUG] Failed to get transcript")
                return
            
            if not isinstance(transcript, dict):
                print(f"[DEBUG] Invalid transcript format")
                await websocket.send_json({
                    'type': 'error',
                    'data': {'error': 'Invalid transcript format'}
                })
                return
            
            # Extract transcript entries
            transcript_entries = transcript.get('transcript')
            if not transcript_entries:
                print(f"[DEBUG] No transcript entries found")
                await websocket.send_json({
                    'type': 'error',
                    'data': {'error': 'No transcript entries found'}
                })
                return
            print(f"[DEBUG] Got transcript with {len(transcript_entries)} entries")
            await websocket.send_json(create_status_message(
                stage="transcript_retrieved",
                message="Successfully retrieved transcript",
                details={
                    "url": url,
                    "entries": len(transcript_entries)
                }
            ))

            # Calculate number of segments
            last_entry = transcript_entries[-1]
            total_duration = last_entry['start'] + last_entry.get('duration', 0)
            target_segments = calculate_target_segments(total_duration)
            
            message = create_status_message(
                stage="segments_calculating",
                message="Calculating optimal segments",
                details={"total_duration": total_duration}
            )
            print(f"[DEBUG] Server sending message: {json.dumps(message)}")
            await websocket.send_json(message)
            
            # Split transcript into segments
            segments = await split_transcript(transcript_entries, target_segments, websocket)
            
            message = create_status_message(
                stage="analysis_starting",
                message="Starting deep research analysis",
                details={"total_segments": len(segments)}
            )
            print(f"[DEBUG] Server sending message: {json.dumps(message)}")
            await websocket.send_json(message)
            
            # Initialize OpenAI client and create tasks
            llm = ChatOpenAI(openai_api_key=OPENAI_API_KEY, model_name='gpt-4o')
            segment_tasks = [
                process_segment(segment, i, segments, llm, websocket)
                for i, segment in enumerate(segments)
            ]
            
            all_show_notes = []
            
            # Stream results as they complete
            for future in asyncio.as_completed(segment_tasks):
                segment_notes = await future
                all_show_notes.extend(segment_notes)
                
                # Stream each segment result
                result = {
                    'type': 'segment_result',
                    'data': {
                        'show_notes': [note.dict() for note in segment_notes]
                    }
                }
                print(f"[DEBUG] Server yielding segment result: {json.dumps(result)}")
                await websocket.send_json(result)
            
            # Signal completion
            message = create_status_message(
                stage="complete",
                message="Deep research complete",
                details={
                    "total_segments": len(segments),
                    "total_topics": len(all_show_notes)
                }
            )
            print(f"[DEBUG] Server yielding message: {json.dumps(message)}")
            await websocket.send_json(message)
            
            # Final complete response with all notes
            result = {
                'type': 'complete',
                'data': {
                    'show_notes': [note.dict() for note in all_show_notes]
                }
            }
            print(f"[DEBUG] Server yielding final result: {json.dumps(result)}")
            await websocket.send_json(result)
            
        except Exception as e:
            message = create_status_message(
                stage="error",
                message="An error occurred",
                details={
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            )
            print(f"[DEBUG] Server yielding error message: {json.dumps(message)}")
            await websocket.send_json(message)

    except Exception as e:
        error_message = create_status_message(
            stage="error",
            message="An error occurred",
            details={
                "error": str(e),
                "error_type": type(e).__name__
            }
        )
        await websocket.send_json(error_message)