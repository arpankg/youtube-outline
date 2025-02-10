import React, { createContext, useContext, useState } from 'react';

interface ViewsContextType {
  outline: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  setOutline: (outline: ViewsContextType['outline']) => void;
  messages: Array<{
    id: string;
    text: string;
    isAI: boolean;
  }>;
  setMessages: (messages: ViewsContextType['messages']) => void;
}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined);

export function ViewsProvider({ children }: { children: React.ReactNode }) {
  const [outline, setOutline] = useState<ViewsContextType['outline']>([]);
  const [messages, setMessages] = useState<ViewsContextType['messages']>([]);

  return (
    <ViewsContext.Provider value={{ 
      outline, 
      setOutline,
      messages,
      setMessages
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
  return context;
}
