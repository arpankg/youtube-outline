import React, { useState } from 'react';
import { useViews } from '../contexts/ViewsContext';

interface ChatMessage {
  id: string;
  text: string;
  isAI: boolean;
}

interface ChatViewProps {
  playerRef: React.MutableRefObject<any>;
  videoId: string;
}

const ChatView: React.FC<ChatViewProps> = ({
  playerRef,
  videoId,
}) => {
  const { messages, setMessages } = useViews();
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    // Validate videoId
    if (!videoId) {
      setError('No video selected. Please select a YouTube video first.');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage.trim(),
      isAI: false,
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setError(null);
    
    // Call chat API
    setIsGenerating(true);
    try {
      // Get last 5 messages for context, including the new user message
      const recentMessages = [...messages, userMessage].slice(-5);
      
      // Log the request we're about to make
      console.log('Making chat request with:', {
        url: '/api/chat',
        messages: recentMessages,
        video_id: videoId
      });
      
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages: recentMessages,
          video_id: videoId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      // Add AI response
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        text: data.answer.answer,  // Access the nested answer field
        isAI: true
      };
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Log the request data that caused the error
      console.log('Request data:', {
        messages: messages.slice(-5),
        video_id: videoId
      });
      
      setError('Failed to get response from AI. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="chat-content" className="space-y-2 h-full flex flex-col">
      <div className="flex-grow overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <p className="text-gray-600">No messages yet. Start a conversation!</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.isAI
                    ? 'bg-gray-200 text-gray-900'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
        {isGenerating && (
          <p className="text-gray-600">Generating response...</p>
        )}
        {error && (
          <p className="text-red-500 text-center">{error}</p>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
          disabled={isGenerating}
        />
        <button
          type="submit"
          disabled={isGenerating || !inputMessage.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatView;
