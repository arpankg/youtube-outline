import React, { useState } from 'react';

interface ChatMessage {
  id: string;
  text: string;
  isAI: boolean;
}

interface ChatViewProps {
  playerRef: React.MutableRefObject<any>;
}

const ChatView: React.FC<ChatViewProps> = ({
  playerRef,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputMessage, setInputMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage.trim(),
      isAI: false,
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Mock AI response
    setIsGenerating(true);
    setTimeout(() => {
      const mockResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Mock response #${messages.length + 1}`,
        isAI: true,
      };
      setMessages(prev => [...prev, mockResponse]);
      setIsGenerating(false);
    }, 500);
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
