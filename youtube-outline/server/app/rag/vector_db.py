from typing import Dict, List, Optional, Union
from pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings
import os
import uuid
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore
import logging

logger = logging.getLogger(__name__)

class VectorDB:
    def __init__(self):
        load_dotenv()
        self.pc = Pinecone(
            api_key=os.getenv('PINECONE_API_KEY')
        )
        self.index_name = "youtube-transcripts"
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        
    async def upload_transcript(self, transcript: List[Dict[str, Union[str, float]]], video_id: str) -> None:
        """
        Upload a video transcript to Pinecone vector database
        
        Args:
            transcript: List of transcript segments, each containing text, start time, and duration
            video_id: YouTube video ID for metadata
        """
        try:
            logger.info(f"Starting transcript upload for video_id: {video_id}")
            logger.info(f"Received {len(transcript)} transcript segments")
            
            # Combine all transcript segments into one text
            full_text = " ".join([segment['text'] for segment in transcript])
            logger.info(f"Combined text length: {len(full_text)} characters")
            
            # Split text into chunks
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.split_text(full_text)
            logger.info(f"Split into {len(chunks)} chunks")
            logger.debug(f"First chunk preview: {chunks[0][:100]}...")
            
            # Create metadata for each chunk
            texts_with_metadata = [{
                'text': chunk,
                'metadata': {'video_id': video_id}
            } for chunk in chunks]
            logger.info(f"Created metadata for {len(texts_with_metadata)} chunks")
            
            # Check if index exists
            existing_indexes = [index.name for index in self.pc.list_indexes()]
            if self.index_name not in existing_indexes:
                logger.error(f"Index '{self.index_name}' does not exist in Pinecone")
                raise ValueError(f"Index '{self.index_name}' does not exist in Pinecone")
            
            logger.info(f"Starting vector store creation with index: {self.index_name}")
            # Create vector store and add documents
            vector_store = PineconeVectorStore.from_texts(
                texts=[t['text'] for t in texts_with_metadata],
                embedding=self.embeddings,
                metadatas=[t['metadata'] for t in texts_with_metadata],
                index_name=self.index_name
            )
            logger.info("Successfully uploaded transcript to vector store")
            
        except Exception as e:
            logger.error(f"Error uploading transcript: {str(e)}", exc_info=True)
            raise
    
    async def search_transcript(self, query: str, video_id: str, top_k: int = 5) -> List[Dict]:
        """
        Search for similar texts in a specific video's transcript
        
        Args:
            query: Search query text
            video_id: YouTube video ID to search within
            top_k: Number of results to return
            
        Returns:
            List of dictionaries containing matching text chunks with scores and metadata
        """
        try:
            logger.info(f"Searching transcript for video_id: {video_id} with query: {query}")
            
            # Get query embedding
            query_embedding = self.embeddings.embed_query(query)
            
            # Search in Pinecone with metadata filter
            results = self.pc.Index(self.index_name).query(
                vector=query_embedding,
                filter={"video_id": video_id},
                top_k=top_k,
                include_metadata=True
            )
            
            logger.info(f"Found {len(results.matches)} matches")
            
            # Format results
            formatted_results = [
                {
                    "text": match.metadata.get("text", ""),
                    "score": match.score,
                    "metadata": {"video_id": match.metadata.get("video_id")}
                }
                for match in results.matches
            ]
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching transcript: {str(e)}", exc_info=True)
            raise
