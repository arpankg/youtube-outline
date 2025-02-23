export interface ShowNote {
  name: string;
  search_query: string;
  context: string;
  timestamp: string;
  url?: string;
}

export interface DeepResearchResponse {
  type: 'status' | 'segment_result' | 'complete' | 'error';
  data: {
    message?: string;
    show_notes?: ShowNote[];
    error?: string;
  };
}
