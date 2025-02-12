export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface OutlineSegment {
  text: string;
  start: number;
  duration: number;
  bullet_points: string[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];  // Tuple of exactly 4 options
  correctAnswer: number;
}
