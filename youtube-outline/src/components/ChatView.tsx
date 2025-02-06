import React from 'react';

interface ChatViewProps {
  playerRef: React.MutableRefObject<any>;
}

const ChatView: React.FC<ChatViewProps> = ({
  playerRef,
}) => {
  return (
    <div id="chat-content" className="space-y-2">
      <p>Chat View</p>
    </div>
  );
};

export default ChatView;
