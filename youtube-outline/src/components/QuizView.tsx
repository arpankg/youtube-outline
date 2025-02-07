import React, { useState } from 'react';
import { QuizQuestion, TranscriptSegment } from '../types/types';
import Question from './Question';

interface QuizViewProps {
  transcript: TranscriptSegment[];
}

export default function QuizView({ transcript }: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizGenerated, setQuizGenerated] = useState(false);

  const handleAnswerSelect = (questionId: number, answerId: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const calculateScore = () => {
    return questions.reduce((score, question) => {
      return score + (selectedAnswers[question.id] === question.correctAnswer ? 1 : 0);
    }, 0);
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const generateQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      setQuizGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <div className="text-lg">Generating quiz questions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <div className="text-red-600 text-lg mb-4">{error}</div>
        <button
          onClick={generateQuiz}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!quizGenerated) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <button
          onClick={generateQuiz}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Generate Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4">
        {questions.map((question) => (
          <Question
            key={question.id}
            question={question}
            selectedAnswer={selectedAnswers[question.id] ?? -1}
            onSelectAnswer={(answerId) => handleAnswerSelect(question.id, answerId)}
            showResults={showResults}
          />
        ))}
      </div>
      
      <div className="mt-6">
        {!showResults ? (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={Object.keys(selectedAnswers).length !== questions.length}
          >
            Submit
          </button>
        ) : (
          <div className="text-lg font-medium">
            Your score: {calculateScore()} out of {questions.length}
          </div>
        )}
      </div>
    </div>
  );
}
