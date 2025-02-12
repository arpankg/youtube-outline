import React, { createContext, useContext, useState } from 'react';
import { OutlineSegment } from '../types/types';

interface ViewsContextType {
  outline: OutlineSegment[];
  setOutline: (outline: ViewsContextType['outline']) => void;
  messages: Array<{
    id: string;
    text: string;
    isAI: boolean;
  }>;
  setMessages: (messages: ViewsContextType['messages']) => void;
  isFetchingOutline: boolean;
  setIsFetchingOutline: (isFetching: boolean) => void;
}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined);

export function ViewsProvider({ children }: { children: React.ReactNode }) {
  const [outline, setOutlineInternal] = useState<ViewsContextType['outline']>([]);
  const [messages, setMessages] = useState<ViewsContextType['messages']>([]);
  const [isFetchingOutline, setIsFetchingOutline] = useState(false);

  console.log('[ViewsContext] Provider value', {
    outlineLength: outline.length,
    messagesLength: messages.length,
    stack: new Error().stack
  });

  const setOutline = (newOutline: ViewsContextType['outline']) => {
    console.log('[ViewsContext] setOutline called', { 
      currentLength: outline.length,
      newLength: newOutline.length 
    });
    setOutlineInternal(newOutline);
    console.log('[ViewsContext] After setting outline', {
      newOutlineLength: outline.length,
      stack: new Error().stack
    });
  };

  return (
    <ViewsContext.Provider value={{ 
      outline, 
      setOutline,
      messages,
      setMessages,
      isFetchingOutline,
      setIsFetchingOutline
    }}>
      {children}
    </ViewsContext.Provider>
  );
}

export function useViews() {
  const context = useContext(ViewsContext);
  if (context === undefined) {
    throw new Error('useViews must be used within a ViewsProvider');
  }
  console.log('[ViewsContext] Context accessed', {
    outlineLength: context.outline.length,
    stack: new Error().stack
  });
  return context;
}
