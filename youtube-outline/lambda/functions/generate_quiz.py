import json
import logging
from shared.models import QuizGenerationRequest, QuizQuestion
from langchain_openai import ChatOpenAI
import math
import asyncio
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def generate_questions_for_segment(llm: ChatOpenAI, segment: List[Dict[str, Any]], start_id: int) -> List[QuizQuestion]:
    """Generate questions for a single transcript segment."""
    try:
        # Combine segment text
        segment_text = " ".join([entry["text"] for entry in segment])
        
        # Create prompt for GPT
        prompt = f"""Based on the following video transcript segment, generate a multiple choice question with exactly 4 options. 
        The question should test understanding of key concepts from the segment.
        
        Transcript segment:
        {segment_text}
        
        Generate the response in the following JSON format:
        {{
            "question": "Your question here?",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": 0  // Index of correct answer (0-3)
        }}
        """
        
        # Get response from GPT
        response = await llm.ainvoke(prompt)
        response_content = response.content
        
        try:
            # Parse response into question object
            question_data = eval(response_content)
            question = QuizQuestion(
                id=start_id,
                question=question_data["question"],
                options=question_data["options"],
                correctAnswer=question_data["correctAnswer"]
            )
            return [question]
            
        except Exception as e:
            logger.error(f"Error parsing question response for segment {start_id}: {str(e)}")
            return []
            
    except Exception as e:
        logger.error(f"Error generating questions for segment {start_id}: {str(e)}")
        return []

async def generate_quiz_questions(request: QuizGenerationRequest) -> List[QuizQuestion]:
    """Generate quiz questions based on the provided transcript."""
    try:
        # Initialize LLM
        llm = ChatOpenAI(
            model="gpt-4-turbo-preview",
            temperature=0
        )
        
        # Split transcript into segments
        segments = request.split_transcript()
        
        # Generate questions for each segment
        tasks = []
        for i, segment in enumerate(segments):
            task = generate_questions_for_segment(llm, segment, i)
            tasks.append(task)
            
        # Wait for all tasks to complete
        question_sets = await asyncio.gather(*tasks)
        
        # Combine all questions
        all_questions = []
        for questions in question_sets:
            all_questions.extend(questions)
            
        return all_questions
        
    except Exception as e:
        logger.error(f"Error in generate_quiz_questions: {str(e)}")
        return []

def handler(event, context):
    try:
        # Parse request
        body = json.loads(event['body'])
        request = QuizGenerationRequest(**body)
        
        # Generate quiz
        questions = asyncio.run(generate_quiz_questions(request))
        
        return {
            'statusCode': 200,
            'body': json.dumps([q.dict() for q in questions]),
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
