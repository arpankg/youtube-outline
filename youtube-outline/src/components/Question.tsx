import React from 'react';
import { QuizQuestion } from '../types/types';

interface QuestionProps {
  question: QuizQuestion;
  selectedAnswer: number;
  onSelectAnswer: (answerId: number) => void;
  showResults: boolean;
}

export default function Question({ question, selectedAnswer, onSelectAnswer, showResults }: QuestionProps) {
  return (
    <div className="mb-6 p-4 border rounded-lg">
      <p className="mb-3 font-medium">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <div key={index} className="flex items-center">
            <input
              type="radio"
              id={`q${question.id}-option${index}`}
              name={`question-${question.id}`}
              value={index}
              checked={selectedAnswer === index}
              onChange={() => onSelectAnswer(index)}
              className="mr-2"
              disabled={showResults}
            />
            <label htmlFor={`q${question.id}-option${index}`} className={
              showResults 
                ? index === question.correctAnswer 
                  ? 'text-green-600'
                  : selectedAnswer === index 
                    ? 'text-red-600'
                    : ''
                : ''
            }>
              {option}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
