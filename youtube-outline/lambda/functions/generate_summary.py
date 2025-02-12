import json
import logging
from shared.models import OutlineResponse, OutlinePoint
from langchain_openai import ChatOpenAI
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CHAPTER_GENERATION_PROMPT = """I have a transcript of a YouTube video provided by the YouTube API. Each transcript entry includes a start time, a duration, and the text spoken. Your task is to analyze this transcript and generate a list of chapters that cover all the important topics discussed in the video. Please follow these guidelines:

1. **Even Spacing:**
    Ensure that the chapters cover an approximately even time range. It's okay if some chapters are a little longer than others but try to keep them similar.

2. **Identify Natural Breaks:**  
   Analyze the transcript to pinpoint natural breakpoints—moments where the speaker transitions to a new subject or introduces a distinct topic. Use these points as the beginnings of new chapters.

3. **Cover All Major Topics:**  
   Ensure that every significant topic or section discussed in the video is represented by its own chapter. Avoid including chapters for minor pauses or insignificant changes in the discussion.

3. **Chapter Titles:**  
   For each chapter, create a concise and descriptive title that clearly reflects the subject or theme of that segment. The title should be intuitive and informative for viewers.

4. **Timestamps:**  
   Use the start times from the transcript entries to determine when each chapter begins. These timestamps will mark the exact moment in the video where the topic change occurs.

Using these instructions, please analyze the provided transcript and generate the chapter list for the video. 

{text_content}
"""

def handler(event, context):
    try:
        # Parse request
        body = json.loads(event['body'])
        transcript = body.get('transcript', [])
        
        if not transcript:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Transcript is required'})
            }
            
        # Initialize LLM
        llm = ChatOpenAI(
            model="gpt-4-turbo-preview",
            temperature=0
        )
        
        # Combine transcript text
        text_content = " ".join([entry["text"] for entry in transcript])
        
        # Generate summary using LLM
        prompt = CHAPTER_GENERATION_PROMPT.format(text_content=text_content)
        response = llm.invoke(prompt)
        
        # Parse response into chapters
        chapters = []
        current_time = 0
        
        # Simple parsing - assumes each line is a chapter
        for line in response.content.split('\n'):
            if line.strip():
                chapters.append(OutlinePoint(
                    text=line.strip(),
                    start=current_time
                ))
                current_time += len(transcript) / len(chapters)  # Simple time distribution
                
        return {
            'statusCode': 200,
            'body': json.dumps(OutlineResponse(points=chapters).dict()),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
