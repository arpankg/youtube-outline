import json
import time
import math
import random
import requests
import os
import asyncio
from typing import List, Dict, Any
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
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

class ShowNoteItem(BaseModel):
    name: str  # The entity name
    search_query: str  # Google search query to find more info
    context: str  # Context where the entity was mentioned
    timestamp: str  # Timestamp from the transcript where this is discussed

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
- Timestamp: Give the timestamp from the transcript of where this is discussed

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
        
    prompt = f""" You are given a list of URLs from a google search API call where we searched for the search query. I need you to look at the entity name, the context and the search query and pick the single BEST URL that matches the context and the search query.

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

def split_transcript(transcript_entries: List[dict], target_segments: int = 5) -> List[List[dict]]:
    """Split transcript into roughly equal time segments."""
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

async def process_segment(segment: List[dict], i: int, segments: List[List[dict]], llm: ChatOpenAI) -> List[ShowNoteItem]:
    """Process a single transcript segment for deep research with NER analysis."""
    print(f"\n[Segment {i+1}] Processing...")
    
    # Convert segment to text
    segment_text = " ".join([f"[{entry['start']}s] {entry['text']}" for entry in segment])
    
    # Get insights for this segment
    chain = llm.with_structured_output(ShowNoteList)
    
    # Get OpenAI analysis
    try:
        result = await chain.ainvoke(DEEP_RESEARCH_PROMPT.format(text_content=segment_text))
    except Exception as e:
        print(f"[DEBUG] LLM error: {str(e)}")
        print(f"[DEBUG] Error type: {type(e)}")
        raise
    
    # Print NER results
    print(f"\n[Segment {i+1}] Show Notes:")
    print("=" * 50)
    try:
        for note in result.items:
            # Search and add URL first
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
                if selected_url:
                    note.dict()['url'] = selected_url

            # Print all information together
            formatted_note = f"""Name: {note.name}
Search Query: {note.search_query}
Context: {note.context}
Timestamp: {note.timestamp}
URL: {selected_url if selected_url else 'No URL found'}
{'-' * 30}"""
            print(formatted_note)
    except Exception as e:
        print(f"[DEBUG] Error accessing show_notes: {str(e)}")
        raise
    
    return result.items

async def get_transcript(url: str):
    """Get transcript from the transcript lambda function with retries."""
    retry_count = 0
    max_retries = 5

    while retry_count < max_retries:
        try:
            yield {
                'statusCode': 200,
                'body': json.dumps({
                    'type': 'status',
                    'data': {'message': f'Fetching transcript (attempt {retry_count + 1}/{max_retries})'}
                })
            }
            
            response = requests.post(
                TRANSCRIPT_LAMBDA_URL,
                json={"url": url},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 502 and retry_count < max_retries - 1:
                delay = 1000 * (2 ** retry_count) / 1000  # Convert to seconds
                yield {
                    'statusCode': 200,
                    'body': json.dumps({
                        'type': 'status',
                        'data': {'message': f'Retrying transcript fetch in {delay:.1f}s ({retry_count + 1}/{max_retries})'}
                    })
                }
                time.sleep(delay)
                retry_count += 1
                continue

            response.raise_for_status()
            yield response.json()
            break

        except requests.exceptions.RequestException as e:
            if retry_count == max_retries - 1:
                raise Exception(f"Failed to get transcript after {max_retries} attempts: {str(e)}")
            retry_count += 1
            delay = 1000 * (2 ** retry_count) / 1000
            time.sleep(delay)

async def process_deep_research(url: str):
    """Process YouTube video transcript with streaming response for FastAPI."""
    async def generate():
        try:
            # Get transcript with status updates
            transcript = None
            async for status in get_transcript(url):
                if isinstance(status, dict) and 'statusCode' in status:
                    yield json.dumps(json.loads(status['body'])) + '\n'
                else:
                    transcript = status
                    break
            
            if not transcript:
                transcript = await get_transcript(url).__anext__()
                
            transcript_entries = transcript.get('transcript', [])
            
            if not transcript_entries:
                yield json.dumps({'type': 'error', 'data': {'error': 'No transcript found'}}) + '\n'
                return
            
            yield json.dumps({'type': 'status', 'data': {'message': 'Preparing transcript segments'}}) + '\n'
            
            # Calculate number of segments
            last_entry = transcript_entries[-1]
            total_duration = last_entry['start'] + last_entry.get('duration', 0)
            target_segments = calculate_target_segments(total_duration)
            
            # Split transcript into segments
            segments = split_transcript(transcript_entries, target_segments)
            
            yield json.dumps({'type': 'status', 'data': {'message': 'Starting segment analysis'}}) + '\n'
            
            # Initialize OpenAI client and create tasks
            llm = ChatOpenAI(openai_api_key=OPENAI_API_KEY, model_name='gpt-4o')
            segment_tasks = [
                process_segment(segment, i, segments, llm)
                for i, segment in enumerate(segments)
            ]
            
            all_show_notes = []
            
            # Stream results as they complete
            for future in asyncio.as_completed(segment_tasks):
                segment_notes = await future
                all_show_notes.extend(segment_notes)
                
                # Stream each segment result
                yield json.dumps({
                    'type': 'segment_result',
                    'data': {
                        'show_notes': [note.dict() for note in segment_notes]
                    }
                }) + '\n'
            
            # Final complete response
            yield json.dumps({
                'type': 'complete',
                'data': {
                    'show_notes': [note.dict() for note in all_show_notes]
                }
            }) + '\n'
            
        except Exception as e:
            yield json.dumps({
                'type': 'error',
                'data': {'error': str(e)}
            }) + '\n'

    return StreamingResponse(
        generate(),
        media_type='text/event-stream'
    )