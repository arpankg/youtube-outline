import React, { createContext, useContext, useState } from 'react';

interface ViewsContextType {
  outline: Array<{
    text: string;
    start: number;
    duration: number;
  }>;
  setOutline: (outline: ViewsContextType['outline']) => void;
}

const ViewsContext = createContext<ViewsContextType | undefined>(undefined);

export function ViewsProvider({ children }: { children: React.ReactNode }) {
  const [outline, setOutline] = useState<ViewsContextType['outline']>([]);

  return (
    <ViewsContext.Provider value={{ outline, setOutline }}>
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
