import React, { useState } from 'react';
import { QuizQuestion } from '../types/types';
import Question from './Question';

// Dummy questions for MVP
const dummyQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: 1
  },
  {
    id: 4,
    question: "Who painted the Mona Lisa?",
    options: ["Van Gogh", "Da Vinci", "Picasso", "Rembrandt"],
    correctAnswer: 1
  },
  {
    id: 5,
    question: "What is the largest mammal?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
    correctAnswer: 1
  }
];

export default function QuizView() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswerSelect = (questionId: number, answerId: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const calculateScore = () => {
    return dummyQuestions.reduce((score, question) => {
      return score + (selectedAnswers[question.id] === question.correctAnswer ? 1 : 0);
    }, 0);
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="space-y-4">
        {dummyQuestions.map((question) => (
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
            disabled={Object.keys(selectedAnswers).length !== dummyQuestions.length}
          >
            Submit
          </button>
        ) : (
          <div className="text-lg font-medium">
            Your score: {calculateScore()} out of {dummyQuestions.length}
          </div>
        )}
      </div>
    </div>
  );
}
