import { DeepResearchResponse } from '../types/deepResearch';

export const connectDeepResearch = (
  url: string,
  onMessage: (result: DeepResearchResponse) => void,
  onError: (error: string) => void,
  onComplete: () => void
): WebSocket => {
  const ws = new WebSocket('ws://localhost:8000/ws/deep-research');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({ url }));
  };
  
  ws.onmessage = (event) => {
    const result = processStreamResult(event.data);
    onMessage(result);
  };
  
  ws.onerror = () => {
    onError('WebSocket error occurred');
  };
  
  ws.onclose = () => {
    onComplete();
  };
  
  return ws;
};

export const processStreamResult = (data: string | object): DeepResearchResponse => {
  try {
    // If it's already an object, return it
    if (typeof data === 'object') {
      return data as DeepResearchResponse;
    }
    // Otherwise parse it as string
    return JSON.parse(data as string);
  } catch (e) {
    return {
      type: 'error',
      data: { error: 'Failed to parse response' }
    };
  }
};
