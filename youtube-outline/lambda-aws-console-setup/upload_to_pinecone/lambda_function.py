import os
import json
from typing import List, Dict, Union
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from pinecone import Pinecone

def process_transcript(transcript: List[Dict[str, Union[str, float]]], video_id: str):
    """
    Process transcript by combining segments, splitting into chunks, and generating embeddings
    """
    # Combine all transcript segments into one text
    full_text = " ".join([segment['text'] for segment in transcript])
    
    # Split text into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_text(full_text)
    
    # Generate embeddings
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Prepare chunks with metadata
    documents = []
    for i, chunk in enumerate(chunks):
        embedding = embeddings.embed_query(chunk)
        documents.append({
            'id': f"{video_id}_{i}",
            'values': embedding,
            'metadata': {
                'text': chunk,
                'video_id': video_id,
                'chunk_index': i
            }
        })
    
    return documents

def upload_to_pinecone(chunks: List[Dict], video_id: str):
    """
    Upload processed chunks to Pinecone
    """
    # Initialize Pinecone
    pc = Pinecone(api_key=os.environ['PINECONE_API_KEY'])
    index = pc.Index("youtube-transcripts")
    
    # Upload vectors in batches
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        index.upsert(vectors=batch)
    
    return len(chunks)

def lambda_handler(event, context):
    """
    AWS Lambda handler function
    """
    try:
        # Extract data directly from event
        transcript = event.get('transcript', [])
        video_id = event.get('video_id')
        
        print(f"Received request with video_id: {video_id}")
        print(f"Transcript length: {len(transcript)} segments")
        
        if not transcript or not video_id:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required parameters: transcript and video_id'
                })
            }
        
        # Check if video already exists in Pinecone
        print(f"Checking if video {video_id} exists in Pinecone...")
        pc = Pinecone(api_key=os.environ['PINECONE_API_KEY'])
        index = pc.Index("youtube-transcripts")
        
        # Query for any vectors with this video_id
        print(f"Querying Pinecone with filter: {{'video_id': {video_id}}}")
        query_response = index.query(
            vector=[0] * 1536,  # Dummy vector for metadata-only query
            filter={"video_id": video_id},
            top_k=1
        )
        
        print(f"Query response matches: {query_response.matches}")
        
        if query_response.matches:
            print(f"Found existing vectors for video {video_id}, returning early")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Video transcript already exists in database',
                    'video_id': video_id
                })
            }
        
        print(f"No existing vectors found for video {video_id}, proceeding with processing")
        
        # Process transcript and generate embeddings
        processed_chunks = process_transcript(transcript, video_id)
        
        # Upload to Pinecone
        chunks_uploaded = upload_to_pinecone(processed_chunks, video_id)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Successfully uploaded transcript',
                'video_id': video_id,
                'chunks_uploaded': chunks_uploaded
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }