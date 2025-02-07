from typing import List, Dict, Any
from pydantic import BaseModel
import logging
from langchain_openai import ChatOpenAI
import math
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correctAnswer: int

class QuizGenerationRequest(BaseModel):
    transcript: List[Dict[str, Any]]
    
    def split_transcript(self) -> List[List[Dict[str, Any]]]:
        """Split the transcript into 5 roughly equal segments."""
        if not self.transcript:
            return []
            
        total_segments = len(self.transcript)
        segment_size = math.ceil(total_segments / 5)
        
        segments = []
        for i in range(0, total_segments, segment_size):
            segment = self.transcript[i:i + segment_size]
            if segment:  # Only add non-empty segments
                segments.append(segment)
                
        return segments

async def generate_questions_for_segment(llm: ChatOpenAI, segment: List[Dict[str, Any]], start_id: int) -> List[QuizQuestion]:
    """
    Generate questions for a single transcript segment.
    
    Args:
        llm: The language model to use
        segment: List of transcript entries for this segment
        start_id: Starting ID for questions from this segment
        
    Returns:
        List[QuizQuestion]: List of generated questions for this segment
    """
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
        
        Ensure the options are clear and distinct. The correct answer index must be between 0 and 3.
        """
        
        # Get response from GPT
        response = await llm.ainvoke(prompt)
        response_content = response.content
        
        try:
            # Parse response into question object
            question_data = eval(response_content)  # Safe since we control the input format
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
    """
    Generate quiz questions based on the provided transcript.
    
    Args:
        request (QuizGenerationRequest): The request containing the transcript
        
    Returns:
        List[QuizQuestion]: A list of generated quiz questions
    """
    try:
        logger.info("Starting quiz generation")
        
        # Split transcript into segments
        segments = request.split_transcript()
        if not segments:
            logger.warning("No transcript segments to generate questions from")
            return []
            
        # Initialize ChatGPT
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7  # Some creativity for varied questions
        )
        
        # Generate questions for all segments in parallel
        segment_questions = await asyncio.gather(*[
            generate_questions_for_segment(llm, segment, i+1)
            for i, segment in enumerate(segments)
        ])
        
        # Flatten the list of questions
        all_questions = [q for questions in segment_questions for q in questions]
        
        return all_questions
        
    except Exception as e:
        logger.error(f"Error generating quiz questions: {str(e)}")
        raise
