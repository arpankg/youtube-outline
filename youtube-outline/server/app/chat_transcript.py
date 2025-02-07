from .rag.vector_db import VectorDB
from langchain_openai import ChatOpenAI
import logging
import os
import asyncio  # Needed to run synchronous calls in an async function

logger = logging.getLogger(__name__)

async def generate_chat_response(message, video_id, chat_history=None):
    """
    Generate a response to the user's message using the video transcript as context.
    
    Args:
        message: User's current message (the question)
        video_id: YouTube video ID to search within
        chat_history: Optional list of previous chat messages (each dict with 'role' and 'content')
                      If not provided, defaults to an empty list.
    """
    if chat_history is None:
        chat_history = []

    # Get relevant transcript context
    vector_db = VectorDB()
    context_segments = await vector_db.search_transcript(
        query=message,
        video_id=video_id,
        top_k=5
    )


    # Format the transcript segments into a single string
    formatted_segments = [segment['text'] for segment in context_segments]
        
    context_text = "\n".join(formatted_segments)

    # TODO 2: Format the conversation history.
    # - Build a string representing the conversation flow.
    history_text = ""
    for msg_item in chat_history:
        role = msg_item.get("role", "user").capitalize()  # e.g., "User" or "Assistant"
        content = msg_item.get("content", "")
        history_text += f"{role}: {content}\n"

    # TODO 3: Construct the prompt for GPT-4.
    # - Include the transcript context, the conversation history, and the current message.
    prompt = f"""
You are an AI assistant that answers questions based solely on the provided YouTube transcript context and the conversation history.
Transcript context:
{context_text}

Conversation history:
{history_text}

Current question: {message}

Answer based only on the above context. If there is insufficient information, please indicate that.
    """.strip()

    logger.info(f"Constructed prompt for GPT-4: {prompt}")

    # TODO 4: Call GPT-4 using the ChatOpenAI API.
    # - Instantiate the LLM with the appropriate model and settings.
    # - Because our function is async and the LLM call is blocking, we run it in a thread.
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.7,
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )
    response = await asyncio.to_thread(llm.invoke, prompt)

    # Extract the answer text from the response.
    # LangChain AIMessage objects store their content in the 'content' attribute
    answer = response.content.strip()
    logger.info(f"Generated answer: {answer}")

    # Return the generated answer
    return {"answer": answer}
