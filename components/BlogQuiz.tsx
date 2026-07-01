'use client';

import { useState } from 'react';

interface Question {
  q: string;
  opts: string[];
  correct: number;
  explanation: string;
}

const LABELS = ['A', 'B', 'C', 'D'];

function QuestionBlock({ question, index }: { question: Question; index: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = selected === question.correct;

  const reset = () => setSelected(null);

  return (
    <div className="bq-question">
      <div className="bq-question-text">
        {index + 1}. {question.q}
      </div>
      <div className="bq-options">
        {question.opts.map((opt, idx) => {
          let cls = 'bq-option';
          if (answered) {
            if (idx === question.correct) cls += ' bq-correct';
            else if (idx === selected) cls += ' bq-wrong';
            else cls += ' bq-dim';
          }
          return (
            <button
              key={idx}
              type="button"
              className={cls}
              onClick={() => !answered && setSelected(idx)}
              disabled={answered && idx !== question.correct && idx !== selected}
            >
              <span className="bq-label">{LABELS[idx]}</span>
              <span className="bq-opt-text">{opt}</span>
              {answered && idx === question.correct && <span className="bq-icon bq-icon-correct">✓</span>}
              {answered && idx === selected && idx !== question.correct && <span className="bq-icon bq-icon-wrong">✕</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="bq-feedback">
          <div className={`bq-verdict ${isCorrect ? 'bq-verdict-correct' : 'bq-verdict-wrong'}`}>
            {isCorrect ? 'Correct' : 'Incorrect'}
          </div>
          {question.explanation && (
            <p className="bq-explanation">{question.explanation}</p>
          )}
          {!isCorrect && (
            <button type="button" className="bq-try-again" onClick={reset}>Try again</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BlogQuiz({ questions }: { questions: Question[] }) {
  if (!questions.length) return null;
  return (
    <div className="bq-section">
      <h2 className="bq-heading">Test your knowledge</h2>
      <div className="bq-list">
        {questions.map((q, i) => (
          <QuestionBlock key={i} question={q} index={i} />
        ))}
      </div>
    </div>
  );
}
